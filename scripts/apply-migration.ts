/**
 * Apply a single SQL migration file from scripts/migrations to the database in
 * DATABASE_URL.
 *
 * Usage: npx tsx scripts/apply-migration.ts 001_normalize_product_relations.sql
 *
 * The migration file is responsible for its own transaction control
 * (BEGIN/COMMIT), so this runner just streams the file to Postgres.
 */
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env / .env.local");
  process.exit(1);
}

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("❌ Usage: npx tsx scripts/apply-migration.ts <file.sql>");
  process.exit(1);
}

async function main() {
  const path = join(process.cwd(), "scripts", "migrations", fileArg);
  const sql = readFileSync(path, "utf8");
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL!);
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`Connected. Applying migration: ${fileArg} …`);
  await client.query(sql);
  await client.end();
  console.log("✅ Migration applied successfully.");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
