/**
 * Repository adapter: TypeormStationRepository
 *
 * Implements IStationRepository using TypeORM.
 * Maps between domain Station entities and TypeORM StationEntity records.
 */

import { type Repository, ILike } from "typeorm";
import type {
  IStationRepository,
  StationListFilters,
} from "../../domain/repositories/IStationRepository.js";
import type { Station } from "../../domain/entities/Station.js";
import { StationEntity } from "../database/entities/StationEntity.js";

export class TypeormStationRepository implements IStationRepository {
  constructor(private readonly repo: Repository<StationEntity>) {}

  async findById(id: string): Promise<Station | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByNameAndCorregimiento(
    name: string,
    corregimientoId: string
  ): Promise<Station | null> {
    const entity = await this.repo.findOneBy({
      name: ILike(name),
      corregimientoId,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filters?: StationListFilters): Promise<Station[]> {
    const qb = this.repo.createQueryBuilder("station");

    if (filters) {
      const { corregimientoId, neighborhoodId, isActive, searchTerm } = filters;

      if (corregimientoId !== undefined) {
        qb.andWhere("station.corregimientoId = :corregimientoId", { corregimientoId });
      }

      if (neighborhoodId !== undefined) {
        qb.andWhere("station.neighborhoodId = :neighborhoodId", { neighborhoodId });
      }

      if (isActive !== undefined) {
        qb.andWhere("station.isActive = :isActive", { isActive });
      }

      if (searchTerm) {
        qb.andWhere("station.name ILIKE :term", { term: `%${searchTerm}%` });
      }
    }

    qb.orderBy("station.name", "ASC");

    const entities = await qb.getMany();
    return entities.map(this.toDomain);
  }

  async save(station: Station): Promise<void> {
    const entity = this.toEntity(station);
    await this.repo.save(entity);
  }

  async deactivateById(id: string): Promise<void> {
    await this.repo.update(id, {
      isActive: false,
    });
  }

  async countActiveByCorregimientoId(corregimientoId: string): Promise<number> {
    return this.repo.countBy({
      corregimientoId,
      isActive: true,
    });
  }

  private toDomain(entity: StationEntity): Station {
    return {
      id: entity.id,
      name: entity.name,
      corregimientoId: entity.corregimientoId,
      neighborhoodId: entity.neighborhoodId,
      latitude: entity.latitude,
      longitude: entity.longitude,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(station: Station): StationEntity {
    const entity = new StationEntity();
    entity.id = station.id;
    entity.name = station.name;
    entity.corregimientoId = station.corregimientoId;
    entity.neighborhoodId = station.neighborhoodId;
    entity.latitude = station.latitude;
    entity.longitude = station.longitude;
    entity.isActive = station.isActive;
    return entity;
  }
}
