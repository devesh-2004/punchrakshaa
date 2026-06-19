import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export const ACTIVITY_TYPES = [
  "login",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "checkout_start",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityLogDoc = Lean<{
  userId: string | null;
  activityType: ActivityType;
  metadata: Record<string, any>;
}>;

function rowToDoc(row: Record<string, any>): ActivityLogDoc {
  return {
    _id: row.id,
    userId: row.user_id ?? null,
    activityType: row.activity_type,
    metadata: row.metadata ?? {},
    createdAt: date(row.created_at),
  };
}

export function isActivityType(v: unknown): v is ActivityType {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

export type RecordActivityInput = {
  userId?: string | null;
  activityType: ActivityType;
  metadata?: Record<string, any>;
};

export async function record(input: RecordActivityInput): Promise<ActivityLogDoc> {
  const row = await one(
    `INSERT INTO customer_activity_logs (user_id, activity_type, metadata)
     VALUES ($1, $2, $3::jsonb) RETURNING *`,
    [
      isUuid(input.userId) ? input.userId : null,
      input.activityType,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rowToDoc(row!);
}

export async function list(
  filter: { userId?: string; activityType?: ActivityType } = {},
  opts: { limit?: number } = {},
): Promise<ActivityLogDoc[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.userId && isUuid(filter.userId)) { params.push(filter.userId); clauses.push(`user_id = $${params.length}`); }
  if (filter.activityType) { params.push(filter.activityType); clauses.push(`activity_type = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let sql = `SELECT * FROM customer_activity_logs ${where} ORDER BY created_at DESC`;
  if (opts.limit != null) { params.push(opts.limit); sql += ` LIMIT $${params.length}`; }
  return (await rows(sql, params)).map(rowToDoc);
}
