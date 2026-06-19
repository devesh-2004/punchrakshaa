import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export type BlogDoc = Lean<Record<string, any>>;

const COL: Record<string, string> = {
  slug: "slug",
  title: "title",
  excerpt: "excerpt",
  content: "content",
  coverImage: "cover_image",
  coverImageAlt: "cover_image_alt",
  author: "author",
  tags: "tags",
  metaTitle: "meta_title",
  metaDescription: "meta_description",
  publishedAt: "published_at",
};

function rowToBlog(row: Record<string, any>): BlogDoc {
  return {
    _id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.cover_image,
    coverImageAlt: row.cover_image_alt,
    author: row.author,
    tags: row.tags ?? [],
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    publishedAt: date(row.published_at),
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export async function find(
  filter: { tags?: string } = {},
  opts: { limit?: number; skip?: number } = {},
): Promise<BlogDoc[]> {
  const params: unknown[] = [];
  let where = "WHERE deleted_at IS NULL";
  if (filter.tags) {
    params.push(filter.tags);
    where += ` AND $${params.length} = ANY(tags)`;
  }
  let sql = `SELECT * FROM blogs ${where} ORDER BY published_at DESC`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (opts.skip) {
    params.push(opts.skip);
    sql += ` OFFSET $${params.length}`;
  }
  return (await rows(sql, params)).map(rowToBlog);
}

export async function findBySlug(slug: string): Promise<BlogDoc | null> {
  const row = await one(`SELECT * FROM blogs WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return row ? rowToBlog(row) : null;
}

export async function findBySlugs(slugs: string[]): Promise<BlogDoc[]> {
  if (!slugs.length) return [];
  return (await rows(`SELECT * FROM blogs WHERE slug = ANY($1) AND deleted_at IS NULL`, [slugs])).map(rowToBlog);
}

/** Recent blogs excluding a given slug (mirrors find({ slug: { $ne } })). */
export async function findRecentExcluding(slug: string, limit = 3): Promise<BlogDoc[]> {
  return (
    await rows(
      `SELECT * FROM blogs WHERE slug <> $1 AND deleted_at IS NULL ORDER BY published_at DESC LIMIT $2`,
      [slug, limit],
    )
  ).map(rowToBlog);
}

export async function countDocuments(): Promise<number> {
  const row = await one<{ n: number }>(`SELECT count(*)::int AS n FROM blogs WHERE deleted_at IS NULL`);
  return row?.n ?? 0;
}

function splitDoc(doc: Record<string, any>) {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(doc)) {
    const col = COL[key];
    if (!col || val === undefined) continue;
    cols.push(col);
    params.push(val);
  }
  return { cols, params };
}

export async function create(doc: Record<string, any>): Promise<BlogDoc> {
  if (!doc.publishedAt) doc = { ...doc, publishedAt: new Date() };
  const { cols, params } = splitDoc(doc);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const row = await one(
    `INSERT INTO blogs (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    params,
  );
  return rowToBlog(row!);
}

export async function updateBySlug(slug: string, patch: Record<string, any>): Promise<BlogDoc | null> {
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
  const row = await one(
    `UPDATE blogs SET ${sets.join(", ")} WHERE slug = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params,
  );
  return row ? rowToBlog(row) : null;
}

export async function deleteBySlug(slug: string): Promise<boolean> {
  // Soft delete: mark deleted; reads exclude it and the slug can be reused.
  const row = await one(
    `UPDATE blogs SET deleted_at = now(), updated_at = now()
     WHERE slug = $1 AND deleted_at IS NULL RETURNING id`,
    [slug],
  );
  return !!row;
}

/** Replaces getRecentBlogs(): newest blogs trimmed to card fields. */
export async function getRecent(limit = 3): Promise<{ slug: string; title: string; image: string; alt: string }[]> {
  const r = await rows(
    `SELECT slug, title, cover_image, cover_image_alt FROM blogs WHERE deleted_at IS NULL ORDER BY published_at DESC LIMIT $1`,
    [limit],
  );
  return r.map((b) => ({
    slug: b.slug as string,
    title: b.title as string,
    image: b.cover_image as string,
    alt: (b.cover_image_alt || b.title) as string,
  }));
}
