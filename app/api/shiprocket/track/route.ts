import { z } from "zod";
import { ShiprocketService } from "@/lib/shiprocket/shiprocketService";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "shiprocket-track", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const awb = z.string().trim().min(1, "AWB code required").parse(searchParams.get("awb") ?? "");
    const trackingData = await ShiprocketService.trackShipment(awb);
    return jsonOk(trackingData);
  } catch (err) {
    if (err instanceof z.ZodError) return jsonBad(err.issues[0].message, 400);
    return jsonBad((err as Error).message, 500);
  }
}
