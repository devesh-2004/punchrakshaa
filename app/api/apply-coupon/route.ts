import { z } from "zod";
import * as couponsRepo from "@/lib/repositories/coupon.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "apply-coupon", limit: 20, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const parsed = z
      .object({
        code: z.string().trim().min(1),
        subtotal: z.coerce.number().min(0),
      })
      .parse(body);

    const coupon = await couponsRepo.findActiveByCode(parsed.code);
    if (!coupon) return jsonBad("Invalid coupon", 400);
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return jsonBad("Coupon expired", 400);
    if (coupon.minOrderValue && parsed.subtotal < coupon.minOrderValue) return jsonBad("Order value too low", 400);
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return jsonBad("Coupon max uses reached", 400);

    let discount = 0;
    if (coupon.discountType === "flat") discount = coupon.discountValue;
    if (coupon.discountType === "percent") discount = Math.round((parsed.subtotal * coupon.discountValue) / 100);
    discount = Math.max(0, Math.min(parsed.subtotal, discount));
    const total = Math.max(0, parsed.subtotal - discount);
    return jsonOk({ code: coupon.code, discount, total });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

