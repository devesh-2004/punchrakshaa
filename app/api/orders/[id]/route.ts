import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const limited = rateLimit(req, { key: "order-get", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const id = z.string().trim().min(1).parse(ctx.params.id);
    const ownerFilter = auth.phone
      ? { $or: [{ userId: auth.userId }, { guestPhone: auth.phone }] }
      : { userId: auth.userId };
    const doc = await ordersRepo.findOne({ _id: id, ...ownerFilter });
    if (!doc) return jsonBad("Order not found", 404);
    return jsonOk({ order: doc });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const limited = rateLimit(req, { key: "order-cancel", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const id = z.string().trim().min(1).parse(ctx.params.id);
    const input = z
      .object({ action: z.literal("cancel"), reason: z.string().trim().min(2) })
      .parse(await req.json());

    const ownerFilter = auth.phone
      ? { $or: [{ userId: auth.userId }, { guestPhone: auth.phone }] }
      : { userId: auth.userId };
    const updated = await ordersRepo.updateOne(
      { _id: id, ...ownerFilter, status: { $in: ["pending", "paid", "processing"] } },
      { status: "cancelled", cancelReason: input.reason, cancelledAt: new Date() },
    );
    if (!updated) return jsonBad("Order cannot be cancelled", 400);
    return jsonOk({ order: updated });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
