import { requireAdmin } from "@/lib/utils/adminAuth";
import * as ordersRepo from "@/lib/repositories/order.repository";
import * as statusHistoryRepo from "@/lib/repositories/orderStatusHistory.repository";
import * as paymentTxRepo from "@/lib/repositories/paymentTransaction.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const order = await ordersRepo.findById(params.id);
    if (!order) return jsonBad("Not Found", 404);

    // Additive audit context (backward compatible — existing clients ignore these).
    const [statusHistory, paymentTransactions] = await Promise.all([
      statusHistoryRepo.listByOrder(params.id),
      paymentTxRepo.listByOrder(params.id),
    ]);

    return jsonOk({ order, statusHistory, paymentTransactions });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    // Admin can update status and tracking details
    const order = await ordersRepo.updateById(params.id, { status: body.status });

    if (!order) return jsonBad("Not Found", 404);

    await recordAdminAudit(req, admin, {
      action: "order.status_change",
      entityType: "order",
      entityId: params.id,
      newValues: { status: body.status },
    });

    return jsonOk({ order });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
