import { NextResponse } from "next/server";

/**
 * Centralized, dependency-free rate limiter.
 *
 * Backward-compatible by design: it only ever ADDS a 429 response on abuse.
 * Normal traffic is unaffected — call `rateLimit(req, opts)` at the top of a
 * handler and return its result only when it is non-null.
 *
 * NOTE ON SCOPE: this is an in-memory, per-server-instance limiter. It is a
 * solid first line of defence against bursts/abuse from a single IP on one
 * instance. On horizontally-scaled / serverless hosting (e.g. AWS Amplify),
 * counters are NOT shared across instances. For strict global limits, back this
 * with Redis/Upstash later — the call sites below will not need to change.
 */

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "otp-send". Combined with the client IP. */
  key: string;
  /** Max allowed requests per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Best-effort client IP from standard proxy headers (CloudFront/Amplify set these). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Opportunistically drop expired buckets so the map cannot grow unbounded. */
function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) {
    if (b.resetAt <= now) store.delete(k);
  }
}

/**
 * Returns a 429 `NextResponse` if the caller has exceeded the limit, otherwise
 * `null` (meaning: proceed as normal).
 *
 * 429 body matches the project standard: { success: false, message: "Too many requests" }
 */
export function rateLimit(req: Request, opts: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  prune(now);

  const id = `${opts.key}:${getClientIp(req)}`;
  const bucket = store.get(id);

  if (!bucket || bucket.resetAt <= now) {
    store.set(id, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (bucket.count >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { success: false, message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  bucket.count += 1;
  return null;
}
