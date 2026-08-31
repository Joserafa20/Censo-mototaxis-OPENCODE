import type { AuditLog } from "../entities/AuditLog.js";

export interface IAuditLogRepository {
  save(entry: AuditLog): Promise<void>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findTimeline(entityType: string, entityId: string): Promise<AuditLog[]>;
}
