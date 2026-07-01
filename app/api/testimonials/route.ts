import * as testimonialsRepo from "@/lib/repositories/testimonial.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "testimonials", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "true";
    const testimonials = await testimonialsRepo.find(all ? {} : { isActive: true });
    return jsonOk({ testimonials });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
