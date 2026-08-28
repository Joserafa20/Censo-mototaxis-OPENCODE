/**
 * Repository adapter: TypeormNeighborhoodRepository
 *
 * Implements INeighborhoodRepository using TypeORM and PostgreSQL.
 * Maps between domain Neighborhood entities and TypeORM NeighborhoodEntity records.
 */

import { type Repository, ILike } from "typeorm";
import type {
  INeighborhoodRepository,
  NeighborhoodListFilters,
} from "../../domain/repositories/INeighborhoodRepository.js";
import type { Neighborhood } from "../../domain/entities/Neighborhood.js";
import { NeighborhoodEntity } from "../database/entities/NeighborhoodEntity.js";

export class TypeormNeighborhoodRepository implements INeighborhoodRepository {
  constructor(private readonly repo: Repository<NeighborhoodEntity>) {}

  async findById(id: string): Promise<Neighborhood | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByNameAndCorregimiento(
    name: string,
    corregimientoId: string
  ): Promise<Neighborhood | null> {
    const entity = await this.repo.findOneBy({
      name: ILike(name),
      corregimientoId,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCorregimiento(corregimientoId: string): Promise<Neighborhood[]> {
    const entities = await this.repo.findBy({ corregimientoId });
    return entities.map(this.toDomain);
  }

  async findAll(filters?: NeighborhoodListFilters): Promise<Neighborhood[]> {
    const qb = this.repo.createQueryBuilder("neighborhood");

    if (filters) {
      const { corregimientoId, isActive, searchTerm } = filters;

      if (corregimientoId !== undefined) {
        qb.andWhere("neighborhood.corregimientoId = :corregimientoId", { corregimientoId });
      }

      if (isActive !== undefined) {
        qb.andWhere("neighborhood.isActive = :isActive", { isActive });
      }

      if (searchTerm) {
        qb.andWhere("neighborhood.name ILIKE :term", { term: `%${searchTerm}%` });
      }
    }

    qb.orderBy("neighborhood.name", "ASC");

    const entities = await qb.getMany();
    return entities.map(this.toDomain);
  }

  async save(neighborhood: Neighborhood): Promise<void> {
    const entity = this.toEntity(neighborhood);
    await this.repo.save(entity);
  }

  async deactivateByCorregimientoId(corregimientoId: string, deactivatedBy: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(NeighborhoodEntity)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
      })
      .where("corregimientoId = :corregimientoId AND isActive = :isActive", {
        corregimientoId,
        isActive: true,
      })
      .execute();
  }

  async reactivateById(id: string): Promise<void> {
    await this.repo.update(id, {
      isActive: true,
      deactivatedAt: () => "NULL",
      deactivatedBy: () => "NULL",
    });
  }

  async countByCorregimientoId(corregimientoId: string): Promise<number> {
    return this.repo.count({ where: { corregimientoId } });
  }

  private toDomain(entity: NeighborhoodEntity): Neighborhood {
    return {
      id: entity.id,
      corregimientoId: entity.corregimientoId,
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

  private toEntity(neighborhood: Neighborhood): NeighborhoodEntity {
    const entity = new NeighborhoodEntity();
    entity.id = neighborhood.id;
    entity.corregimientoId = neighborhood.corregimientoId;
    entity.name = neighborhood.name;
    entity.latitude = neighborhood.latitude;
    entity.longitude = neighborhood.longitude;
    entity.isActive = neighborhood.isActive;
    entity.deactivatedAt = neighborhood.deactivatedAt;
    entity.deactivatedBy = neighborhood.deactivatedBy;
    return entity;
  }
}
