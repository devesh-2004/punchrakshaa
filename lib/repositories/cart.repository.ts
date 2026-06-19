import { rows, one, query } from "@/lib/db/postgres";
import { num, date } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type CartItem = {
  _id: string;
  productId: string;
  variantId: string | null;
  packLabel: string;
  quantity: number;
  slug: string;
  name: string;
  price: number;
  image: string;
};

export type Cart = {
  _id: string;
  userId: string | null;
  status: string;
  lastActivityAt?: Date;
  abandonedAt?: Date | null;
  items: CartItem[];
};

function rowToItem(row: Record<string, any>): CartItem {
  // Prefer the variant price/image; fall back to the product's.
  return {
    _id: row.id,
    productId: row.product_id,
    variantId: row.variant_id ?? null,
    packLabel: row.pack_label ?? "",
    quantity: Number(row.quantity ?? 0),
    slug: row.slug,
    name: row.name,
    price: num(row.variant_price ?? row.discounted_price ?? row.product_price),
    image: row.variant_image || row.product_image || "",
  };
}

/** Get-or-create the user's single active cart; returns its id. */
export async function ensureActiveCart(userId: string): Promise<string | null> {
  if (!isUuid(userId)) return null;
  const existing = await one<{ id: string }>(
    `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );
  if (existing) return existing.id;
  const created = await one<{ id: string }>(
    `INSERT INTO carts (user_id, status) VALUES ($1, 'active')
     ON CONFLICT (user_id) WHERE status = 'active' AND user_id IS NOT NULL
     DO UPDATE SET updated_at = now()
     RETURNING id`,
    [userId],
  );
  return created?.id ?? null;
}

async function touch(cartId: string): Promise<void> {
  await query(`UPDATE carts SET last_activity_at = now(), updated_at = now() WHERE id = $1`, [cartId]);
}

/** Resolve a variant id from (product_id, pack_label) when not explicitly given. */
async function resolveVariantId(productId: string, packLabel: string, variantId?: string): Promise<string | null> {
  if (isUuid(variantId)) return variantId!;
  if (!packLabel) return null;
  const row = await one<{ id: string }>(
    `SELECT id FROM product_variants WHERE product_id = $1 AND label = $2`,
    [productId, packLabel],
  );
  return row?.id ?? null;
}

export async function getCart(userId: string): Promise<Cart | null> {
  if (!isUuid(userId)) return null;
  const cart = await one<any>(
    `SELECT * FROM carts WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );
  if (!cart) return null;
  const itemRows = await rows(
    `SELECT ci.*, p.slug, p.name, p.discounted_price, p.price AS product_price,
            (p.content->'images'->0->>'url') AS product_image,
            v.price AS variant_price, v.image AS variant_image
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id AND p.deleted_at IS NULL
     LEFT JOIN product_variants v ON v.id = ci.variant_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cart.id],
  );
  return {
    _id: cart.id,
    userId: cart.user_id,
    status: cart.status,
    lastActivityAt: date(cart.last_activity_at),
    abandonedAt: date(cart.abandoned_at) ?? null,
    items: itemRows.map(rowToItem),
  };
}

export async function addItem(
  userId: string,
  input: { productId: string; packLabel?: string; variantId?: string; quantity?: number },
): Promise<Cart | null> {
  if (!isUuid(userId) || !isUuid(input.productId)) return null;
  const cartId = await ensureActiveCart(userId);
  if (!cartId) return null;
  const packLabel = input.packLabel ?? "";
  const qty = Math.max(1, Math.trunc(Number(input.quantity ?? 1)) || 1);
  const variantId = await resolveVariantId(input.productId, packLabel, input.variantId);
  await query(
    `INSERT INTO cart_items (cart_id, product_id, variant_id, pack_label, quantity)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cart_id, product_id, pack_label)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                   variant_id = EXCLUDED.variant_id,
                   updated_at = now()`,
    [cartId, input.productId, variantId, packLabel, qty],
  );
  await touch(cartId);
  return getCart(userId);
}

/** Set an exact quantity for a line; quantity <= 0 removes it. */
export async function setItemQuantity(
  userId: string,
  input: { productId: string; packLabel?: string; quantity: number },
): Promise<Cart | null> {
  if (!isUuid(userId) || !isUuid(input.productId)) return null;
  const cartId = await ensureActiveCart(userId);
  if (!cartId) return null;
  const packLabel = input.packLabel ?? "";
  const qty = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    await query(
      `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND pack_label = $3`,
      [cartId, input.productId, packLabel],
    );
  } else {
    await query(
      `UPDATE cart_items SET quantity = $4, updated_at = now()
       WHERE cart_id = $1 AND product_id = $2 AND pack_label = $3`,
      [cartId, input.productId, packLabel, qty],
    );
  }
  await touch(cartId);
  return getCart(userId);
}

export async function removeItem(
  userId: string,
  input: { productId: string; packLabel?: string },
): Promise<Cart | null> {
  if (!isUuid(userId) || !isUuid(input.productId)) return null;
  const cartId = await ensureActiveCart(userId);
  if (!cartId) return null;
  await query(
    `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND pack_label = $3`,
    [cartId, input.productId, input.packLabel ?? ""],
  );
  await touch(cartId);
  return getCart(userId);
}

// --- Abandoned-cart recovery foundation (no email sending) ---

export type AbandonedCart = {
  _id: string;
  userId: string | null;
  itemCount: number;
  lastActivityAt?: Date;
  abandonedAt?: Date | null;
};

/** Active carts with at least one item and no activity for `hours` hours. */
export async function findAbandonedCandidates(hours: number, limit = 100): Promise<AbandonedCart[]> {
  const h = Number.isFinite(hours) && hours > 0 ? hours : 24;
  const r = await rows(
    `SELECT c.id, c.user_id, c.last_activity_at, c.abandoned_at,
            count(ci.id)::int AS item_count
     FROM carts c
     JOIN cart_items ci ON ci.cart_id = c.id
     WHERE c.status = 'active'
       AND c.last_activity_at < now() - ($1 || ' hours')::interval
     GROUP BY c.id
     ORDER BY c.last_activity_at ASC
     LIMIT $2`,
    [String(h), limit],
  );
  return r.map((row: Record<string, any>) => ({
    _id: row.id,
    userId: row.user_id,
    itemCount: Number(row.item_count ?? 0),
    lastActivityAt: date(row.last_activity_at),
    abandonedAt: date(row.abandoned_at) ?? null,
  }));
}

/** Mark a cart abandoned (foundation for a future recovery job). */
export async function markAbandoned(cartId: string): Promise<boolean> {
  if (!isUuid(cartId)) return false;
  const row = await one(
    `UPDATE carts SET status = 'abandoned', abandoned_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'active' RETURNING id`,
    [cartId],
  );
  return !!row;
}
