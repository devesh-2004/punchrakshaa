import { rows, one, withTransaction, query } from "@/lib/db/postgres";
import { num, date, sortClause, type Lean } from "./_mappers";

export type OrderItemDoc = {
  productId: string | null;
  name: string;
  price: number;
  qty: number;
  image: string;
  packLabel: string;
};

export type OrderDoc = Lean<Record<string, any>> & { items: OrderItemDoc[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

/** camelCase -> column for promoted order fields (used by create & update). */
const COL: Record<string, string> = {
  userId: "user_id",
  guestEmail: "guest_email",
  guestPhone: "guest_phone",
  subtotal: "subtotal",
  discount: "discount",
  total: "total",
  couponCode: "coupon_code",
  razorpayOrderId: "razorpay_order_id",
  razorpayPaymentId: "razorpay_payment_id",
  razorpaySignature: "razorpay_signature",
  shiprocketOrderId: "shiprocket_order_id",
  shiprocketShipmentId: "shiprocket_shipment_id",
  awbCode: "awb_code",
  courierName: "courier_name",
  labelUrl: "label_url",
  invoiceUrl: "invoice_url",
  trackingUrl: "tracking_url",
  status: "status",
  paymentMethod: "payment_method",
  cancelReason: "cancel_reason",
  cancelledAt: "cancelled_at",
};

function rowToItem(row: Record<string, any>): OrderItemDoc {
  return {
    productId: row.product_id,
    name: row.name,
    price: num(row.price),
    qty: Number(row.qty ?? 0),
    image: row.image,
    packLabel: row.pack_label,
  };
}

function rowToOrder(row: Record<string, any>, items: OrderItemDoc[]): OrderDoc {
  return {
    _id: row.id,
    userId: row.user_id,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    items,
    shippingAddress: row.shipping_address ?? {},
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    total: num(row.total),
    couponCode: row.coupon_code,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpaySignature: row.razorpay_signature,
    shiprocketOrderId: row.shiprocket_order_id,
    shiprocketShipmentId: row.shiprocket_shipment_id,
    awbCode: row.awb_code,
    courierName: row.courier_name,
    labelUrl: row.label_url,
    invoiceUrl: row.invoice_url,
    trackingUrl: row.tracking_url,
    status: row.status,
    paymentMethod: row.payment_method,
    cancelReason: row.cancel_reason,
    cancelledAt: date(row.cancelled_at),
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

async function attachItems(orderRows: Record<string, any>[]): Promise<OrderDoc[]> {
  if (!orderRows.length) return [];
  const ids = orderRows.map((r) => r.id);
  const itemRows = await rows(
    `SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY position ASC`,
    [ids],
  );
  const byOrder = new Map<string, OrderItemDoc[]>();
  for (const ir of itemRows) {
    const list = byOrder.get(ir.order_id) ?? [];
    list.push(rowToItem(ir));
    byOrder.set(ir.order_id, list);
  }
  return orderRows.map((r) => rowToOrder(r, byOrder.get(r.id) ?? []));
}

type Filter = Record<string, any>;

function buildWhere(filter: Filter): { text: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const eq = (col: string, val: unknown) => {
    // uuid columns must receive valid uuids, otherwise Postgres throws on cast
    params.push(col === "id" || col === "user_id" ? asUuid(val) : val);
    return `${col} = $${params.length}`;
  };

  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(val)) {
      const ors = val
        .map((sub: Filter) => {
          const inner = Object.entries(sub).map(([k, v]) => {
            if (k === "_id") return eq("id", v);
            return eq(COL[k] ?? k, v);
          });
          return inner.join(" AND ");
        })
        .filter(Boolean);
      if (ors.length) clauses.push(`(${ors.map((c) => `(${c})`).join(" OR ")})`);
      continue;
    }
    if (key === "_id") {
      clauses.push(eq("id", val));
      continue;
    }
    const col = COL[key] ?? key;
    if (val && typeof val === "object" && Array.isArray(val.$in)) {
      params.push(val.$in);
      clauses.push(`${col} = ANY($${params.length})`);
    } else {
      clauses.push(eq(col, val));
    }
  }
  return { text: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function find(
  filter: Filter = {},
  opts: { sort?: Record<string, 1 | -1>; limit?: number } = {},
): Promise<OrderDoc[]> {
  const { text: where, params } = buildWhere(filter);
  const order = sortClause(opts.sort, { createdAt: "created_at" }, "ORDER BY created_at DESC");
  let sql = `SELECT * FROM orders ${where} ${order}`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return attachItems(await rows(sql, params));
}

export async function findOne(filter: Filter): Promise<OrderDoc | null> {
  const { text: where, params } = buildWhere(filter);
  const r = await rows(`SELECT * FROM orders ${where} LIMIT 1`, params);
  return (await attachItems(r))[0] ?? null;
}

export async function findById(id: string): Promise<OrderDoc | null> {
  if (!asUuid(id)) return null;
  return findOne({ _id: id });
}

export type CreateOrderInput = {
  items: Array<Partial<OrderItemDoc> & { productId?: string }>;
  shippingAddress: Record<string, any>;
} & Record<string, any>;

export async function create(doc: CreateOrderInput): Promise<OrderDoc> {
  return withTransaction(async (client) => {
    const cols: string[] = ["shipping_address"];
    const params: unknown[] = [JSON.stringify(doc.shippingAddress ?? {})];
    for (const [key, val] of Object.entries(doc)) {
      if (key === "items" || key === "shippingAddress") continue;
      const col = COL[key];
      if (!col || val === undefined) continue;
      params.push(key === "userId" ? asUuid(val) : val);
      cols.push(col);
    }
    const placeholders = cols.map((c, i) => (c === "shipping_address" ? `$${i + 1}::jsonb` : `$${i + 1}`));
    const orderRow = (
      await client.query(
        `INSERT INTO orders (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        params,
      )
    ).rows[0];

    const items = doc.items ?? [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, image, pack_label, price, qty, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          orderRow.id, asUuid(it.productId), it.name ?? "", it.image ?? "",
          it.packLabel ?? "", num(it.price), Number(it.qty ?? 1), i,
        ],
      );
    }
    const itemRows = (
      await client.query(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY position ASC`, [orderRow.id])
    ).rows;
    return rowToOrder(orderRow, itemRows.map(rowToItem));
  });
}

function buildSet(patch: Record<string, unknown>): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(patch)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  }
  sets.push("updated_at = now()");
  return { sets, params };
}

export async function updateById(id: string, patch: Record<string, any>): Promise<OrderDoc | null> {
  if (!asUuid(id)) return null;
  const { sets, params } = buildSet(patch);
  params.push(id);
  const row = await one(`UPDATE orders SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
  return row ? (await attachItems([row]))[0] : null;
}

/** Update the first order matching a filter (mirrors findOneAndUpdate). */
export async function updateOne(filter: Filter, patch: Record<string, any>): Promise<OrderDoc | null> {
  const { text: where, params } = buildWhere(filter);
  const { sets, params: setParams } = buildSet(patch);
  // Re-number set params to come after where params.
  const offset = params.length;
  const renumbered = sets.map((s) =>
    s.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`),
  );
  const allParams = [...params, ...setParams];
  const sql = `UPDATE orders SET ${renumbered.join(", ")}
    WHERE id = (SELECT id FROM orders ${where} LIMIT 1) RETURNING *`;
  const row = await one(sql, allParams);
  return row ? (await attachItems([row]))[0] : null;
}

export async function updateByRazorpayId(razorpayOrderId: string, patch: Record<string, any>): Promise<OrderDoc | null> {
  return updateOne({ razorpayOrderId }, patch);
}
