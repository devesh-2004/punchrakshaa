import { z } from "zod";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { jsonOk } from "@/lib/utils/api";

const cartItemSchema = z.object({
  variant_id: z.string().optional(),
  name: z.string().optional().default(""),
  price: z.coerce.number().optional().default(0),
  quantity: z.coerce.number().int().optional().default(1),
  image: z.string().optional().default(""),
  title: z.string().optional().default(""),
});

const webhookSchema = z.object({
  order_id: z.union([z.string(), z.number()]).optional(),
  cart_data: z.object({ items: z.array(cartItemSchema).optional() }).optional(),
  status: z.string(),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  payment_type: z.string().optional().default(""),
  total_amount_payable: z.coerce.number().optional().default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = webhookSchema.parse(body);

    if (input.status !== "SUCCESS") {
      return jsonOk({ message: "Ignored non-success status" });
    }

    const internalItems = (input.cart_data?.items ?? []).map((item) => ({
      productId: item.variant_id ?? "",
      name: item.name,
      price: item.price,
      qty: item.quantity,
      image: item.image,
      packLabel: item.title,
    }));

    const newOrder = await ordersRepo.create({
      userId: null,
      guestPhone: input.phone,
      guestEmail: input.email,
      shiprocketOrderId: input.order_id ? String(input.order_id) : "",
      items: internalItems,
      total: input.total_amount_payable,
      subtotal: input.total_amount_payable,
      paymentMethod: input.payment_type === "CASH_ON_DELIVERY" ? "COD" : "Prepaid",
      status: "processing",
      shippingAddress: {},
    });

    return jsonOk({ success: true, internal_id: newOrder?._id });
  } catch (err) {
    console.error("Order Webhook Error:", err);
    // Always 200 to prevent Shiprocket retries
    return jsonOk({ error: (err as Error).message });
  }
}
