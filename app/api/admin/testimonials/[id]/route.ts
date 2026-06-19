import { requireAdmin } from "@/lib/utils/adminAuth";
import * as testimonialsRepo from "@/lib/repositories/testimonial.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    const testimonial = await testimonialsRepo.updateById(params.id, body);
    if (!testimonial) return jsonBad("Not found", 404);

    await recordAdminAudit(req, admin, {
      action: "testimonial.update",
      entityType: "testimonial",
      entityId: params.id,
      newValues: body,
    });
    return jsonOk({ testimonial });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const ok = await testimonialsRepo.deleteById(params.id);
    if (!ok) return jsonBad("Not found", 404);

    await recordAdminAudit(req, admin, {
      action: "testimonial.delete",
      entityType: "testimonial",
      entityId: params.id,
    });
    return jsonOk({ success: true });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
