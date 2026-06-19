import * as auditRepo from "@/lib/repositories/auditLog.repository";

/** Best-effort actor identity from whatever requireAdmin() returned. */
function actorIdOf(admin: Record<string, unknown> | null): string {
  if (!admin) return "";
  const id = admin._id ?? admin.email ?? "";
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
}

/** Extract the client IP from common proxy headers (CloudFront / Amplify). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

export type AuditEntry = {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

/**
 * Record an administrative action. Best-effort: any failure is logged and
 * swallowed so audit logging can never affect the admin request's outcome.
 */
export async function recordAdminAudit(req: Request, admin: Record<string, unknown> | null, entry: AuditEntry): Promise<void> {
  try {
    await auditRepo.record({
      actorId: actorIdOf(admin),
      actorType: "admin",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues: entry.oldValues ?? null,
      newValues: entry.newValues ?? null,
      ipAddress: getClientIp(req),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to record:", e);
  }
}
