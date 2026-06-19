import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "logout", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const res = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  res.cookies.delete("punchraksha_token");
  return res;
}
