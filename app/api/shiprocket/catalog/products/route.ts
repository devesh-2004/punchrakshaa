import { z } from "zod";
import * as productsRepo from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

interface ShiprocketShiprocketPackOption {
  _id?: { toString(): string };
  label: string;
  price?: number;
  stock?: number | null;
  sku?: string;
  image?: string;
}

interface ShiprocketProductDoc {
  _id: { toString(): string };
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  inStock: boolean;
  updatedAt: string;
  category?: string;
  images?: { url: string }[];
  packOptions?: ShiprocketShiprocketPackOption[];
  productDetails?: { brand?: string };
}

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-catalog-products", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = querySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const skip = (page - 1) * limit;
    const products = (await productsRepo.find({ isArchived: false }, { skip, limit })) as unknown as ShiprocketProductDoc[];

    const shiprocketProducts = products.map((p) => {
      const variants =
        p.packOptions && p.packOptions.length > 0
          ? p.packOptions.map((pack, index) => {
              const hasStock = pack.stock !== null && pack.stock !== undefined;
              const fallbackQty = p.inStock ? 100 : 0;
              const stockQty = hasStock ? Number(pack.stock) : fallbackQty;
              return {
                id: pack._id ? pack._id.toString() : `${p._id.toString()}-variant-${index}`,
                title: pack.label,
                price: String(pack.price ?? p.discountedPrice ?? p.price),
                quantity: stockQty,
                sku: pack.sku ?? `${p.slug}-${index}`,
                updated_at: p.updatedAt,
                image: { src: pack.image ?? p.images?.[0]?.url ?? "" },
                weight: 0.5,
              };
            })
          : [
              {
                id: p._id.toString(),
                title: "Default Title",
                price: String(p.discountedPrice ?? p.price),
                quantity: p.inStock ? 100 : 0,
                sku: p.slug,
                updated_at: p.updatedAt,
                image: { src: p.images?.[0]?.url ?? "" },
                weight: 0.5,
              },
            ];

      return {
        id: p._id.toString(),
        title: p.name,
        body_html: p.description ?? "",
        vendor: p.productDetails?.brand ?? "PunchRaksha",
        product_type: p.category ?? "Health Supplement",
        updated_at: p.updatedAt,
        status: p.inStock ? "active" : "draft",
        image: { src: p.images?.[0]?.url ?? "" },
        variants,
      };
    });

    return jsonOk(shiprocketProducts);
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    console.error("Products Sync API Error:", err);
    return jsonBad((err as Error).message, 500);
  }
}
