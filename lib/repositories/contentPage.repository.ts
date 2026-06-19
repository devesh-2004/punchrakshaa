import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export type ContentPageDoc = Lean<Record<string, any>>;

const COL: Record<string, string> = {
  slug: "slug",
  title: "title",
  content: "content",
  metaTitle: "meta_title",
  metaDescription: "meta_description",
  isPublished: "is_published",
};

function rowToPage(row: Record<string, any>): ContentPageDoc {
  return {
    _id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    isPublished: row.is_published,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export async function find(): Promise<ContentPageDoc[]> {
  return (await rows(`SELECT * FROM content_pages ORDER BY created_at DESC`)).map(rowToPage);
}

export async function findBySlug(slug: string): Promise<ContentPageDoc | null> {
  const row = await one(`SELECT * FROM content_pages WHERE slug = $1`, [slug]);
  return row ? rowToPage(row) : null;
}

export async function findPublishedBySlug(slug: string): Promise<ContentPageDoc | null> {
  const row = await one(`SELECT * FROM content_pages WHERE slug = $1 AND is_published = true`, [slug]);
  return row ? rowToPage(row) : null;
}

export async function create(doc: Record<string, any>): Promise<ContentPageDoc> {
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
    `INSERT INTO content_pages (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    params,
  );
  return rowToPage(row!);
}

export async function updateBySlug(slug: string, patch: Record<string, any>): Promise<ContentPageDoc | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(patch)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  }
  sets.push("updated_at = now()");
  params.push(slug);
  const row = await one(`UPDATE content_pages SET ${sets.join(", ")} WHERE slug = $${params.length} RETURNING *`, params);
  return row ? rowToPage(row) : null;
}

export async function deleteBySlug(slug: string): Promise<boolean> {
  const row = await one(`DELETE FROM content_pages WHERE slug = $1 RETURNING id`, [slug]);
  return !!row;
}
