import { rows, one } from "@/lib/db/postgres";
import { num, date } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type WishlistItem = {
  _id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  discountedPrice: number;
  image: string;
  addedAt?: Date;
};

function rowToItem(row: Record<string, any>): WishlistItem {
  return {
    _id: row.item_id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    price: num(row.price),
    discountedPrice: num(row.discounted_price),
    image: row.image ?? "",
    addedAt: date(row.created_at),
  };
}

/** Get-or-create the user's single wishlist; returns its id. */
async function ensureWishlist(userId: string): Promise<string | null> {
  if (!isUuid(userId)) return null;
  const row = await one<{ id: string }>(
    `INSERT INTO wishlists (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [userId],
  );
  return row?.id ?? null;
}

/** Items in the user's wishlist (newest first), joined with active products. */
export async function getItems(userId: string): Promise<WishlistItem[]> {
  if (!isUuid(userId)) return [];
  const r = await rows(
    `SELECT wi.id AS item_id, wi.created_at, p.id AS product_id, p.slug, p.name,
            p.price, p.discounted_price,
            (p.content->'images'->0->>'url') AS image
     FROM wishlists w
     JOIN wishlist_items wi ON wi.wishlist_id = w.id
     JOIN products p ON p.id = wi.product_id AND p.deleted_at IS NULL
     WHERE w.user_id = $1
     ORDER BY wi.created_at DESC`,
    [userId],
  );
  return r.map(rowToItem);
}

export async function addItem(userId: string, productId: string): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(productId)) return false;
  const wishlistId = await ensureWishlist(userId);
  if (!wishlistId) return false;
  const row = await one(
    `INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1, $2)
     ON CONFLICT (wishlist_id, product_id) DO NOTHING
     RETURNING id`,
    [wishlistId, productId],
  );
  return !!row;
}

export async function removeItem(userId: string, productId: string): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(productId)) return false;
  const row = await one(
    `DELETE FROM wishlist_items wi
     USING wishlists w
     WHERE wi.wishlist_id = w.id AND w.user_id = $1 AND wi.product_id = $2
     RETURNING wi.id`,
    [userId, productId],
  );
  return !!row;
}
