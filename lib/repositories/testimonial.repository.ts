import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export type TestimonialDoc = Lean<Record<string, any>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

const COL: Record<string, string> = {
  image: "image",
  videoId: "video_id",
  customerName: "customer_name",
  order: "order_idx",
  isActive: "is_active",
};

function rowToTestimonial(row: Record<string, any>): TestimonialDoc {
  return {
    _id: row.id,
    image: row.image,
    videoId: row.video_id,
    customerName: row.customer_name,
    order: Number(row.order_idx ?? 0),
    isActive: row.is_active,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export async function find(filter: { isActive?: boolean } = {}): Promise<TestimonialDoc[]> {
  const params: unknown[] = [];
  let where = "WHERE deleted_at IS NULL";
  if (filter.isActive !== undefined) {
    params.push(filter.isActive);
    where += ` AND is_active = $${params.length}`;
  }
  const r = await rows(`SELECT * FROM testimonials ${where} ORDER BY order_idx ASC, created_at ASC`, params);
  return r.map(rowToTestimonial);
}

export async function countDocuments(): Promise<number> {
  const row = await one<{ n: number }>(`SELECT count(*)::int AS n FROM testimonials WHERE deleted_at IS NULL`);
  return row?.n ?? 0;
}

export async function create(doc: Record<string, any>): Promise<TestimonialDoc> {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(doc)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    cols.push(col);
    params.push(val);
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const row = await one(
    `INSERT INTO testimonials (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    params,
  );
  return rowToTestimonial(row!);
}

export async function updateById(id: string, patch: Record<string, any>): Promise<TestimonialDoc | null> {
  if (!isUuid(id)) return null;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(patch)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  }
  if (!sets.length) return null;
  sets.push("updated_at = now()");
  params.push(id);
  const row = await one(
    `UPDATE testimonials SET ${sets.join(", ")} WHERE id = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params,
  );
  return row ? rowToTestimonial(row) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  // Soft delete: mark deleted; reads exclude it.
  const row = await one(
    `UPDATE testimonials SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id],
  );
  return !!row;
}
