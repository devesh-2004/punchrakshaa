/**
 * Apply scripts/schema.sql to the Postgres database in DATABASE_URL.
 * Usage: npx tsx scripts/apply-schema.ts
 */
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(join(process.cwd(), "scripts", "schema.sql"), "utf8");
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL!);
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected. Applying schema…");
  await client.query(sql);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
  );
  await client.end();
  console.log("✅ Schema applied. Tables:");
  for (const r of rows) console.log("   -", r.table_name);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
