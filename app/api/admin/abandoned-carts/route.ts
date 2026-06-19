import { requireAdmin } from "@/lib/utils/adminAuth";
import * as cartRepo from "@/lib/repositories/cart.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

// GET ?hours=24 — active carts with items that have been inactive for >= hours.
// Foundation only: identifies candidates; no email/recovery is sent.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const hours = parseInt(new URL(req.url).searchParams.get("hours") || "24", 10);
    const carts = await cartRepo.findAbandonedCandidates(Number.isFinite(hours) ? hours : 24);
    return jsonOk({ hours: Number.isFinite(hours) ? hours : 24, carts });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
