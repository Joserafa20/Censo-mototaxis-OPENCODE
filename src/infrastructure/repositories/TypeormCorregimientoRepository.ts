/**
 * Repository adapter: TypeormCorregimientoRepository
 *
 * Implements ICorregimientoRepository using TypeORM and PostgreSQL.
 * Maps between domain Corregimiento entities and TypeORM CorregimientoEntity records.
 */

import { type Repository, ILike } from "typeorm";
import type {
  ICorregimientoRepository,
  CorregimientoListFilters,
} from "../../domain/repositories/ICorregimientoRepository.js";
import type { Corregimiento } from "../../domain/entities/Corregimiento.js";
import { CorregimientoEntity } from "../database/entities/CorregimientoEntity.js";

export class TypeormCorregimientoRepository implements ICorregimientoRepository {
  constructor(private readonly repo: Repository<CorregimientoEntity>) {}

  async findById(id: string): Promise<Corregimiento | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByNameAndMunicipality(
    name: string,
    municipalityId: string
  ): Promise<Corregimiento | null> {
    const entity = await this.repo.findOneBy({
      name: ILike(name),
      municipalityId,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByMunicipality(municipalityId: string): Promise<Corregimiento[]> {
    const entities = await this.repo.findBy({ municipalityId });
    return entities.map(this.toDomain);
  }

  async findAll(filters?: CorregimientoListFilters): Promise<Corregimiento[]> {
    const qb = this.repo.createQueryBuilder("corregimiento");

    if (filters) {
      const { municipalityId, isActive, searchTerm } = filters;

      if (municipalityId !== undefined) {
        qb.andWhere("corregimiento.municipalityId = :municipalityId", { municipalityId });
      }

      if (isActive !== undefined) {
        qb.andWhere("corregimiento.isActive = :isActive", { isActive });
      }

      if (searchTerm) {
        qb.andWhere("corregimiento.name ILIKE :term", { term: `%${searchTerm}%` });
      }
    }

    qb.orderBy("corregimiento.name", "ASC");

    const entities = await qb.getMany();
    return entities.map(this.toDomain);
  }

  async save(corregimiento: Corregimiento): Promise<void> {
    const entity = this.toEntity(corregimiento);
    await this.repo.save(entity);
  }

  async deactivateById(id: string, deactivatedBy: string): Promise<void> {
    await this.repo.update(id, {
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy,
    });
  }

  async reactivateById(id: string): Promise<void> {
    await this.repo.update(id, {
      isActive: true,
      deactivatedAt: () => "NULL",
      deactivatedBy: () => "NULL",
    });
  }

  private toDomain(entity: CorregimientoEntity): Corregimiento {
    return {
      id: entity.id,
      municipalityId: entity.municipalityId,
      name: entity.name,
      latitude: entity.latitude,
      longitude: entity.longitude,
      isActive: entity.isActive,
      deactivatedAt: entity.deactivatedAt,
      deactivatedBy: entity.deactivatedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(corregimiento: Corregimiento): CorregimientoEntity {
    const entity = new CorregimientoEntity();
    entity.id = corregimiento.id;
    entity.municipalityId = corregimiento.municipalityId;
    entity.name = corregimiento.name;
    entity.latitude = corregimiento.latitude;
    entity.longitude = corregimiento.longitude;
    entity.isActive = corregimiento.isActive;
    entity.deactivatedAt = corregimiento.deactivatedAt;
    entity.deactivatedBy = corregimiento.deactivatedBy;
    return entity;
  }
}
