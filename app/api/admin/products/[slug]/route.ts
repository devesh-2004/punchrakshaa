import { requireAdmin } from "@/lib/utils/adminAuth";
import * as products from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";
import { revalidatePath } from "next/cache";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const product = await products.findBySlug(params.slug);
    if (!product) return jsonBad("Not Found", 404);

    return jsonOk({ product });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    const product = await products.updateBySlug(params.slug, body);

    if (!product) return jsonBad("Not Found", 404);

    await recordAdminAudit(req, admin, {
      action: "product.update",
      entityType: "product",
      entityId: String(product._id),
      newValues: { slug: product.slug, name: product.name },
    });

    // Invalidate caches so frontend shows changes instantly
    revalidatePath("/");
    revalidatePath("/all-products");
    revalidatePath("/product/[slug]", "page");

    return jsonOk({ product });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const ok = await products.deleteBySlug(params.slug);
    if (!ok) return jsonBad("Not Found", 404);

    await recordAdminAudit(req, admin, {
      action: "product.delete",
      entityType: "product",
      entityId: params.slug,
      oldValues: { slug: params.slug },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
