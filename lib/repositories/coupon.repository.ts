import { one, query } from "@/lib/db/postgres";
import { num, date, type Lean } from "./_mappers";

export type CouponDoc = Lean<Record<string, any>>;

function rowToCoupon(row: Record<string, any>): CouponDoc {
  return {
    _id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: num(row.discount_value),
    minOrderValue: num(row.min_order_value),
    maxUses: Number(row.max_uses ?? 0),
    usedCount: Number(row.used_count ?? 0),
    expiresAt: date(row.expires_at),
    isActive: row.is_active,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

/** findOne({ code: code.toUpperCase(), isActive: true }) */
export async function findActiveByCode(code: string): Promise<CouponDoc | null> {
  const row = await one(
    `SELECT * FROM coupons WHERE code = $1 AND is_active = true AND deleted_at IS NULL`,
    [code.toUpperCase()],
  );
  return row ? rowToCoupon(row) : null;
}

export async function incrementUsage(id: string): Promise<void> {
  await query(`UPDATE coupons SET used_count = used_count + 1, updated_at = now() WHERE id = $1`, [id]);
}
