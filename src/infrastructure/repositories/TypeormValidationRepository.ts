import type { Repository } from "typeorm";
import type { IValidationRepository } from "../../domain/repositories/IValidationRepository.js";
import type { CensusValidation } from "../../domain/entities/CensusValidation.js";
import { CensusValidationEntity } from "../database/entities/CensusValidationEntity.js";

export class TypeormValidationRepository implements IValidationRepository {
  constructor(private readonly repo: Repository<CensusValidationEntity>) {}

  async save(validation: CensusValidation): Promise<void> {
    const e = new CensusValidationEntity();
    e.id = validation.id;
    e.censusRecordId = validation.censusRecordId;
    e.periodId = validation.periodId;
    e.fromStatus = validation.fromStatus;
    e.toStatus = validation.toStatus;
    e.actorUserId = validation.actorUserId;
    e.actorRole = validation.actorRole;
    e.reason = validation.reason;
    e.metadata = validation.metadata;
    e.createdAt = validation.createdAt;
    await this.repo.save(e);
  }

  async findByRecordId(censusRecordId: string): Promise<CensusValidation[]> {
    const entities = await this.repo.find({
      where: { censusRecordId },
      order: { createdAt: "ASC" },
    });
    return entities.map(this.toDomain);
  }

  async findByPeriodId(periodId: string): Promise<CensusValidation[]> {
    const entities = await this.repo.find({
      where: { periodId },
      order: { createdAt: "ASC" },
    });
    return entities.map(this.toDomain);
  }

  private toDomain(e: CensusValidationEntity): CensusValidation {
    return {
      id: e.id,
      censusRecordId: e.censusRecordId,
      periodId: e.periodId,
      fromStatus: e.fromStatus as any,
      toStatus: e.toStatus as any,
      actorUserId: e.actorUserId,
      actorRole: e.actorRole,
      reason: e.reason,
      metadata: e.metadata,
      createdAt: e.createdAt,
    };
  }
}
