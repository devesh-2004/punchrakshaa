/**
 * Shared helpers for mapping Postgres rows → lean "documents" that match the
 * shape the app previously consumed from Mongoose `.lean()` (camelCase fields,
 * a string `_id`, JS numbers for money, Date objects for timestamps).
 */

/** Parse a Postgres NUMERIC (returned as string) into a JS number. */
export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Normalize a timestamp column into a Date (or undefined). */
export function date(v: unknown): Date | undefined {
  if (!v) return undefined;
  return v instanceof Date ? v : new Date(v as string);
}

/** Build an ISO sort clause safely from an allow-list of columns. */
export function sortClause(
  sort: Record<string, 1 | -1> | undefined,
  allowed: Record<string, string>,
  fallback: string,
): string {
  if (!sort) return fallback;
  const parts: string[] = [];
  for (const [key, dir] of Object.entries(sort)) {
    const col = allowed[key];
    if (col) parts.push(`${col} ${dir === -1 ? "DESC" : "ASC"}`);
  }
  return parts.length ? `ORDER BY ${parts.join(", ")}` : fallback;
}

/** Lean shape returned by every repository read. */
export type Lean<T> = T & { _id: string; createdAt?: Date; updatedAt?: Date };
