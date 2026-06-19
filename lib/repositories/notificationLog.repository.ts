import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export const NOTIFICATION_CHANNELS = ["sms", "email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed", "delivered"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export type NotificationLogDoc = Lean<{
  recipient: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: Record<string, any>;
}>;

function rowToDoc(row: Record<string, any>): NotificationLogDoc {
  return {
    _id: row.id,
    recipient: row.recipient,
    channel: row.channel,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: date(row.created_at),
  };
}

export type RecordNotificationInput = {
  recipient?: string;
  channel: NotificationChannel;
  status?: NotificationStatus;
  payload?: Record<string, any>;
};

/** Log a notification event. Logging only — no provider is contacted. */
export async function record(input: RecordNotificationInput): Promise<NotificationLogDoc> {
  const row = await one(
    `INSERT INTO notification_logs (recipient, channel, status, payload)
     VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
    [
      input.recipient ?? "",
      input.channel,
      input.status ?? "queued",
      JSON.stringify(input.payload ?? {}),
    ],
  );
  return rowToDoc(row!);
}

export async function list(
  filter: { channel?: NotificationChannel; status?: NotificationStatus } = {},
  opts: { limit?: number } = {},
): Promise<NotificationLogDoc[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.channel) { params.push(filter.channel); clauses.push(`channel = $${params.length}`); }
  if (filter.status) { params.push(filter.status); clauses.push(`status = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let sql = `SELECT * FROM notification_logs ${where} ORDER BY created_at DESC`;
  if (opts.limit != null) { params.push(opts.limit); sql += ` LIMIT $${params.length}`; }
  return (await rows(sql, params)).map(rowToDoc);
}
