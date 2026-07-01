import { requireAdmin } from "@/lib/utils/adminAuth";
import * as reviewsRepo from "@/lib/repositories/review.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const { status } = await req.json();

    if (!["approved", "rejected", "pending"].includes(status)) {
      return jsonBad("Invalid status", 400);
    }

    const review = await reviewsRepo.updateById(params.id, {
      status,
      isVerified: status === "approved",
    });

    if (!review) return jsonBad("Review not found", 404);
    // products.overall_rating / total_reviews are maintained by the DB trigger.
    await recordAdminAudit(req, admin, {
      action: "review.moderate",
      entityType: "review",
      entityId: params.id,
      newValues: { status, productId: review.productId },
    });
    return jsonOk({ review });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const review = await reviewsRepo.deleteById(params.id);
    if (!review) return jsonBad("Review not found", 404);
    // Aggregate refresh happens automatically via the reviews trigger.
    await recordAdminAudit(req, admin, {
      action: "review.delete",
      entityType: "review",
      entityId: params.id,
      oldValues: { productId: review.productId, rating: review.rating, status: review.status },
    });
    return jsonOk({ success: true });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
