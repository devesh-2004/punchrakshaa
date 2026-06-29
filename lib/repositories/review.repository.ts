import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export type ReviewDoc = Lean<Record<string, any>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

const COL: Record<string, string> = {
  productId: "product_id",
  userId: "user_id",
  guestName: "guest_name",
  guestPhone: "guest_phone",
  rating: "rating",
  title: "title",
  body: "body",
  isVerified: "is_verified",
  status: "status",
  addedByAdmin: "added_by_admin",
  createdAt: "created_at",
};

/**
 * Map a review row to a lean doc. PII (`guestPhone`) is OMITTED by default so it
 * can never leak through public review reads/responses. Admin-only callers pass
 * `{ includePhone: true }` to include it.
 */
function rowToReview(row: Record<string, any>, opts: { includePhone?: boolean } = {}): ReviewDoc {
  const doc: ReviewDoc = {
    _id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    guestName: row.guest_name,
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    isVerified: row.is_verified,
    status: row.status,
    addedByAdmin: row.added_by_admin,
    createdAt: date(row.created_at),
  };
  if (opts.includePhone) doc.guestPhone = row.guest_phone;
  return doc;
}

/** Same as rowToReview but with productId populated as { _id, name, slug }. */
function rowToReviewPopulated(row: Record<string, any>, opts: { includePhone?: boolean } = {}): ReviewDoc {
  const r = rowToReview(row, opts);
  r.productId = row.p_id ? { _id: row.p_id, name: row.p_name, slug: row.p_slug } : null;
  return r;
}

type Filter = Record<string, any>;

function buildWhere(filter: Filter, alias = ""): { text: string; params: unknown[] } {
  const prefix = alias ? `${alias}.` : "";
  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(filter)) {
    const col = key === "_id" ? "id" : COL[key];
    if (!col) continue;
    params.push(key === "productId" || key === "_id" ? asUuid(val) ?? val : val);
    clauses.push(`${prefix}${col} = $${params.length}`);
  }
  return { text: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function find(
  filter: Filter = {},
  opts: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number } = {},
): Promise<ReviewDoc[]> {
  const { text: where, params } = buildWhere(filter);
  let sql = `SELECT * FROM reviews ${where} ORDER BY created_at ${opts.sort?.createdAt === 1 ? "ASC" : "DESC"}`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (opts.skip) {
    params.push(opts.skip);
    sql += ` OFFSET $${params.length}`;
  }
  return (await rows(sql, params)).map((r) => rowToReview(r));
}

/**
 * Mirrors `.populate("productId", "name slug")`. Admin-only — pass
 * `includePhone: true` to surface `guestPhone` (PII) for moderation.
 */
export async function findWithProduct(
  filter: Filter = {},
  opts: { limit?: number; skip?: number; includePhone?: boolean } = {},
): Promise<ReviewDoc[]> {
  const { text: where, params } = buildWhere(filter, "r");
  let sql = `
    SELECT r.*, p.id AS p_id, p.name AS p_name, p.slug AS p_slug
    FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id
    ${where}
    ORDER BY r.created_at DESC`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (opts.skip) {
    params.push(opts.skip);
    sql += ` OFFSET $${params.length}`;
  }
  return (await rows(sql, params)).map((r) => rowToReviewPopulated(r, { includePhone: opts.includePhone }));
}

export async function countDocuments(filter: Filter = {}): Promise<number> {
  const { text: where, params } = buildWhere(filter);
  const row = await one<{ n: number }>(`SELECT count(*)::int AS n FROM reviews ${where}`, params);
  return row?.n ?? 0;
}

export async function create(doc: Record<string, any>): Promise<ReviewDoc> {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(doc)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    params.push(key === "productId" || key === "userId" ? asUuid(val) : val);
    cols.push(col);
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const row = await one(
    `INSERT INTO reviews (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    params,
  );
  return rowToReview(row!);
}

export async function updateById(id: string, patch: Record<string, any>): Promise<ReviewDoc | null> {
  if (!asUuid(id)) return null;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(patch)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  }
  if (!sets.length) return null;
  params.push(id);
  const row = await one(`UPDATE reviews SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
  return row ? rowToReview(row) : null;
}

export async function deleteById(id: string): Promise<ReviewDoc | null> {
  if (!asUuid(id)) return null;
  const row = await one(`DELETE FROM reviews WHERE id = $1 RETURNING *`, [id]);
  return row ? rowToReview(row) : null;
}

export type RatingStats = {
  count: number;
  total: number;
  avg: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function ratingStats(productId: string): Promise<RatingStats> {
  const pid = asUuid(productId);
  const row = await one<any>(
    `SELECT
       count(*)::int AS count,
       COALESCE(sum(rating),0)::int AS total,
       COALESCE(sum((rating=5)::int),0)::int AS s5,
       COALESCE(sum((rating=4)::int),0)::int AS s4,
       COALESCE(sum((rating=3)::int),0)::int AS s3,
       COALESCE(sum((rating=2)::int),0)::int AS s2,
       COALESCE(sum((rating=1)::int),0)::int AS s1
     FROM reviews WHERE product_id = $1 AND status = 'approved'`,
    [pid],
  );
  const count = row?.count ?? 0;
  const total = row?.total ?? 0;
  return {
    count,
    total,
    avg: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    breakdown: { 5: row?.s5 ?? 0, 4: row?.s4 ?? 0, 3: row?.s3 ?? 0, 2: row?.s2 ?? 0, 1: row?.s1 ?? 0 },
  };
}
