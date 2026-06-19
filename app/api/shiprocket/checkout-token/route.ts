import { z } from "zod";
import crypto from "crypto";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().optional().default("Product"),
  price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().min(1).optional().default(1),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1, "Cart items are required"),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-checkout-token", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { items } = bodySchema.parse(body);

    const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY?.trim();
    const apiSecret = process.env.SHIPROCKET_CHECKOUT_API_SECRET?.trim();
    if (!apiKey || !apiSecret) return jsonBad("Shiprocket credentials missing", 500);

    const payload = {
      cartData: {
        items: items.map((item) => ({
          variantId: String(item.productId),
          name: item.name,
          sellingPrice: item.price,
          mrp: item.mrp ?? item.price,
          quantity: item.quantity,
          discount: 0,
          tax: 0,
        })),
      },
      timestamp: new Date().toISOString(),
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.punchraksha.com"}/`,
    };

    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", apiSecret).update(payloadString).digest("hex");

    const response = await fetch("https://checkout-api.shiprocket.com/api/v1/access-token/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-HMAC-SHA256": hmac,
      },
      body: payloadString,
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      console.error("[Shiprocket] Token error:", JSON.stringify(data));
      const errMsg =
        (data?.error as Record<string, unknown>)?.message as string ||
        data?.message as string ||
        "Failed to generate checkout token";
      return jsonBad(errMsg, response.status);
    }

    const token = (data?.data as Record<string, unknown>)?.token ?? data?.token;
    if (!token) return jsonBad("No token returned from Shiprocket", 500);

    return jsonOk({ token });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    console.error("[Shiprocket] Internal error:", err);
    return jsonBad((err as Error).message || "Internal server error", 500);
  }
}
