/**
 * Ensure monthly `orders` partitions exist for the current month and the next
 * N months (default 3). Idempotent — safe to run repeatedly.
 *
 * Intended to run on a monthly schedule (cron / the project scheduler) so that
 * a partition always exists before any order for that month arrives. The
 * `orders_default` partition is a safety net if this job is ever missed.
 *
 * Usage:
 *   npx tsx scripts/ensure-order-partitions.ts            # current + next 3 months
 *   npx tsx scripts/ensure-order-partitions.ts 6          # current + next 6 months
 *
 * Example crontab (1st of every month, 00:05):
 *   5 0 1 * * cd /path/to/app && npx tsx scripts/ensure-order-partitions.ts >> /var/log/order-partitions.log 2>&1
 */
import * as dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env / .env.local");
  process.exit(1);
}

const monthsAhead = Math.max(0, parseInt(process.argv[2] || "3", 10) || 3);

async function main() {
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL!);
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  // Verify the helper exists (i.e. migration 005 has been applied).
  const fn = await client.query(
    `SELECT 1 FROM pg_proc WHERE proname = 'ensure_orders_partition' LIMIT 1`,
  );
  if (!fn.rowCount) {
    await client.end();
    console.error("❌ ensure_orders_partition() not found — apply migration 005 first.");
    process.exit(1);
  }

  const now = new Date();
  for (let i = 0; i <= monthsAhead; i++) {
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const iso = target.toISOString().slice(0, 10); // YYYY-MM-01
    await client.query(`SELECT ensure_orders_partition($1::date)`, [iso]);
    console.log(`   ✓ ensured partition for ${iso.slice(0, 7)}`);
  }

  // Report the current partition set.
  const parts = await client.query(
    `SELECT inhrelid::regclass::text AS partition
     FROM pg_inherits WHERE inhparent = 'orders'::regclass
     ORDER BY 1`,
  );
  await client.end();
  console.log(`✅ orders partitions (${parts.rowCount}):`);
  for (const r of parts.rows) console.log("   -", r.partition);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
