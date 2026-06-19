import { requireAdmin } from "@/lib/utils/adminAuth";
import * as testimonialsRepo from "@/lib/repositories/testimonial.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const testimonials = await testimonialsRepo.find();
    return jsonOk({ testimonials });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const { image, videoId, customerName, isActive } = await req.json();

    if (!image || !videoId) return jsonBad("Image and YouTube Video ID are required", 400);

    const count = await testimonialsRepo.countDocuments();
    const testimonial = await testimonialsRepo.create({
      image,
      videoId: videoId.trim(),
      customerName: customerName || "",
      order: count,
      isActive: isActive !== false,
    });

    await recordAdminAudit(req, admin, {
      action: "testimonial.create",
      entityType: "testimonial",
      entityId: String(testimonial._id),
      newValues: { customerName: testimonial.customerName, videoId: testimonial.videoId },
    });
    return jsonOk({ testimonial }, { status: 201 });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
