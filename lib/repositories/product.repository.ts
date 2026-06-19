import { rows, one, withTransaction } from "@/lib/db/postgres";
import type { PoolClient } from "pg";
import { num, date, sortClause, type Lean } from "./_mappers";
import * as categoriesRepo from "./category.repository";

/** camelCase field -> promoted column. Everything else lives in `content` JSONB. */
const SCALAR: Record<string, string> = {
  slug: "slug",
  name: "name",
  secondaryName: "secondary_name",
  shortDescription: "short_description",
  description: "description",
  price: "price",
  discountedPrice: "discounted_price",
  discountPercent: "discount_percent",
  productType: "product_type",
  packUnit: "pack_unit",
  inStock: "in_stock",
  isArchived: "is_archived",
  isBestSelling: "is_best_selling",
  isUpsellProduct: "is_upsell_product",
  codAvailable: "cod_available",
  overallRating: "overall_rating",
  totalReviews: "total_reviews",
};

/**
 * Fields that no longer live on the product row / content JSONB — they are
 * stored in dedicated relational tables and handled separately on write.
 */
const RELATION_KEYS = new Set([
  "packOptions",
  "linkedTestimonialIds",
  "linkedBlogSlugs",
  "category",
  "categoryId",
  // Phase 6 — presentational arrays normalized into dedicated tables.
  "images",
  "faqs",
  "ingredients",
  "tags",
  "benefits",
]);

const SORT_COLS: Record<string, string> = {
  createdAt: "created_at",
  isBestSelling: "is_best_selling",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): boolean => typeof v === "string" && UUID_RE.test(v);

export type ProductDoc = Lean<Record<string, any>>;

function rowToProduct(row: Record<string, any>): ProductDoc {
  const content = row.content ?? {};
  return {
    ...content,
    _id: row.id,
    slug: row.slug,
    name: row.name,
    secondaryName: row.secondary_name,
    shortDescription: row.short_description,
    description: row.description,
    price: num(row.price),
    discountedPrice: num(row.discounted_price),
    discountPercent: num(row.discount_percent),
    categoryId: row.category_id ?? null,
    category: "", // filled in by attachRelations from the categories table
    productType: row.product_type,
    packUnit: row.pack_unit,
    inStock: row.in_stock,
    isArchived: row.is_archived,
    isBestSelling: row.is_best_selling,
    isUpsellProduct: row.is_upsell_product,
    codAvailable: row.cod_available,
    overallRating: num(row.overall_rating),
    totalReviews: Number(row.total_reviews ?? 0),
    // relational fields — populated by attachRelations:
    packOptions: [],
    linkedTestimonialIds: [],
    linkedBlogSlugs: [],
    images: [],
    faqs: [],
    ingredients: [],
    tags: [],
    benefits: [],
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

function variantToPackOption(v: Record<string, unknown>) {
  return {
    _id: v.id,
    variantId: v.id,
    label: v.label,
    badge: v.badge,
    contents: v.contents,
    price: num(v.price),
    mrp: num(v.mrp),
    discountPercent: num(v.discount_percent),
    image: v.image,
    sku: v.sku ?? "",
    stock: Number(v.quantity ?? 0),
    reserved: Number(v.reserved ?? 0),
    lowStockThreshold: Number(v.low_stock_threshold ?? 0),
  };
}

/**
 * Re-hydrate the relational data (category name, pack options + stock, linked
 * testimonials, linked blogs) onto a set of product rows so callers keep
 * receiving the exact same document shape they did when this lived in JSONB.
 */
async function attachRelations(productRows: Record<string, unknown>[]): Promise<ProductDoc[]> {
  if (!productRows.length) return [];
  const docs = productRows.map(rowToProduct);
  const ids = productRows.map((r) => r.id);

  const categoryIds = Array.from(
    new Set(productRows.map((r) => r.category_id).filter(Boolean)),
  );

  const [
    catRows, variantRows, testimonialRows, blogRows,
    imageRows, faqRows, ingredientRows, tagRows, benefitRows,
  ] = await Promise.all([
    categoryIds.length
      ? rows(`SELECT id, name FROM categories WHERE id = ANY($1::uuid[])`, [categoryIds])
      : Promise.resolve([]),
    rows(
      `SELECT v.*, inv.quantity, inv.reserved, inv.low_stock_threshold
       FROM product_variants v
       LEFT JOIN inventory inv ON inv.variant_id = v.id
       WHERE v.product_id = ANY($1::uuid[])
       ORDER BY v.product_id, v.position ASC, v.created_at ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, testimonial_id FROM product_testimonials
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC`,
      [ids],
    ),
    rows(
      `SELECT pb.product_id, b.slug
       FROM product_blogs pb
       JOIN blogs b ON b.id = pb.blog_id
       WHERE pb.product_id = ANY($1::uuid[])
       ORDER BY pb.product_id, pb.position ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, url, alt_text, filename FROM product_images
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC, created_at ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, question, answer FROM product_faqs
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC, created_at ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, name, image_url, description, alt_text FROM product_ingredients
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC, created_at ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, title, color FROM product_tags
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC, created_at ASC`,
      [ids],
    ),
    rows(
      `SELECT product_id, text FROM product_benefits
       WHERE product_id = ANY($1::uuid[])
       ORDER BY product_id, position ASC, created_at ASC`,
      [ids],
    ),
  ]);

  const catNameById = new Map<string, string>();
  for (const c of catRows as any[]) catNameById.set(c.id, c.name);

  const packByProduct = new Map<string, any[]>();
  for (const v of variantRows as any[]) {
    const list = packByProduct.get(v.product_id) ?? [];
    list.push(variantToPackOption(v));
    packByProduct.set(v.product_id, list);
  }

  const testimonialsByProduct = new Map<string, string[]>();
  for (const t of testimonialRows as any[]) {
    const list = testimonialsByProduct.get(t.product_id) ?? [];
    list.push(t.testimonial_id);
    testimonialsByProduct.set(t.product_id, list);
  }

  const blogsByProduct = new Map<string, string[]>();
  for (const b of blogRows as any[]) {
    const list = blogsByProduct.get(b.product_id) ?? [];
    list.push(b.slug);
    blogsByProduct.set(b.product_id, list);
  }

  // Phase 6 presentational relations — preserve the original document shapes.
  const groupBy = <T>(rs: Record<string, any>[], map: (r: Record<string, any>) => T): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const r of rs) {
      const list = m.get(r.product_id) ?? [];
      list.push(map(r));
      m.set(r.product_id, list);
    }
    return m;
  };
  const imagesByProduct = groupBy(imageRows as any[], (r) => ({
    url: r.url, altText: r.alt_text ?? "", filename: r.filename ?? "",
  }));
  const faqsByProduct = groupBy(faqRows as any[], (r) => ({
    question: r.question ?? "", answer: r.answer ?? "",
  }));
  const ingredientsByProduct = groupBy(ingredientRows as any[], (r) => ({
    name: r.name ?? "", description: r.description ?? "", image: r.image_url ?? "", altText: r.alt_text ?? "",
  }));
  const tagsByProduct = groupBy(tagRows as any[], (r) => ({
    title: r.title ?? "", color: r.color ?? "",
  }));
  const benefitsByProduct = groupBy(benefitRows as any[], (r) => r.text as string);

  for (const doc of docs) {
    const id = doc._id;
    doc.category = doc.categoryId ? catNameById.get(doc.categoryId) ?? "" : "";
    doc.packOptions = packByProduct.get(id) ?? [];
    doc.linkedTestimonialIds = testimonialsByProduct.get(id) ?? [];
    doc.linkedBlogSlugs = blogsByProduct.get(id) ?? [];
    doc.images = imagesByProduct.get(id) ?? [];
    doc.faqs = faqsByProduct.get(id) ?? [];
    doc.ingredients = ingredientsByProduct.get(id) ?? [];
    doc.tags = tagsByProduct.get(id) ?? [];
    doc.benefits = benefitsByProduct.get(id) ?? [];
  }

  return docs;
}

/** Split an incoming doc into promoted column values + remaining content. */
function splitDoc(doc: Record<string, any>) {
  const cols: Record<string, any> = {};
  const content: Record<string, any> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (key === "_id" || key === "id" || key === "createdAt" || key === "updatedAt") continue;
    if (RELATION_KEYS.has(key)) continue; // handled via dedicated tables
    if (SCALAR[key]) cols[SCALAR[key]] = val;
    else content[key] = val;
  }
  return { cols, content };
}

type Filter = Record<string, any>;

function buildWhere(filter: Filter): { text: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, val: unknown) => {
    params.push(val);
    clauses.push(sql.replace("$?", `$${params.length}`));
  };

  for (const [key, val] of Object.entries(filter)) {
    if (key === "_id") {
      if (val && typeof val === "object" && Array.isArray(val.$in)) add("id = ANY($?::uuid[])", val.$in);
      else if (val && typeof val === "object" && val.$ne) add("id <> $?", val.$ne);
      else add("id = $?", val);
      continue;
    }
    const col = SCALAR[key] ?? null;
    if (!col) continue; // unknown filter keys are ignored (parity with how they were unused)
    if (val && typeof val === "object" && "$ne" in val) add(`${col} <> $?`, val.$ne);
    else if (val && typeof val === "object" && Array.isArray(val.$in)) add(`${col} = ANY($?)`, val.$in);
    else add(`${col} = $?`, val);
  }

  return { text: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function find(
  filter: Filter = {},
  opts: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number } = {},
): Promise<ProductDoc[]> {
  const { text: where, params } = buildWhere(filter);
  // Soft delete: never return soft-deleted products.
  const whereSql = where ? `${where} AND deleted_at IS NULL` : `WHERE deleted_at IS NULL`;
  const order = sortClause(opts.sort, SORT_COLS, "ORDER BY created_at DESC");
  let sql = `SELECT * FROM products ${whereSql} ${order}`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (opts.skip) {
    params.push(opts.skip);
    sql += ` OFFSET $${params.length}`;
  }
  const r = await rows(sql, params);
  return attachRelations(r);
}

export async function findBySlug(slug: string): Promise<ProductDoc | null> {
  const row = await one(`SELECT * FROM products WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return row ? (await attachRelations([row]))[0] : null;
}

export async function findById(id: string): Promise<ProductDoc | null> {
  if (!isUuid(id)) return null;
  const row = await one(`SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return row ? (await attachRelations([row]))[0] : null;
}

export async function findByIds(ids: string[]): Promise<ProductDoc[]> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const r = await rows(`SELECT * FROM products WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`, [valid]);
  return attachRelations(r);
}

/**
 * Full text search over name / short_description / benefits / keywords using
 * the maintained `search_vector` (GIN-indexed). Excludes soft-deleted and
 * archived products, ranked by relevance. Repository method only — no UI yet.
 */
export async function search(
  queryText: string,
  opts: { limit?: number } = {},
): Promise<ProductDoc[]> {
  const q = (queryText ?? "").trim();
  if (!q) return [];
  const params: unknown[] = [q];
  let sql = `
    SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
    FROM products
    WHERE deleted_at IS NULL
      AND is_archived = false
      AND search_vector @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC, created_at DESC`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return attachRelations(await rows(sql, params));
}

// ---------------------------------------------------------------------------
// Relational write helpers (run inside the caller's transaction)
// ---------------------------------------------------------------------------

/**
 * Sync a product's variants to exactly the given pack options. Existing
 * variants are matched by label so their inventory rows survive edits.
 * Passing `undefined` leaves variants untouched.
 */
async function syncVariants(client: PoolClient, productId: string, packOptions: unknown): Promise<void> {
  if (packOptions === undefined) return;
  const list: unknown[] = Array.isArray(packOptions) ? packOptions : [];

  // De-duplicate by label (last wins) to respect the (product_id,label) unique index.
  const byLabel = new Map<string, any>();
  for (const p of list) {
    const label = (p as Record<string, unknown>)?.label;
    byLabel.set(typeof label === "string" ? label : "", p);
  }
  const packs = Array.from(byLabel.entries());
  const labels = packs.map(([label]) => label);

  // Drop variants whose label is no longer present (cascades their inventory).
  if (labels.length) {
    await client.query(
      `DELETE FROM product_variants WHERE product_id = $1 AND label <> ALL($2::text[])`,
      [productId, labels],
    );
  } else {
    await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [productId]);
  }

  const existing = (
    await client.query(`SELECT id, label FROM product_variants WHERE product_id = $1`, [productId])
  ).rows;
  const idByLabel = new Map<string, string>();
  for (const e of existing) idByLabel.set(e.label, e.id);

  let position = 0;
  for (const [label, pack] of packs) {
    const fields = {
      badge: String(pack?.badge ?? ""),
      contents: String(pack?.contents ?? ""),
      price: num(pack?.price),
      mrp: num(pack?.mrp),
      discount_percent: num(pack?.discountPercent),
      image: String(pack?.image ?? ""),
      sku: String(pack?.sku ?? "").trim(),
      position,
    };

    let variantId = idByLabel.get(label);
    if (variantId) {
      await client.query(
        `UPDATE product_variants
         SET badge=$1, contents=$2, price=$3, mrp=$4, discount_percent=$5,
             image=$6, sku=$7, position=$8, updated_at=now()
         WHERE id=$9`,
        [fields.badge, fields.contents, fields.price, fields.mrp, fields.discount_percent,
         fields.image, fields.sku, fields.position, variantId],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO product_variants
           (product_id, label, badge, contents, price, mrp, discount_percent, image, sku, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [productId, label, fields.badge, fields.contents, fields.price, fields.mrp,
         fields.discount_percent, fields.image, fields.sku, fields.position],
      );
      variantId = inserted.rows[0].id;
    }

    // Ensure an inventory row exists; only set stock fields when supplied so we
    // never clobber admin-managed quantities on an unrelated product edit.
    await client.query(
      `INSERT INTO inventory (variant_id) VALUES ($1) ON CONFLICT (variant_id) DO NOTHING`,
      [variantId],
    );
    const invSets: string[] = [];
    const invParams: unknown[] = [];
    if (pack?.stock !== undefined && pack?.stock !== null && pack?.stock !== "") {
      invParams.push(Math.max(0, Math.trunc(Number(pack.stock) || 0)));
      invSets.push(`quantity = $${invParams.length}`);
    }
    if (pack?.lowStockThreshold !== undefined && pack?.lowStockThreshold !== null && pack?.lowStockThreshold !== "") {
      invParams.push(Math.max(0, Math.trunc(Number(pack.lowStockThreshold) || 0)));
      invSets.push(`low_stock_threshold = $${invParams.length}`);
    }
    if (invSets.length) {
      invParams.push(variantId);
      await client.query(
        `UPDATE inventory SET ${invSets.join(", ")}, updated_at=now() WHERE variant_id = $${invParams.length}`,
        invParams,
      );
    }
    position++;
  }
}

/** Replace a product's linked testimonials. Passing `undefined` is a no-op. */
async function syncTestimonials(client: PoolClient, productId: string, ids: unknown): Promise<void> {
  if (ids === undefined) return;
  await client.query(`DELETE FROM product_testimonials WHERE product_id = $1`, [productId]);
  const valid = (Array.isArray(ids) ? ids : []).map(String).filter(isUuid);
  if (!valid.length) return;
  await client.query(
    `INSERT INTO product_testimonials (product_id, testimonial_id, position)
     SELECT $1, t.id, (x.ord - 1)::int
     FROM unnest($2::uuid[]) WITH ORDINALITY AS x(tid, ord)
     JOIN testimonials t ON t.id = x.tid
     ON CONFLICT (product_id, testimonial_id) DO NOTHING`,
    [productId, valid],
  );
}

/** Replace a product's linked blogs (by slug). Passing `undefined` is a no-op. */
async function syncBlogs(client: PoolClient, productId: string, slugs: unknown): Promise<void> {
  if (slugs === undefined) return;
  await client.query(`DELETE FROM product_blogs WHERE product_id = $1`, [productId]);
  const list = (Array.isArray(slugs) ? slugs : []).map(String).filter(Boolean);
  if (!list.length) return;
  await client.query(
    `INSERT INTO product_blogs (product_id, blog_id, position)
     SELECT $1, b.id, (x.ord - 1)::int
     FROM unnest($2::text[]) WITH ORDINALITY AS x(slug, ord)
     JOIN blogs b ON b.slug = x.slug
     ON CONFLICT (product_id, blog_id) DO NOTHING`,
    [productId, list],
  );
}

/**
 * Generic "replace all rows for this product, in order" sync for the Phase 6
 * presentational tables. Passing `undefined` is a no-op (field not provided);
 * passing an array (incl. empty) replaces the set. Each `rowValues` entry omits
 * product_id and position — those are added here from the array index.
 */
async function syncOrdered(
  client: PoolClient,
  table: string,
  columns: string[],
  productId: string,
  list: unknown,
  rowValues: (item: unknown) => unknown[],
  keep: (item: unknown) => boolean = () => true,
): Promise<void> {
  if (list === undefined) return;
  await client.query(`DELETE FROM ${table} WHERE product_id = $1`, [productId]);
  const items = (Array.isArray(list) ? list : []).filter(keep);
  if (!items.length) return;
  const cols = ["product_id", ...columns, "position"];
  for (let i = 0; i < items.length; i++) {
    const vals = [productId, ...rowValues(items[i]), i];
    const placeholders = vals.map((_, j) => `$${j + 1}`).join(", ");
    await client.query(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`, vals);
  }
}

type AnyObj = Record<string, any>;
const asObj = (v: unknown): AnyObj => (v && typeof v === "object" ? (v as AnyObj) : {});

const imgUrl = (img: unknown) => {
  const o = asObj(img);
  return String(typeof img === "string" ? img : o.url ?? "").trim();
};

async function syncImages(client: PoolClient, productId: string, images: unknown): Promise<void> {
  await syncOrdered(
    client, "product_images", ["url", "alt_text", "filename"], productId, images,
    (img) => { const o = asObj(img); return [imgUrl(img), String(o.altText ?? ""), String(o.filename ?? "")]; },
    (img) => imgUrl(img) !== "",
  );
}

async function syncFaqs(client: PoolClient, productId: string, faqs: unknown): Promise<void> {
  await syncOrdered(
    client, "product_faqs", ["question", "answer"], productId, faqs,
    (f) => { const o = asObj(f); return [String(o.question ?? ""), String(o.answer ?? "")]; },
    (f) => { const o = asObj(f); return String(o.question ?? "").trim() !== "" || String(o.answer ?? "").trim() !== ""; },
  );
}

async function syncIngredients(client: PoolClient, productId: string, ingredients: unknown): Promise<void> {
  await syncOrdered(
    client, "product_ingredients", ["name", "image_url", "description", "alt_text"], productId, ingredients,
    (x) => { const o = asObj(x); return [String(o.name ?? ""), String(o.image ?? ""), String(o.description ?? ""), String(o.altText ?? "")]; },
    (x) => { const o = asObj(x); return String(o.name ?? "").trim() !== "" || String(o.description ?? "").trim() !== "" || String(o.image ?? "").trim() !== ""; },
  );
}

async function syncTags(client: PoolClient, productId: string, tags: unknown): Promise<void> {
  await syncOrdered(
    client, "product_tags", ["title", "color"], productId, tags,
    (t) => { const o = asObj(t); return [String(o.title ?? ""), String(o.color ?? "")]; },
    (t) => String(asObj(t).title ?? "").trim() !== "",
  );
}

const benefitText = (b: unknown) => { const o = asObj(b); return String(typeof b === "string" ? b : o.text ?? ""); };

async function syncBenefits(client: PoolClient, productId: string, benefits: unknown): Promise<void> {
  await syncOrdered(
    client, "product_benefits", ["text"], productId, benefits,
    (b) => [benefitText(b)],
    (b) => benefitText(b).trim() !== "",
  );
}

async function resolveCategoryId(client: PoolClient, doc: Record<string, any>): Promise<string | null | undefined> {
  if (isUuid(doc.categoryId)) return doc.categoryId;
  if ("category" in doc || "categoryId" in doc) {
    return categoriesRepo.resolveId(client, doc.category);
  }
  return undefined; // not provided — leave unchanged
}

export async function create(doc: Record<string, any>): Promise<ProductDoc> {
  const id = await withTransaction(async (client) => {
    const { cols, content } = splitDoc(doc);
    const categoryId = await resolveCategoryId(client, doc);

    const colNames = Object.keys(cols);
    const params: unknown[] = colNames.map((c) => cols[c]);
    const insertCols = [...colNames];
    if (categoryId !== undefined) {
      params.push(categoryId);
      insertCols.push("category_id");
    }
    params.push(JSON.stringify(content));
    const valuePlaceholders = insertCols.map((_, i) => `$${i + 1}`);
    const sql = `
      INSERT INTO products (${insertCols.join(", ")}, content)
      VALUES (${valuePlaceholders.join(", ")}, $${params.length}::jsonb)
      RETURNING id`;
    const row = (await client.query(sql, params)).rows[0];

    await syncVariants(client, row.id, doc.packOptions);
    await syncTestimonials(client, row.id, doc.linkedTestimonialIds);
    await syncBlogs(client, row.id, doc.linkedBlogSlugs);
    await syncImages(client, row.id, doc.images);
    await syncFaqs(client, row.id, doc.faqs);
    await syncIngredients(client, row.id, doc.ingredients);
    await syncTags(client, row.id, doc.tags);
    await syncBenefits(client, row.id, doc.benefits);
    return row.id as string;
  });

  return (await findById(id))!;
}

async function update(col: string, value: unknown, patch: Record<string, unknown>): Promise<ProductDoc | null> {
  const id = await withTransaction(async (client) => {
    const { cols, content } = splitDoc(patch);
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [c, v] of Object.entries(cols)) {
      params.push(v);
      sets.push(`${c} = $${params.length}`);
    }
    const categoryId = await resolveCategoryId(client, patch);
    if (categoryId !== undefined) {
      params.push(categoryId);
      sets.push(`category_id = $${params.length}`);
    }
    if (Object.keys(content).length) {
      params.push(JSON.stringify(content));
      sets.push(`content = content || $${params.length}::jsonb`);
    }
    sets.push("updated_at = now()");
    params.push(value);
    const row = (
      await client.query(
        `UPDATE products SET ${sets.join(", ")} WHERE ${col} = $${params.length} AND deleted_at IS NULL RETURNING id`,
        params,
      )
    ).rows[0];
    if (!row) return null;

    if ("packOptions" in patch) await syncVariants(client, row.id, patch.packOptions);
    if ("linkedTestimonialIds" in patch) await syncTestimonials(client, row.id, patch.linkedTestimonialIds);
    if ("linkedBlogSlugs" in patch) await syncBlogs(client, row.id, patch.linkedBlogSlugs);
    if ("images" in patch) await syncImages(client, row.id, patch.images);
    if ("faqs" in patch) await syncFaqs(client, row.id, patch.faqs);
    if ("ingredients" in patch) await syncIngredients(client, row.id, patch.ingredients);
    if ("tags" in patch) await syncTags(client, row.id, patch.tags);
    if ("benefits" in patch) await syncBenefits(client, row.id, patch.benefits);
    return row.id as string;
  });

  return id ? findById(id) : null;
}

export async function updateBySlug(slug: string, patch: Record<string, any>): Promise<ProductDoc | null> {
  return update("slug", slug, patch);
}

export async function updateById(id: string, patch: Record<string, any>): Promise<ProductDoc | null> {
  if (!isUuid(id)) return null;
  return update("id", id, patch);
}

export async function deleteBySlug(slug: string): Promise<boolean> {
  // Soft delete: mark the row deleted instead of physically removing it. Related
  // variants/inventory/junctions are preserved; reads exclude deleted products.
  const row = await one(
    `UPDATE products SET deleted_at = now(), updated_at = now()
     WHERE slug = $1 AND deleted_at IS NULL RETURNING id`,
    [slug],
  );
  return !!row;
}

/** Distinct category names (now sourced from the categories table). */
export async function distinctCategories(): Promise<string[]> {
  return categoriesRepo.listNames();
}
