import { rows, one } from "@/lib/db/postgres";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type InventoryRow = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  label: string;
  sku: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  available: number;
  isLow: boolean;
};

function mapRow(row: Record<string, any>): InventoryRow {
  const quantity = Number(row.quantity ?? 0);
  const reserved = Number(row.reserved ?? 0);
  const threshold = Number(row.low_stock_threshold ?? 0);
  const available = quantity - reserved;
  return {
    variantId: row.variant_id,
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    label: row.label,
    sku: row.sku,
    quantity,
    reserved,
    lowStockThreshold: threshold,
    available,
    isLow: available <= threshold,
  };
}

const BASE_SELECT = `
  SELECT i.variant_id, i.quantity, i.reserved, i.low_stock_threshold,
         v.product_id, v.label, v.sku,
         p.slug AS product_slug, p.name AS product_name
  FROM inventory i
  JOIN product_variants v ON v.id = i.variant_id
  JOIN products p ON p.id = v.product_id
`;

/** All inventory rows, low stock first. */
export async function list(): Promise<InventoryRow[]> {
  const r = await rows(
    `${BASE_SELECT}
     ORDER BY (i.quantity - i.reserved) <= i.low_stock_threshold DESC,
              p.name ASC, v.position ASC`,
  );
  return r.map(mapRow);
}

/** Only rows at or below their low-stock threshold. */
export async function listLowStock(): Promise<InventoryRow[]> {
  const r = await rows(
    `${BASE_SELECT}
     WHERE (i.quantity - i.reserved) <= i.low_stock_threshold
     ORDER BY p.name ASC, v.position ASC`,
  );
  return r.map(mapRow);
}

export async function listByProductId(productId: string): Promise<InventoryRow[]> {
  if (!isUuid(productId)) return [];
  const r = await rows(
    `${BASE_SELECT} WHERE v.product_id = $1 ORDER BY v.position ASC`,
    [productId],
  );
  return r.map(mapRow);
}

/** Adjust stock fields for one variant. Returns the updated row or null. */
export async function adjust(
  variantId: string,
  patch: { quantity?: number; reserved?: number; lowStockThreshold?: number },
): Promise<InventoryRow | null> {
  if (!isUuid(variantId)) return null;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.quantity !== undefined) {
    params.push(Math.max(0, Math.trunc(patch.quantity)));
    sets.push(`quantity = $${params.length}`);
  }
  if (patch.reserved !== undefined) {
    params.push(Math.max(0, Math.trunc(patch.reserved)));
    sets.push(`reserved = $${params.length}`);
  }
  if (patch.lowStockThreshold !== undefined) {
    params.push(Math.max(0, Math.trunc(patch.lowStockThreshold)));
    sets.push(`low_stock_threshold = $${params.length}`);
  }
  if (!sets.length) return null;
  sets.push("updated_at = now()");
  params.push(variantId);
  // Upsert: create the inventory row if it is somehow missing.
  await one(
    `INSERT INTO inventory (variant_id) VALUES ($${params.length})
     ON CONFLICT (variant_id) DO NOTHING`,
    [variantId],
  );
  const updated = await one(
    `UPDATE inventory SET ${sets.join(", ")} WHERE variant_id = $${params.length} RETURNING variant_id`,
    params,
  );
  if (!updated) return null;
  const r = await rows(`${BASE_SELECT} WHERE i.variant_id = $1`, [variantId]);
  return r.length ? mapRow(r[0]) : null;
}
