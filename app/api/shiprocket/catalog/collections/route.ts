import { z } from "zod";
import * as productsRepo from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-collections", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = querySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const categories = await productsRepo.distinctCategories();
    const start = (page - 1) * limit;
    const paginatedCategories = categories.slice(start, start + limit);

    const shiprocketCollections = paginatedCategories.map((cat: string) => ({
      id: `col-${Buffer.from(cat).toString("base64").substring(0, 8)}`,
      title: cat || "General",
      body_html: `<p>Collection of ${cat || "General"} products</p>`,
      updated_at: new Date().toISOString(),
      image: { src: "" },
    }));

    return jsonOk(shiprocketCollections);
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    console.error("Collections Sync API Error:", err);
    return jsonBad((err as Error).message, 500);
  }
}
