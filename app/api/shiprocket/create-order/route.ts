import { z } from "zod";
import * as ordersRepo from "@/lib/repositories/order.repository";
import { ShiprocketService } from "@/lib/shiprocket/shiprocketService";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema, phoneSchema } from "@/lib/utils/validators";

const orderItemSchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.coerce.number().min(0),
  qty: z.coerce.number().int().min(1),
  packLabel: z.string().trim().optional().default(""),
  image: z.string().trim().optional().default(""),
});

const bodySchema = z.object({
  items: z.array(orderItemSchema).min(1),
  shippingAddress: addressSchema,
  subtotal: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional().default(0),
  couponCode: z.string().trim().optional().default(""),
  paymentMethod: z.enum(["COD", "Prepaid"]),
  guestEmail: z.union([z.email(), z.literal("")]).optional().default(""),
  guestPhone: z.union([phoneSchema, z.literal("")]).optional().default(""),
  userId: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-create-order", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const input = bodySchema.parse(body);

    const newOrder = await ordersRepo.create({
      userId: input.userId ?? null,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone || input.shippingAddress.phone,
      items: input.items,
      shippingAddress: input.shippingAddress,
      subtotal: input.subtotal,
      total: input.total,
      discount: input.discount,
      couponCode: input.couponCode,
      status: "pending",
      paymentMethod: input.paymentMethod,
    });

    const orderItems = input.items.map((item) => ({
      name: item.name + (item.packLabel ? ` (${item.packLabel})` : ""),
      sku: item.productId,
      units: item.qty,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: "",
    }));

    const addr = input.shippingAddress;
    const nameParts = addr.fullName.split(" ");
    const shiprocketPayload = {
      order_id: String(newOrder._id),
      order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      channel_id: "",
      comment: "PunchRaksha App Order",
      billing_customer_name: nameParts[0],
      billing_last_name: nameParts.slice(1).join(" ") || " ",
      billing_address: addr.addressLine1,
      billing_address_2: addr.addressLine2 ?? "",
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: addr.state,
      billing_country: "India",
      billing_email: input.guestEmail || "notifications@punchraksha.com",
      billing_phone: addr.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: input.paymentMethod === "COD" ? "COD" : "Prepaid",
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: input.discount,
      sub_total: input.total,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    try {
      const sr = await ShiprocketService.createAdhocOrder(shiprocketPayload);
      await ordersRepo.updateById(String(newOrder._id), {
        shiprocketOrderId: sr.order_id,
        shiprocketShipmentId: sr.shipment_id,
      });
      return jsonOk({
        success: true,
        orderId: newOrder._id,
        shiprocketOrderId: sr.order_id,
        shiprocketShipmentId: sr.shipment_id,
      });
    } catch (srErr) {
      console.error("Shiprocket integration failed but order saved locally:", srErr);
      return jsonOk({
        success: true,
        orderId: newOrder._id,
        warning: "Shiprocket sync failed. Admin must sync manually.",
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    console.error("Create Order Error:", err);
    return jsonBad((err as Error).message, 500);
  }
}
