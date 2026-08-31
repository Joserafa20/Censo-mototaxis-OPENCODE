import type { DataSource, Repository } from "typeorm";
import { AuditLogEntity } from "../database/entities/AuditLogEntity.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { AuditLog } from "../../domain/entities/AuditLog.js";

export class TypeormAuditLogRepository implements IAuditLogRepository {
  private repo: Repository<AuditLogEntity>;
  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(AuditLogEntity);
  }

  async save(entry: AuditLog): Promise<void> {
    const entity = this.repo.create({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      timestamp: entry.timestamp,
      before: entry.before,
      after: entry.after,
      ip: entry.ip,
    });
    await this.repo.save(entity);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const rows = await this.repo.find({
      where: { entityType, entityId },
      order: { timestamp: "ASC" },
    });
    return rows.map(this.toDomain);
  }

  async findTimeline(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.findByEntity(entityType, entityId);
  }

  private toDomain(e: AuditLogEntity): AuditLog {
    return {
      id: e.id,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action as AuditLog["action"],
      actorId: e.actorId,
      actorRole: e.actorRole,
      timestamp: e.timestamp,
      before: e.before,
      after: e.after,
      ip: e.ip,
    };
  }
}
