import type { Repository } from "typeorm";
import type { ICensusAuditRepository } from "../../domain/repositories/ICensusAuditRepository.js";
import { CensusAuditEntity } from "../database/entities/CensusAuditEntity.js";

export class TypeormCensusAuditRepository implements ICensusAuditRepository {
  constructor(private readonly repo: Repository<CensusAuditEntity>) {}

  async log(entry: {
    entityType: "census_record";
    entityId: string;
    action: "created" | "updated" | "deactivated";
    actorUserId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const entity = new CensusAuditEntity();
    entity.id = `ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    entity.entityType = entry.entityType;
    entity.entityId = entry.entityId;
    entity.action = entry.action;
    entity.actorUserId = entry.actorUserId;
    entity.details = entry.details ?? null;
    await this.repo.save(entity);
  }
}
