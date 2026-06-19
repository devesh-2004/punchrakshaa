/**
 * Repair broken/empty image references in the DB — blogs covers, products with
 * zero images, and video testimonials. New raster placeholders are uploaded to
 * Cloudflare R2 (URL only, no base64) via the existing pipeline. Existing valid
 * (http/R2) images are NEVER touched.
 *
 *   node scripts/repair-db-images.js
 */
const dotenv = require("dotenv");
const sharp = require("sharp");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const G = require("./_placeholderLib");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

// Inline R2 upload (mirrors lib/r2/client.ts) so this CommonJS script needs no
// TS resolution. Reads env at call time — after dotenv has loaded.
function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("Cloudflare R2 is not configured (R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET).");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}
function buildKey(name, prefix) {
  const d = new Date();
  const safe = name.replace(/[^a-zA-Z0-9.\-]/g, "").slice(-80) || "file";
  return `${prefix}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}-${safe}`;
}
async function uploadToR2(buffer, key, contentType) {
  await r2().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_BASE_URL is not set");
  return `${base}/${key}`;
}

// Parse a YouTube video id from a full URL or a bare id.
function youTubeId(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/(?:shorts\/|watch\?v=|youtu\.be\/|embed\/|\/v\/)([A-Za-z0-9_-]{11})/) ||
            s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

async function main() {
  const { Client } = require("pg");
  const sharpToR2 = async (svg, prefix, name) => {
    const buf = await sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer();
    return uploadToR2(buf, buildKey(`${name}.webp`, prefix), "image/webp");
  };

  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  const client = new Client({ connectionString: DATABASE_URL, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  const log = [];

  // 1. BLOGS — cover empty or a local /uploads path (broken). Keep http/R2 as-is.
  const blogs = (await client.query(
    `SELECT id, slug, title, cover_image FROM blogs
     WHERE deleted_at IS NULL AND (coalesce(cover_image,'')='' OR cover_image LIKE '/%')`,
  )).rows;
  for (const b of blogs) {
    const url = await sharpToR2(G.blogCover(b.title || b.slug), "blogs", `cover-${b.slug}`);
    await client.query(`UPDATE blogs SET cover_image=$1, updated_at=now() WHERE id=$2`, [url, b.id]);
    log.push(`blog "${b.slug}"  ${b.cover_image || "(empty)"} -> ${url}`);
  }

  // 2. PRODUCTS with zero gallery images — add one primary placeholder.
  const noImg = (await client.query(
    `SELECT p.id, p.slug, p.name FROM products p
     WHERE p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id)`,
  )).rows;
  for (const p of noImg) {
    const url = await sharpToR2(G.product(p.name || p.slug), "products", `primary-${p.slug.replace(/[^a-z0-9]/gi, "")}`);
    await client.query(
      `INSERT INTO product_images (product_id, url, alt_text, filename, position) VALUES ($1,$2,$3,$4,0)`,
      [p.id, url, p.name || p.slug, "placeholder.webp"],
    );
    log.push(`product "${p.slug}"  (0 images) -> primary ${url}`);
  }

  // 2b. PRODUCT_IMAGES pointing at Google Drive links (uc?export=view / file view)
  //     are ORB-blocked by browsers = broken. Replace with an R2 placeholder.
  const driveImgs = (await client.query(
    `SELECT i.id, i.url, p.slug, p.name FROM product_images i JOIN products p ON p.id=i.product_id
     WHERE i.url LIKE '%drive.google.com%'`,
  )).rows;
  for (const r of driveImgs) {
    const url = await sharpToR2(G.product(r.name || r.slug), "products", `primary-${r.slug.replace(/[^a-z0-9]/gi, "")}`);
    await client.query(`UPDATE product_images SET url=$1, filename='placeholder.webp' WHERE id=$2`, [url, r.id]);
    log.push(`product "${r.slug}"  (broken Drive image) -> ${url}`);
  }

  // 3. TESTIMONIALS — broken/empty image but a valid video: use the YouTube thumb.
  const tests = (await client.query(
    `SELECT id, customer_name, image, video_id FROM testimonials
     WHERE deleted_at IS NULL AND (coalesce(image,'')='' OR image LIKE '/%')`,
  )).rows;
  for (const t of tests) {
    const id = youTubeId(t.video_id);
    if (!id) { log.push(`testimonial "${t.customer_name || t.id}"  SKIPPED (no parseable video id)`); continue; }
    const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    await client.query(`UPDATE testimonials SET image=$1, updated_at=now() WHERE id=$2`, [thumb, t.id]);
    log.push(`testimonial "${t.customer_name || t.id}"  ${t.image || "(empty)"} -> ${thumb}`);
  }

  await client.end();
  console.log("Repaired " + log.length + " DB image reference(s):");
  log.forEach((l) => console.log("  " + l));
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
