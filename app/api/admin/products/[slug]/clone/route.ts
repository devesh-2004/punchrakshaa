import { requireAdmin } from "@/lib/utils/adminAuth";
import * as products from "@/lib/repositories/product.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    // 1. Authenticate Admin
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    // 2. Find Source Product
    const source = await products.findBySlug(params.slug);
    if (!source) return jsonBad("Source product not found", 404);

    // 3. Prepare Cloned Data
    const timestamp = Date.now();
    const newName = `${source.name} (Copy)`;
    const newSlug = `${source.slug}-copy-${timestamp}`;

    // Strip identity / metric fields that should not be copied directly
    const {
      _id,
      id,
      createdAt,
      updatedAt,
      overallRating,
      totalReviews,
      customerReviews, // reset any aggregated review data
      ...clonedFields
    } = source as any;

    // 4. Create New Product (draft/archived, metrics reset)
    await products.create({
      ...clonedFields,
      name: newName,
      slug: newSlug,
      isArchived: true,
      isBestSelling: false,
      overallRating: 0,
      totalReviews: 0,
    });

    await recordAdminAudit(req, admin, {
      action: "product.clone",
      entityType: "product",
      entityId: newSlug,
      oldValues: { sourceSlug: params.slug },
      newValues: { slug: newSlug },
    });

    return jsonOk({
      success: true,
      newSlug,
      message: "Product cloned successfully",
    });
  } catch (err) {
    console.error("Clone Error:", err);
    return jsonBad((err as Error).message || "Failed to clone product", 500);
  }
}
