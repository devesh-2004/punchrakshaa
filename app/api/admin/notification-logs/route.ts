import { requireAdmin } from "@/lib/utils/adminAuth";
import * as notificationRepo from "@/lib/repositories/notificationLog.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

// GET ?channel=&status=&limit= — recent notification log entries, newest first.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const sp = new URL(req.url).searchParams;
    const channelRaw = sp.get("channel");
    const statusRaw = sp.get("status");
    const channel = (notificationRepo.NOTIFICATION_CHANNELS as readonly string[]).includes(channelRaw ?? "")
      ? (channelRaw as any)
      : undefined;
    const status = (notificationRepo.NOTIFICATION_STATUSES as readonly string[]).includes(statusRaw ?? "")
      ? (statusRaw as any)
      : undefined;
    const limit = Math.min(parseInt(sp.get("limit") || "100", 10) || 100, 500);

    const logs = await notificationRepo.list({ channel, status }, { limit });
    return jsonOk({ logs });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
