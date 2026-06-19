import crypto from "crypto";
import { z } from "zod";
import * as ordersRepo from "@/lib/repositories/order.repository";
import * as paymentTxRepo from "@/lib/repositories/paymentTransaction.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "verify-payment", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const input = schema.parse(body);

    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET;
    if (!secret) return jsonBad("Server not configured", 500);

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    if (expected !== input.razorpay_signature) {
      // Record the failed verification attempt (best-effort), then reject.
      try {
        await paymentTxRepo.record({
          razorpayOrderId: input.razorpay_order_id,
          razorpayPaymentId: input.razorpay_payment_id,
          status: "failed",
          errorReason: "Invalid signature",
        });
      } catch (e) {
        console.error("[VerifyPayment] failed-tx record failed:", e);
      }
      return jsonBad("Invalid signature", 400);
    }

    const updated = await ordersRepo.updateByRazorpayId(input.razorpay_order_id, {
      status: "paid",
      razorpayPaymentId: input.razorpay_payment_id,
      razorpaySignature: input.razorpay_signature,
    });

    if (!updated) return jsonBad("Order not found", 404);

    // Record the successful capture (best-effort: never fail a verified payment).
    try {
      await paymentTxRepo.record({
        orderId: String(updated._id),
        razorpayOrderId: input.razorpay_order_id,
        razorpayPaymentId: input.razorpay_payment_id,
        razorpaySignature: input.razorpay_signature,
        amount: typeof updated.total === "number" ? updated.total : Number(updated.total) || 0,
        currency: "INR",
        status: "captured",
        method: updated.paymentMethod || "Prepaid",
      });
    } catch (e) {
      console.error("[VerifyPayment] capture-tx record failed:", e);
    }

    return jsonOk({ ok: true, orderId: String(updated._id) });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

