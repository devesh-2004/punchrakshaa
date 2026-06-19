import { requireAdmin } from "@/lib/utils/adminAuth";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const orders = await ordersRepo.find({}, { sort: { createdAt: -1 } });
    return jsonOk({ orders });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
