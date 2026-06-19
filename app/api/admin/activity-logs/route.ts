import { requireAdmin } from "@/lib/utils/adminAuth";
import * as activityRepo from "@/lib/repositories/customerActivity.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

// GET ?userId=&activityType=&limit= — recent customer activity, newest first.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const sp = new URL(req.url).searchParams;
    const userId = sp.get("userId") || undefined;
    const activityTypeRaw = sp.get("activityType") || undefined;
    const activityType = activityRepo.isActivityType(activityTypeRaw) ? activityTypeRaw : undefined;
    const limit = Math.min(parseInt(sp.get("limit") || "100", 10) || 100, 500);

    const logs = await activityRepo.list({ userId, activityType }, { limit });
    return jsonOk({ logs });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
