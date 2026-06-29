import { rows, one, withTransaction } from "@/lib/db/postgres";
import type { PoolClient } from "pg";
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
    suggestedProductIds: [],
  };
}

async function attachRelations(blogRows: Record<string, unknown>[]): Promise<BlogDoc[]> {
  if (!blogRows.length) return [];
  const docs = blogRows.map(rowToBlog);
  const blogIds = docs.map((d) => d._id);

  const productBlogRows = await rows(
    `SELECT product_id, blog_id FROM product_blogs WHERE blog_id = ANY($1::uuid[]) ORDER BY position`,
    [blogIds]
  );

  const productsByBlog = new Map<string, string[]>();
  for (const r of productBlogRows) {
    const list = productsByBlog.get(r.blog_id) ?? [];
    list.push(r.product_id);
    productsByBlog.set(r.blog_id, list);
  }

  for (const doc of docs) {
    doc.suggestedProductIds = productsByBlog.get(doc._id) ?? [];
  }
  return docs;
}

export async function findById(id: string): Promise<BlogDoc | null> {
  const row = await one(`SELECT * FROM blogs WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!row) return null;
  const docs = await attachRelations([row]);
  return docs[0];
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
  const blogRows = await rows(sql, params);
  return attachRelations(blogRows);
}

export async function findBySlug(slug: string): Promise<BlogDoc | null> {
  const row = await one(`SELECT * FROM blogs WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  if (!row) return null;
  const docs = await attachRelations([row]);
  return docs[0];
}

export async function findBySlugs(slugs: string[]): Promise<BlogDoc[]> {
  if (!slugs.length) return [];
  const blogRows = await rows(`SELECT * FROM blogs WHERE slug = ANY($1) AND deleted_at IS NULL`, [slugs]);
  return attachRelations(blogRows);
}

/** Recent blogs excluding a given slug (mirrors find({ slug: { $ne } })). */
export async function findRecentExcluding(slug: string, limit = 3): Promise<BlogDoc[]> {
  const blogRows = await rows(
    `SELECT * FROM blogs WHERE slug <> $1 AND deleted_at IS NULL ORDER BY published_at DESC LIMIT $2`,
    [slug, limit],
  );
  return attachRelations(blogRows);
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

async function syncProducts(client: PoolClient, blogId: string, productIds: unknown): Promise<void> {
  if (productIds === undefined) return;
  await client.query(`DELETE FROM product_blogs WHERE blog_id = $1`, [blogId]);
  const list = (Array.isArray(productIds) ? productIds : []).map(String).filter(Boolean);
  if (!list.length) return;
  await client.query(
    `INSERT INTO product_blogs (product_id, blog_id, position)
     SELECT x.prod_id::uuid, $1, (x.ord - 1)::int
     FROM unnest($2::text[]) WITH ORDINALITY AS x(prod_id, ord)
     ON CONFLICT (product_id, blog_id) DO NOTHING`,
    [blogId, list]
  );
}

export async function create(doc: Record<string, any>): Promise<BlogDoc> {
  if (!doc.publishedAt) doc = { ...doc, publishedAt: new Date() };

  const id = await withTransaction(async (client) => {
    const { cols, params } = splitDoc(doc);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const res = await client.query(
      `INSERT INTO blogs (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`,
      params,
    );
    const row = res.rows[0];
    await syncProducts(client, row.id, doc.suggestedProductIds);
    return row.id;
  });

  return (await findById(id))!;
}

export async function updateBySlug(slug: string, patch: Record<string, any>): Promise<BlogDoc | null> {
  const id = await withTransaction(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, val] of Object.entries(patch)) {
      const col = COL[key];
      if (!col || val === undefined) continue;
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    }

    let blogId: string | null = null;
    if (sets.length > 0) {
      sets.push("updated_at = now()");
      params.push(slug);
      const res = await client.query(
        `UPDATE blogs SET ${sets.join(", ")} WHERE slug = $${params.length} AND deleted_at IS NULL RETURNING id`,
        params,
      );
      const row = res.rows[0];
      if (row) blogId = row.id;
    } else {
      const res = await client.query(`SELECT id FROM blogs WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
      const row = res.rows[0];
      if (row) blogId = row.id;
    }

    if (!blogId) return null;

    if ("suggestedProductIds" in patch) {
      await syncProducts(client, blogId, patch.suggestedProductIds);
    }
    return blogId;
  });

  return id ? findById(id) : null;
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
