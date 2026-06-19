import { z } from "zod";
import * as blogsRepo from "@/lib/repositories/blog.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "blog-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const parsed = z
      .object({
        slug: z.string().trim().optional(),
        tag: z.string().trim().optional(),
        limit: z.coerce.number().int().min(1).max(50).optional(),
      })
      .parse({
        slug: searchParams.get("slug") ?? undefined,
        tag: searchParams.get("tag") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      });

    if (parsed.slug) {
      const doc = await blogsRepo.findBySlug(parsed.slug);
      if (!doc) return jsonBad("Blog not found", 404);
      return jsonOk({ blog: doc });
    }

    const limit = parsed.limit ?? 20;
    const docs = await blogsRepo.find(parsed.tag ? { tags: parsed.tag } : {}, { limit });
    return jsonOk({ posts: docs });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

