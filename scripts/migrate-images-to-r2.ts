/**
 * One-off data migration: move base64 `data:` image payloads that were
 * backfilled into product_images.url and product_ingredients.image_url over to
 * Cloudflare R2, replacing each value with the public R2 URL.
 *
 * Idempotent — rows whose value is already an http(s) URL (or empty) are
 * skipped, so it is safe to re-run. Run AFTER migration 006:
 *
 *   npx tsx scripts/apply-migration.ts 006_normalize_product_presentational.sql
 *   npx tsx scripts/migrate-images-to-r2.ts
 *
 * Requires R2_* env vars (same ones used by /api/admin/upload).
 */
import * as dotenv from "dotenv";
import { Client } from "pg";

// NOTE: env must be loaded BEFORE lib/r2/client is imported — that module reads
// process.env.R2_* at import time. We therefore import it dynamically in main().
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type R2 = typeof import("../lib/r2/client");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env / .env.local");
  process.exit(1);
}
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) {
  if (!process.env[k]) {
    console.error(`❌ ${k} is not set — configure Cloudflare R2 before running this migration.`);
    process.exit(1);
  }
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/avif": "avif", "image/svg+xml": "svg", "image/gif": "gif",
};

/** Parse a base64 data URI; returns null if the value is not a data URI. */
function parseDataUri(value: string): { buffer: Buffer; mime: string } | null {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(value || "");
  if (!m) return null;
  return { buffer: Buffer.from(m[2], "base64"), mime: m[1] };
}

async function migrateColumn(
  client: Client,
  r2: R2,
  table: string,
  column: string,
): Promise<{ migrated: number; skipped: number; failed: number }> {
  const { uploadToR2, buildKey, isAllowedImage } = r2;
  const { rows } = await client.query(
    `SELECT id, ${column} AS val FROM ${table} WHERE ${column} LIKE 'data:%'`,
  );
  let migrated = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    const parsed = parseDataUri(row.val);
    if (!parsed) { skipped++; continue; }
    if (!isAllowedImage(parsed.mime)) {
      console.warn(`   ⚠ ${table}#${row.id}: unsupported mime ${parsed.mime} — skipped`);
      skipped++;
      continue;
    }
    try {
      const ext = EXT_BY_MIME[parsed.mime] ?? "img";
      const key = buildKey(`${table.replace("product_", "")}.${ext}`, "products");
      const url = await uploadToR2(parsed.buffer, key, parsed.mime);
      await client.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [url, row.id]);
      migrated++;
      console.log(`   ✓ ${table}#${row.id} → ${url}`);
    } catch (err: any) {
      failed++;
      console.error(`   ✗ ${table}#${row.id}: ${err.message}`);
    }
  }
  return { migrated, skipped, failed };
}

async function main() {
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL!);
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  const r2: R2 = await import("../lib/r2/client"); // imported after dotenv
  console.log("Connected. Migrating base64 images to Cloudflare R2 …");

  console.log("→ product_images.url");
  const a = await migrateColumn(client, r2, "product_images", "url");
  console.log("→ product_ingredients.image_url");
  const b = await migrateColumn(client, r2, "product_ingredients", "image_url");

  await client.end();
  console.log(
    `✅ Done. images: ${a.migrated} migrated / ${a.skipped} skipped / ${a.failed} failed; ` +
    `ingredients: ${b.migrated} migrated / ${b.skipped} skipped / ${b.failed} failed.`,
  );
  if (a.failed + b.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
