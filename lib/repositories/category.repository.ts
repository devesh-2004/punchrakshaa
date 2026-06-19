import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";
import type { PoolClient } from "pg";

export type CategoryDoc = Lean<{ slug: string; name: string }>;

function rowToCategory(row: Record<string, any>): CategoryDoc {
  return {
    _id: row.id,
    slug: row.slug,
    name: row.name,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function find(): Promise<CategoryDoc[]> {
  const r = await rows(`SELECT * FROM categories ORDER BY name ASC`);
  return r.map(rowToCategory);
}

/** Distinct category names (replaces products.distinctCategories). */
export async function listNames(): Promise<string[]> {
  const r = await rows<{ name: string }>(`SELECT name FROM categories ORDER BY name ASC`);
  return r.map((x) => x.name);
}

export async function create(name: string): Promise<CategoryDoc> {
  const clean = name.trim();
  const row = await one(
    `INSERT INTO categories (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
     RETURNING *`,
    [clean, slugify(clean)],
  );
  return rowToCategory(row!);
}

/**
 * Resolve a category name to its id, creating the category if it does not yet
 * exist. Returns null for blank input. Runs inside the caller's transaction so
 * product writes and category creation stay atomic.
 */
export async function resolveId(client: PoolClient, name: unknown): Promise<string | null> {
  if (typeof name !== "string" || !name.trim()) return null;
  const clean = name.trim();
  const res = await client.query(
    `INSERT INTO categories (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
     RETURNING id`,
    [clean, slugify(clean)],
  );
  return res.rows[0]?.id ?? null;
}
