import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as activityRepo from "@/lib/repositories/customerActivity.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  activityType: z.enum(activityRepo.ACTIVITY_TYPES),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "activity", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);

  try {
    const input = schema.parse(await req.json());
    await activityRepo.record({
      userId: auth.userId,
      activityType: input.activityType,
      metadata: input.metadata ?? {},
    });
    return jsonOk({ ok: true });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}
