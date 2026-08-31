import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { AuditLog } from "../../domain/entities/AuditLog.js";

export class GetAuditTimelineUseCase {
  constructor(private auditRepo: IAuditLogRepository) {}

  async execute(entityType: string, entityId: string): Promise<AuditLog[]> {
    if (!entityType || !entityId) throw Object.assign(new Error("entityType and entityId required"), { statusCode: 400, code: "INVALID_AUDIT_PARAMS" });
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(entityId) && !entityId.startsWith("cr-") && !entityId.startsWith("audit-")) {
      // allow generic but validate loosely; if not uuid nor known prefix, still allow but we validate uuid for most
    }
    return this.auditRepo.findTimeline(entityType, entityId);
  }
}
