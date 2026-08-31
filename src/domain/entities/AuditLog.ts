export type AuditAction = "created" | "updated" | "deleted" | "deactivated" | "reactivated" | "approved" | "rejected" | "exported";

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  timestamp: Date;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
}

export function createAuditLog(
  overrides: Partial<AuditLog> & Pick<AuditLog, "entityType" | "entityId" | "action" | "actorId" | "actorRole">,
): AuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    before: null,
    after: null,
    ip: null,
    ...overrides,
  };
}
