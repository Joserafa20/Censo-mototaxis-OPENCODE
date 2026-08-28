/**
 * Repository adapter: TypeormStationAgentRepository
 *
 * Implements IStationAgentRepository using TypeORM.
 * Maps between domain StationAgent entities and TypeORM StationAgentEntity records.
 */

import { type Repository, IsNull } from "typeorm";
import type { IStationAgentRepository } from "../../domain/repositories/IStationAgentRepository.js";
import type { StationAgent } from "../../domain/entities/StationAgent.js";
import { StationAgentEntity } from "../database/entities/StationAgentEntity.js";

export class TypeormStationAgentRepository implements IStationAgentRepository {
  constructor(private readonly repo: Repository<StationAgentEntity>) {}

  async findById(id: string): Promise<StationAgent | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByCensusRecordId(censusRecordId: string): Promise<StationAgent | null> {
    const entity = await this.repo.findOneBy({
      censusRecordId,
      unassignedAt: IsNull(),
    } as any);
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByStationId(stationId: string): Promise<StationAgent[]> {
    const entities = await this.repo.findBy({
      stationId,
      unassignedAt: IsNull(),
    } as any);
    return entities.map(this.toDomain);
  }

  async findAllByStationId(stationId: string): Promise<StationAgent[]> {
    const entities = await this.repo.findBy({ stationId });
    return entities.map(this.toDomain);
  }

  async save(agent: StationAgent): Promise<void> {
    const entity = this.toEntity(agent);
    await this.repo.save(entity);
  }

  async unassignById(id: string): Promise<void> {
    await this.repo.update(id, {
      unassignedAt: new Date(),
    });
  }

  async unassignAllByStationId(stationId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(StationAgentEntity)
      .set({ unassignedAt: new Date() })
      .where("stationId = :stationId", { stationId })
      .andWhere("unassignedAt IS NULL")
      .execute();
  }

  async countActiveByStationId(stationId: string): Promise<number> {
    return this.repo.countBy({
      stationId,
      unassignedAt: IsNull(),
    } as any);
  }

  async hasActiveAssignment(censusRecordId: string): Promise<boolean> {
    const count = await this.repo.countBy({
      censusRecordId,
      unassignedAt: IsNull(),
    } as any);
    return count > 0;
  }

  private toDomain(entity: StationAgentEntity): StationAgent {
    return {
      id: entity.id,
      stationId: entity.stationId,
      censusRecordId: entity.censusRecordId,
      assignedAt: entity.assignedAt,
      unassignedAt: entity.unassignedAt,
    };
  }

  private toEntity(agent: StationAgent): StationAgentEntity {
    const entity = new StationAgentEntity();
    entity.id = agent.id;
    entity.stationId = agent.stationId;
    entity.censusRecordId = agent.censusRecordId;
    entity.unassignedAt = agent.unassignedAt;
    return entity;
  }
}
