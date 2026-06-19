import { rows, one } from "@/lib/db/postgres";
import { num, date, type Lean } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type CouponUsageDoc = Lean<{
  couponId: string;
  orderId: string | null;
  userId: string | null;
  guestPhone: string;
  code: string;
  discountAmount: number;
}>;

function rowToDoc(row: Record<string, any>): CouponUsageDoc {
  return {
    _id: row.id,
    couponId: row.coupon_id,
    orderId: row.order_id ?? null,
    userId: row.user_id ?? null,
    guestPhone: row.guest_phone ?? "",
    code: row.code,
    discountAmount: num(row.discount_amount),
    createdAt: date(row.created_at),
  };
}

export type RecordUsageInput = {
  couponId: string;
  orderId?: string | null;
  userId?: string | null;
  guestPhone?: string;
  code: string;
  discountAmount?: number;
};

/**
 * Record a coupon redemption. Idempotent per (coupon_id, order_id) — re-running
 * for the same order is a no-op. Returns the row, or null if it already existed.
 */
export async function record(input: RecordUsageInput): Promise<CouponUsageDoc | null> {
  if (!isUuid(input.couponId)) return null;
  const row = await one(
    `INSERT INTO coupon_usages
       (coupon_id, order_id, user_id, guest_phone, code, discount_amount)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (coupon_id, order_id) DO NOTHING
     RETURNING *`,
    [
      input.couponId,
      isUuid(input.orderId) ? input.orderId : null,
      isUuid(input.userId) ? input.userId : null,
      input.guestPhone ?? "",
      input.code,
      num(input.discountAmount),
    ],
  );
  return row ? rowToDoc(row) : null;
}

export async function listByCoupon(couponId: string): Promise<CouponUsageDoc[]> {
  if (!isUuid(couponId)) return [];
  const r = await rows(
    `SELECT * FROM coupon_usages WHERE coupon_id = $1 ORDER BY created_at DESC`,
    [couponId],
  );
  return r.map(rowToDoc);
}

export async function countByCoupon(couponId: string): Promise<number> {
  if (!isUuid(couponId)) return 0;
  const row = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM coupon_usages WHERE coupon_id = $1`,
    [couponId],
  );
  return row?.n ?? 0;
}
