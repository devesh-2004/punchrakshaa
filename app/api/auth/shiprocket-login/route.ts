import { z } from "zod";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { phoneSchema } from "@/lib/utils/validators";

const bodySchema = z.object({ phone: phoneSchema });

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-login", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { phone } = bodySchema.parse(body);
    return jsonOk({ success: true, user: { phone } });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}
