import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (and R2_PUBLIC_BASE_URL).",
    );
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export function isAllowedImage(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

/** Build a stable, collision-resistant object key under a logical prefix. */
export function buildKey(originalName: string, prefix = "misc"): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const safe = originalName.replace(/[^a-zA-Z0-9.\-]/g, "").slice(-80) || "file";
  return `${prefix}/${yyyy}/${mm}/${crypto.randomUUID()}-${safe}`;
}

/** Upload a buffer to R2 and return its public URL. */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL is not set");
  }
  return `${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

/** Delete an object from R2 given its public URL or key. */
export async function deleteFromR2(urlOrKey: string): Promise<void> {
  let key = urlOrKey;
  if (R2_PUBLIC_BASE_URL && urlOrKey.startsWith(R2_PUBLIC_BASE_URL)) {
    key = urlOrKey.slice(R2_PUBLIC_BASE_URL.replace(/\/$/, "").length + 1);
  }
  await getClient().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
