import { requireAdmin } from "@/lib/utils/adminAuth";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { buildKey, isAllowedImage, uploadToR2, MAX_UPLOAD_BYTES } from "@/lib/r2/client";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const limited = rateLimit(req, { key: "admin-upload", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Optional logical folder: products | blogs | content | misc
    const prefix = (formData.get("prefix") as string | null) || "misc";

    if (!file) {
      return jsonBad("No file uploaded", 400);
    }
    if (!isAllowedImage(file.type)) {
      return jsonBad("Unsupported file type", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonBad("File too large (max 8MB)", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildKey(file.name, prefix);
    const url = await uploadToR2(buffer, key, file.type);

    return jsonOk({ url });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
