import { rows, one } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

export type AuditLogDoc = Lean<{
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string;
}>;

function rowToDoc(row: Record<string, any>): AuditLogDoc {
  return {
    _id: row.id,
    actorId: row.actor_id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValues: row.old_values ?? null,
    newValues: row.new_values ?? null,
    ipAddress: row.ip_address,
    createdAt: date(row.created_at),
  };
}

export type RecordAuditInput = {
  actorId?: string;
  actorType?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string;
};

export async function record(input: RecordAuditInput): Promise<AuditLogDoc> {
  const row = await one(
    `INSERT INTO audit_logs
       (actor_id, actor_type, action, entity_type, entity_id, old_values, new_values, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
     RETURNING *`,
    [
      input.actorId ?? "",
      input.actorType ?? "admin",
      input.action,
      input.entityType ?? "",
      input.entityId ?? "",
      input.oldValues == null ? null : JSON.stringify(input.oldValues),
      input.newValues == null ? null : JSON.stringify(input.newValues),
      input.ipAddress ?? "",
    ],
  );
  return rowToDoc(row!);
}

export async function list(
  filter: { entityType?: string; entityId?: string; actorId?: string } = {},
  opts: { limit?: number } = {},
): Promise<AuditLogDoc[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.entityType) { params.push(filter.entityType); clauses.push(`entity_type = $${params.length}`); }
  if (filter.entityId) { params.push(filter.entityId); clauses.push(`entity_id = $${params.length}`); }
  if (filter.actorId) { params.push(filter.actorId); clauses.push(`actor_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let sql = `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC`;
  if (opts.limit != null) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return (await rows(sql, params)).map(rowToDoc);
}
