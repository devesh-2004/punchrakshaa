import { rows } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type OrderStatusHistoryDoc = Lean<{
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string;
  changedBy: string;
}>;

function rowToDoc(row: Record<string, any>): OrderStatusHistoryDoc {
  return {
    _id: row.id,
    orderId: row.order_id,
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status,
    note: row.note ?? "",
    changedBy: row.changed_by ?? "",
    createdAt: date(row.created_at),
  };
}

/** Full transition timeline for an order, oldest first. */
export async function listByOrder(orderId: string): Promise<OrderStatusHistoryDoc[]> {
  if (!isUuid(orderId)) return [];
  const r = await rows(
    `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC, from_status NULLS FIRST`,
    [orderId],
  );
  return r.map(rowToDoc);
}
