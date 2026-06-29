import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { getGlobal } from "@/lib/repositories/siteSettings.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "orders-get", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const parsed = z
      .object({ limit: z.coerce.number().int().min(1).max(50).optional() })
      .parse({ limit: searchParams.get("limit") ?? undefined });

    const query = auth.phone
      ? { $or: [{ userId: auth.userId }, { guestPhone: auth.phone }] }
      : { userId: auth.userId };
    const [docs, settings] = await Promise.all([
      ordersRepo.find(query, { sort: { createdAt: -1 }, limit: parsed.limit ?? 20 }),
      getGlobal(),
    ]);
    return jsonOk({ orders: docs, supportWhatsapp: settings.supportWhatsapp });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
