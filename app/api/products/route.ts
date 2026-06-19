import { z } from "zod";
import * as products from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "products-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const parsed = z
      .object({
        slug: z.string().trim().optional(),
        limit: z.coerce.number().int().min(1).max(50).optional(),
        upsell: z.enum(["true", "false"]).optional(),
      })
      .parse({
        slug: searchParams.get("slug") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        upsell: searchParams.get("upsell") ?? undefined,
      });

    if (parsed.slug) {
      const doc = await products.findBySlug(parsed.slug);
      if (!doc) return jsonBad("Product not found", 404);
      return jsonOk({ product: doc });
    }

    const limit = parsed.limit ?? 20;
    const filter: Record<string, unknown> = { inStock: true, isArchived: { $ne: true } };
    if (parsed.upsell === "true") filter.isUpsellProduct = true;
    const docs = await products.find(filter, { limit });
    return jsonOk({ products: docs });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

