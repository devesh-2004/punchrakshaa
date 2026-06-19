import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as wishlistRepo from "@/lib/repositories/wishlist.repository";
import * as activityRepo from "@/lib/repositories/customerActivity.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ productId: z.string().trim().min(1) });

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "wishlist-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const items = await wishlistRepo.getItems(auth.userId);
    return jsonOk({ items });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "wishlist-post", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const { productId } = bodySchema.parse(await req.json());
    const added = await wishlistRepo.addItem(auth.userId, productId);
    if (added) {
      activityRepo
        .record({ userId: auth.userId, activityType: "add_to_wishlist", metadata: { productId } })
        .catch(() => {});
    }
    const items = await wishlistRepo.getItems(auth.userId);
    return jsonOk({ added, items });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, { key: "wishlist-delete", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth?.userId) return jsonBad("Unauthorized", 401);
  try {
    const productId = new URL(req.url).searchParams.get("productId") ?? "";
    if (!productId) return jsonBad("productId is required", 400);
    const removed = await wishlistRepo.removeItem(auth.userId, productId);
    if (removed) {
      activityRepo
        .record({ userId: auth.userId, activityType: "remove_from_wishlist", metadata: { productId } })
        .catch(() => {});
    }
    const items = await wishlistRepo.getItems(auth.userId);
    return jsonOk({ removed, items });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
