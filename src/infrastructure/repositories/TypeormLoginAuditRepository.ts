/**
 * Repository adapter: TypeormLoginAuditRepository
 *
 * Implements ILoginAuditRepository using TypeORM and PostgreSQL.
 * Append-only — creates audit entries, never modifies them.
 */

import { type Repository } from "typeorm";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import type { LoginAudit } from "../../domain/entities/LoginAudit.js";
import { LoginAuditEntity } from "../database/entities/LoginAuditEntity.js";

export class TypeormLoginAuditRepository implements ILoginAuditRepository {
  constructor(private readonly repo: Repository<LoginAuditEntity>) {}

  async create(
    entry: Omit<LoginAudit, "id" | "createdAt"> & { id?: string }
  ): Promise<LoginAudit> {
    const id = entry.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const entity = new LoginAuditEntity();
    entity.id = id;
    entity.userId = entry.userId;
    entity.success = entry.success;
    entity.ipAddress = entry.ipAddress;
    entity.userAgent = entry.userAgent;
    entity.failureReason = entry.failureReason ?? null;

    const saved = await this.repo.save(entity);

    return {
      id: saved.id,
      userId: saved.userId,
      success: saved.success,
      ipAddress: saved.ipAddress,
      userAgent: saved.userAgent,
      failureReason: saved.failureReason,
      createdAt: saved.createdAt,
    };
  }
}
