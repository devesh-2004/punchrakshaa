import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  // Don't throw at import-time so `next build` works without a DB present.
  // Handlers will throw clearly if they actually try to query.
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== "production") console.warn("Missing DATABASE_URL env var");
}

type Cached = { pool: Pool | null };

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Cached | undefined;
}

// In Next.js dev (Fast Refresh), modules re-execute but `global` persists
// across reloads — this prevents a new Pool being created on every HMR cycle.
const cached: Cached = global._pgPool ?? { pool: null };
global._pgPool = cached;

export function getPool(): Pool {
  if (cached.pool) return cached.pool;
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

  // Enable SSL automatically for managed Postgres providers; disable for local.
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  cached.pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 10,
    min: 0,
    idleTimeoutMillis: 30_000,
    // Fail fast when the pool is exhausted — prevents request pileup that
    // drives connection demand beyond what the server allows.
    connectionTimeoutMillis: 10_000,
  });

  // Without this handler, errors on idle pool clients crash the process via
  // an uncaught exception, leaving connections in an unknown state.
  cached.pool.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[pg pool] idle client error:", err.message);
  });

  return cached.pool;
}

/** Run a parameterized query. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as any[]);
}

/** Convenience: return the rows array directly. */
export async function rows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await query<T>(text, params);
  return res.rows;
}

/** Convenience: return the first row or null. */
export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] ?? null;
}

/** Run a function inside a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let txError: unknown;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    txError = err;
    try { await client.query("ROLLBACK"); } catch { /* connection already broken */ }
    throw err;
  } finally {
    // Pass the error so the pool destroys a broken connection rather than
    // recycling it — prevents "too many clients" from leaking bad clients.
    client.release(txError as Error | undefined);
  }
}
