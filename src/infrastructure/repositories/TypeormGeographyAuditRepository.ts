/**
 * Repository adapter: TypeormGeographyAuditRepository
 *
 * Implements IGeographyAuditRepository using TypeORM and PostgreSQL.
 * Maps between domain GeographyAuditEntry entities and TypeORM GeographyAuditEntity records.
 */

import { type Repository } from "typeorm";
import type { IGeographyAuditRepository } from "../../domain/repositories/IGeographyAuditRepository.js";
import type {
  GeographyAuditEntry,
  GeographyAction,
  GeographyEntityType,
} from "../../domain/entities/GeographyAudit.js";
import { GeographyAuditEntity } from "../database/entities/GeographyAuditEntity.js";

export class TypeormGeographyAuditRepository implements IGeographyAuditRepository {
  constructor(private readonly repo: Repository<GeographyAuditEntity>) {}

  async create(entry: Omit<GeographyAuditEntry, "createdAt">): Promise<GeographyAuditEntry> {
    const entity = this.toEntity(entry);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByEntity(
    entityType: GeographyEntityType,
    entityId: string
  ): Promise<GeographyAuditEntry[]> {
    const entities = await this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: "DESC" },
    });
    return entities.map(this.toDomain);
  }

  async findByAction(action: GeographyAction): Promise<GeographyAuditEntry[]> {
    const entities = await this.repo.find({
      where: { action },
      order: { createdAt: "DESC" },
    });
    return entities.map(this.toDomain);
  }

  private toDomain(entity: GeographyAuditEntity): GeographyAuditEntry {
    return {
      id: entity.id,
      entityType: entity.entityType as GeographyEntityType,
      entityId: entity.entityId,
      actorUserId: entity.actorUserId,
      action: entity.action as GeographyAction,
      details: entity.details,
      ipAddress: entity.ipAddress,
      createdAt: entity.createdAt,
    };
  }

  private toEntity(entry: Omit<GeographyAuditEntry, "createdAt">): GeographyAuditEntity {
    const entity = new GeographyAuditEntity();
    entity.id = entry.id;
    entity.entityType = entry.entityType;
    entity.entityId = entry.entityId;
    entity.actorUserId = entry.actorUserId;
    entity.action = entry.action;
    entity.details = entry.details;
    entity.ipAddress = entry.ipAddress;
    return entity;
  }
}
