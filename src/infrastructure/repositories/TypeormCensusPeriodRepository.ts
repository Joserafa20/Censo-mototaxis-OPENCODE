/**
 * Repository adapter: TypeormCensusPeriodRepository
 *
 * Implements ICensusPeriodRepository using TypeORM and PostgreSQL.
 * Maps between domain CensusPeriod entities and TypeORM CensusPeriodEntity records.
 */

import { type Repository } from "typeorm";
import type { ICensusPeriodRepository, CensusPeriodListFilters, CensusPeriodListOptions } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { CensusPeriod } from "../../domain/entities/CensusPeriod.js";
import { CensusPeriodEntity } from "../database/entities/CensusPeriodEntity.js";

export class TypeormCensusPeriodRepository implements ICensusPeriodRepository {
  constructor(private readonly repo: Repository<CensusPeriodEntity>) {}

  async findById(id: string): Promise<CensusPeriod | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<CensusPeriod | null> {
    const entity = await this.repo.findOneBy({ name });
    return entity ? this.toDomain(entity) : null;
  }

  async save(period: CensusPeriod): Promise<void> {
    const entity = this.toEntity(period);
    await this.repo.save(entity);
  }

  async findAll(options?: CensusPeriodListOptions): Promise<CensusPeriod[]> {
    const qb = this.repo.createQueryBuilder("period");

    if (options?.filters) {
      const { status, searchTerm } = options.filters;

      if (status !== undefined) {
        qb.andWhere("period.status = :status", { status });
      }

      if (searchTerm) {
        qb.andWhere("period.name ILIKE :term", { term: `%${searchTerm}%` });
      }
    }

    qb.orderBy("period.createdAt", "DESC");

    if (options?.limit) {
      qb.take(options.limit);
    }

    if (options?.offset) {
      qb.skip(options.offset);
    }

    const entities = await qb.getMany();
    return entities.map(this.toDomain);
  }

  async countAll(filters?: CensusPeriodListFilters): Promise<number> {
    const qb = this.repo.createQueryBuilder("period");

    if (filters) {
      const { status, searchTerm } = filters;

      if (status !== undefined) {
        qb.andWhere("period.status = :status", { status });
      }

      if (searchTerm) {
        qb.andWhere("period.name ILIKE :term", { term: `%${searchTerm}%` });
      }
    }

    return qb.getCount();
  }

  async countActive(): Promise<number> {
    return this.repo.count({ where: { status: "ACTIVO" } });
  }

  async hasOverlap(startDate: Date, endDate: Date, excludeId?: string): Promise<boolean> {
    const qb = this.repo.createQueryBuilder("period")
      .where("period.startDate <= :endDate", { endDate })
      .andWhere("period.endDate >= :startDate", { startDate })
      .andWhere("period.status != :excludedStatus", { excludedStatus: "FINALIZADO" });

    if (excludeId) {
      qb.andWhere("period.id != :excludeId", { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  private toDomain(entity: CensusPeriodEntity): CensusPeriod {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(period: CensusPeriod): CensusPeriodEntity {
    const entity = new CensusPeriodEntity();
    entity.id = period.id;
    entity.name = period.name;
    entity.description = period.description;
    entity.startDate = period.startDate;
    entity.endDate = period.endDate;
    entity.status = period.status;
    entity.createdAt = period.createdAt;
    entity.updatedAt = period.updatedAt;
    return entity;
  }
}
