import crypto from "crypto";
import { z } from "zod";
import * as couponsRepo from "@/lib/repositories/coupon.repository";
import * as couponUsageRepo from "@/lib/repositories/couponUsage.repository";
import * as ordersRepo from "@/lib/repositories/order.repository";
import * as paymentTxRepo from "@/lib/repositories/paymentTransaction.repository";
import * as productsRepo from "@/lib/repositories/product.repository";
import { getRazorpayClient } from "@/lib/razorpay";
import { requireAuth } from "@/lib/utils/customerAuth";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema, phoneSchema } from "@/lib/utils/validators";
import { calculatePaymentDiscount } from "@/lib/utils/discountCalc";

const createOrderSchema = z.object({
  paymentMethod: z.enum(["upi", "card", "cod"]).default("upi"),
  guestEmail: z.union([z.email(), z.literal("")]).optional().default(""),
  guestPhone: z.union([phoneSchema, z.literal("")]).optional().default(""),
  couponCode: z.string().trim().optional().default(""),
  shippingAddress: addressSchema,
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        packLabel: z.string().trim().min(1),
        qty: z.coerce.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "create-order", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const input = createOrderSchema.parse(body);

    // Re-fetch pricing server-side (never trust client)
    const productIds = input.items.map((i) => i.productId);
    const products = await productsRepo.findByIds(productIds);
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = input.items.map((it) => {
      const p = byId.get(it.productId);
      if (!p) throw new Error(`Missing product ${it.productId}`);
      const pack = (p.packOptions ?? []).find((x: { label?: string; price?: number; mrp?: number }) => x.label === it.packLabel);
      const price = pack?.price ?? p.discountedPrice ?? p.price;
      const mrp = pack?.mrp ?? p.price;
      const image = p.images?.[0]?.url ?? "/images/placeholders/product-placeholder.svg";
      return {
        productId: p._id,
        name: p.name,
        price,
        qty: it.qty,
        image,
        packLabel: it.packLabel,
        mrp,
      };
    });

    const subtotal = orderItems.reduce((sum, x) => sum + x.price * x.qty, 0);

    const paymentItems = orderItems.map((item) => {
      const p = byId.get(String(item.productId));
      return {
        price: item.price,
        quantity: item.qty,
        upiDiscountPercent: p?.upiDiscountPercent ?? 10,
        upiMaxDiscount: p?.upiMaxDiscount ?? 60,
        cardDiscountPercent: p?.cardDiscountPercent ?? 5,
        cardMaxDiscount: p?.cardMaxDiscount ?? 25,
      };
    });

    const paymentDiscount = calculatePaymentDiscount(paymentItems, input.paymentMethod);

    // Apply coupon (if any)
    let discount = paymentDiscount;
    let couponCode = "";
    let appliedCoupon: Awaited<ReturnType<typeof couponsRepo.findActiveByCode>> = null;
    let couponDiscountAmount = 0;
    if (input.couponCode) {
      const coupon = await couponsRepo.findActiveByCode(input.couponCode);
      if (coupon) {
        if (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() >= Date.now()) {
          if (!coupon.minOrderValue || subtotal >= coupon.minOrderValue) {
            if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
              couponCode = coupon.code;
              const cDiscount =
                coupon.discountType === "flat"
                  ? coupon.discountValue
                  : Math.round((subtotal * coupon.discountValue) / 100);
              couponDiscountAmount = Math.max(0, Math.min(subtotal, cDiscount));
              discount = paymentDiscount + couponDiscountAmount;
              appliedCoupon = coupon;
            }
          }
        }
      }
    }

    const total = Math.max(0, subtotal - discount);

    const razorpay = getRazorpayClient();
    const receipt = `pr_${crypto.randomBytes(8).toString("hex")}`;
    const rpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt,
    });

    const auth = requireAuth();
    const paymentMethod = input.paymentMethod === "cod" ? "COD" : "Prepaid";

    const created = await ordersRepo.create({
      ...(auth?.userId ? { userId: auth.userId } : {}),
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      items: orderItems.map(({ mrp: _mrp, ...x }) => x),
      shippingAddress: input.shippingAddress,
      subtotal,
      discount,
      couponCode,
      total,
      razorpayOrderId: rpOrder.id,
      paymentMethod,
      status: "pending",
    });

    // --- Phase 2 audit (best-effort: never block checkout on failure) ---
    try {
      await paymentTxRepo.record({
        orderId: String(created._id),
        razorpayOrderId: rpOrder.id,
        amount: total,
        currency: rpOrder.currency || "INR",
        status: "created",
        method: paymentMethod,
        notes: { receipt },
      });
    } catch (e) {
      console.error("[CreateOrder] payment_transactions record failed:", e);
    }

    if (appliedCoupon) {
      try {
        await couponUsageRepo.record({
          couponId: String(appliedCoupon._id),
          orderId: String(created._id),
          userId: auth?.userId ?? null,
          guestPhone: input.guestPhone || "",
          code: couponCode,
          discountAmount: couponDiscountAmount,
        });
        await couponsRepo.incrementUsage(String(appliedCoupon._id));
      } catch (e) {
        console.error("[CreateOrder] coupon usage record failed:", e);
      }
    }

    return jsonOk({
      orderId: String(created._id),
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[CreateOrder Error]:", err);
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error)?.message || "Server error", 500);
  }
}

