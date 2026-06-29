import { requireAdmin } from "@/lib/utils/adminAuth";
import * as reviewsRepo from "@/lib/repositories/review.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const filter: Record<string, any> = {};
    if (status !== "all") filter.status = status;

    const [reviews, total, pendingCount] = await Promise.all([
      reviewsRepo.findWithProduct(filter, { skip: (page - 1) * limit, limit, includePhone: true }),
      reviewsRepo.countDocuments(filter),
      reviewsRepo.countDocuments({ status: "pending" }),
    ]);

    return jsonOk({ reviews, total, pendingCount, page, limit });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();
    const { productId, guestName, guestPhone, rating, title, reviewBody, isVerified, createdAt } = body;

    if (!productId || !rating || !reviewBody || !guestName) {
      return jsonBad("Missing required fields", 400);
    }

    const review = await reviewsRepo.create({
      productId,
      guestName,
      guestPhone: guestPhone || "",
      rating,
      title: title || "",
      body: reviewBody,
      status: "approved",
      addedByAdmin: true,
      isVerified: isVerified !== false,
      createdAt: createdAt ? new Date(createdAt) : undefined,
    });

    await recordAdminAudit(req, admin, {
      action: "review.create",
      entityType: "review",
      entityId: String(review._id),
      newValues: { productId, rating, status: "approved" },
    });
    return jsonOk({ review }, { status: 201 });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
