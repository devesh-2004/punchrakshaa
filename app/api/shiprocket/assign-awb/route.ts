import { z } from "zod";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { ShiprocketService } from "@/lib/shiprocket/shiprocketService";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/utils/adminAuth";

const schema = z.object({
  orderId: z.string().trim().min(1),
  courierId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-assign-awb", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const admin = await requireAdmin();
  if (!admin) return jsonBad("Unauthorized", 401);

  try {
    const body = await req.json();
    const input = schema.parse(body);

    const order = await ordersRepo.findById(input.orderId);
    if (!order?.shiprocketShipmentId) {
      return jsonBad("Shipment ID not found for this order", 404);
    }

    const response = await ShiprocketService.assignAWB(
      Number(order.shiprocketShipmentId),
      input.courierId,
    );

    const awbCode = response.response.data.awb_code;
    await ordersRepo.updateById(String(order._id), {
      awbCode,
      courierName: response.response.data.courier_name,
      status: "processing",
    });

    return jsonOk({ success: true, awb: awbCode });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    console.error("Assign AWB Error:", err);
    return jsonBad((err as Error).message, 500);
  }
}
