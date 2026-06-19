import { rows, one } from "@/lib/db/postgres";
import { num, date, type Lean } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export type PaymentTransactionDoc = Lean<{
  orderId: string | null;
  provider: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  errorReason: string;
  notes: Record<string, any>;
}>;

function rowToDoc(row: Record<string, any>): PaymentTransactionDoc {
  return {
    _id: row.id,
    orderId: row.order_id ?? null,
    provider: row.provider,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpaySignature: row.razorpay_signature,
    amount: num(row.amount),
    currency: row.currency,
    status: row.status,
    method: row.method,
    errorReason: row.error_reason,
    notes: row.notes ?? {},
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export type RecordTransactionInput = {
  orderId?: string | null;
  provider?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount?: number;
  currency?: string;
  status: PaymentStatus;
  method?: string;
  errorReason?: string;
  notes?: Record<string, any>;
};

/** Append a payment event to the ledger. Returns the created row. */
export async function record(input: RecordTransactionInput): Promise<PaymentTransactionDoc> {
  const row = await one(
    `INSERT INTO payment_transactions
       (order_id, provider, razorpay_order_id, razorpay_payment_id, razorpay_signature,
        amount, currency, status, method, error_reason, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     RETURNING *`,
    [
      isUuid(input.orderId) ? input.orderId : null,
      input.provider ?? "razorpay",
      input.razorpayOrderId ?? "",
      input.razorpayPaymentId ?? "",
      input.razorpaySignature ?? "",
      num(input.amount),
      input.currency ?? "INR",
      input.status,
      input.method ?? "",
      input.errorReason ?? "",
      JSON.stringify(input.notes ?? {}),
    ],
  );
  return rowToDoc(row!);
}

export async function listByOrder(orderId: string): Promise<PaymentTransactionDoc[]> {
  if (!isUuid(orderId)) return [];
  const r = await rows(
    `SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );
  return r.map(rowToDoc);
}

export async function listByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentTransactionDoc[]> {
  const r = await rows(
    `SELECT * FROM payment_transactions WHERE razorpay_order_id = $1 ORDER BY created_at ASC`,
    [razorpayOrderId],
  );
  return r.map(rowToDoc);
}
