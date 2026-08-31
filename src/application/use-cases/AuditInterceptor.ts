import { createAuditLog } from "../../domain/entities/AuditLog.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";

export interface AuditContext {
  entityType: string;
  entityId: string;
  action: "created" | "updated" | "deleted" | "deactivated" | "reactivated" | "approved" | "rejected" | "exported";
  actorId: string;
  actorRole: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
}

export class AuditInterceptor {
  constructor(private auditRepo: IAuditLogRepository) {}

  async record(ctx: AuditContext): Promise<void> {
    const entry = createAuditLog({
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      action: ctx.action as any,
      actorId: ctx.actorId,
      actorRole: ctx.actorRole,
      before: ctx.before ?? null,
      after: ctx.after ?? null,
      ip: ctx.ip ?? null,
      timestamp: new Date(),
    });
    await this.auditRepo.save(entry);
  }
}
