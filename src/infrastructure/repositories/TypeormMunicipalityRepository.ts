/**
 * Repository adapter: TypeormMunicipalityRepository
 *
 * Implements IMunicipalityRepository using TypeORM and PostgreSQL.
 * Maps between domain Municipality entities and TypeORM MunicipalityEntity records.
 */

import { type Repository, IsNull } from "typeorm";
import type { IMunicipalityRepository } from "../../domain/repositories/IMunicipalityRepository.js";
import type { Municipality } from "../../domain/entities/Municipality.js";
import { MunicipalityEntity } from "../database/entities/MunicipalityEntity.js";

export class TypeormMunicipalityRepository implements IMunicipalityRepository {
  constructor(private readonly repo: Repository<MunicipalityEntity>) {}

  async findById(id: string): Promise<Municipality | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findRoot(): Promise<Municipality | null> {
    // The root municipality is always "Sabanalarga, Atlántico"
    const entity = await this.repo.findOneBy({ name: "Sabanalarga" });
    return entity ? this.toDomain(entity) : null;
  }

  async save(municipality: Municipality): Promise<void> {
    const entity = this.toEntity(municipality);
    await this.repo.save(entity);
  }

  private toDomain(entity: MunicipalityEntity): Municipality {
    return {
      id: entity.id,
      name: entity.name,
      department: entity.department,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(municipality: Municipality): MunicipalityEntity {
    const entity = new MunicipalityEntity();
    entity.id = municipality.id;
    entity.name = municipality.name;
    entity.department = municipality.department;
    entity.isActive = municipality.isActive;
    return entity;
  }
}
