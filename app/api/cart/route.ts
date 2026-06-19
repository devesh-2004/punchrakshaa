import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as cartRepo from "@/lib/repositories/cart.repository";
import * as activityRepo from "@/lib/repositories/customerActivity.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  productId: z.string().trim().min(1),
  packLabel: z.string().trim().optional().default(""),
  variantId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1),
});

const patchSchema = z.object({
  productId: z.string().trim().min(1),
  packLabel: z.string().trim().optional().default(""),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "cart-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const cart = await cartRepo.getCart(auth.userId);
    return jsonOk({ cart: cart ?? { items: [] } });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "cart-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const input = addSchema.parse(await req.json());
    const cart = await cartRepo.addItem(auth.userId, input);
    activityRepo
      .record({
        userId: auth.userId,
        activityType: "add_to_cart",
        metadata: { productId: input.productId, packLabel: input.packLabel, quantity: input.quantity },
      })
      .catch(() => {});
    return jsonOk({ cart });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, { key: "cart-patch", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const input = patchSchema.parse(await req.json());
    const cart = await cartRepo.setItemQuantity(auth.userId, input);
    return jsonOk({ cart });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, { key: "cart-delete", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const sp = new URL(req.url).searchParams;
    const productId = sp.get("productId") ?? "";
    const packLabel = sp.get("packLabel") ?? "";
    if (!productId) return jsonBad("productId is required", 400);
    const cart = await cartRepo.removeItem(auth.userId, { productId, packLabel });
    activityRepo
      .record({ userId: auth.userId, activityType: "remove_from_cart", metadata: { productId, packLabel } })
      .catch(() => {});
    return jsonOk({ cart });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
