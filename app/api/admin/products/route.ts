import { requireAdmin } from "@/lib/utils/adminAuth";
import * as products from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
// GET all products (including out of stock)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const docs = await products.find({}, { sort: { createdAt: -1 } });
    return jsonOk({ products: docs });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

// POST new product
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    // Check slug uniqueness
    const existing = await products.findBySlug(body.slug);
    if (existing) return jsonBad("Product with this slug already exists", 400);

    const product = await products.create(body);

    await recordAdminAudit(req, admin, {
      action: "product.create",
      entityType: "product",
      entityId: String(product._id),
      newValues: { slug: product.slug, name: product.name },
    });

    revalidatePath("/");
    revalidatePath("/all-products");

    return jsonOk({ product });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
