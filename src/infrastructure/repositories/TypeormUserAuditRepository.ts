/**
 * Repository adapter: TypeormUserAuditRepository
 *
 * Implements IUserAuditRepository using TypeORM and PostgreSQL.
 * Maps between domain UserAuditLog entities and TypeORM UserAuditLogEntity records.
 * Append-only — creates audit entries, never modifies them.
 */

import { type Repository } from "typeorm";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import type { UserAuditAction, UserAuditLog } from "../../domain/entities/UserAuditLog.js";
import { UserAuditLogEntity } from "../database/entities/UserAuditLogEntity.js";

export class TypeormUserAuditRepository implements IUserAuditRepository {
  constructor(private readonly repo: Repository<UserAuditLogEntity>) {}

  async create(entry: Omit<UserAuditLog, "id" | "createdAt"> & { id?: string }): Promise<UserAuditLog> {
    const entity = new UserAuditLogEntity();
    entity.id = entry.id ?? `ual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    entity.targetUserId = entry.targetUserId;
    entity.actorUserId = entry.actorUserId ?? null;
    entity.action = entry.action;
    entity.details = entry.details ?? null;
    entity.ipAddress = entry.ipAddress ?? null;

    const saved = await this.repo.save(entity);

    return this.toDomain(saved);
  }

  async findByTargetUser(
    targetUserId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<UserAuditLog[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const entities = await this.repo.find({
      where: { targetUserId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return entities.map(this.toDomain);
  }

  async findByAction(
    action: UserAuditAction,
    options?: { limit?: number; offset?: number }
  ): Promise<UserAuditLog[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const entities = await this.repo.find({
      where: { action },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return entities.map(this.toDomain);
  }

  private toDomain(entity: UserAuditLogEntity): UserAuditLog {
    return {
      id: entity.id,
      targetUserId: entity.targetUserId,
      actorUserId: entity.actorUserId,
      action: entity.action as UserAuditAction,
      details: entity.details,
      ipAddress: entity.ipAddress,
      createdAt: entity.createdAt,
    };
  }
}
