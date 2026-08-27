/**
 * Repository adapter: TypeormPasswordResetRepository
 *
 * Implements IPasswordResetRepository using TypeORM and PostgreSQL.
 * Maps between domain PasswordResetToken entities and TypeORM PasswordResetTokenEntity records.
 */

import { type Repository, LessThan, IsNull } from "typeorm";
import type { IPasswordResetRepository } from "../../domain/repositories/IPasswordResetRepository.js";
import type { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import { PasswordResetTokenEntity } from "../database/entities/PasswordResetTokenEntity.js";

export class TypeormPasswordResetRepository implements IPasswordResetRepository {
  constructor(private readonly repo: Repository<PasswordResetTokenEntity>) {}

  async create(token: PasswordResetToken): Promise<void> {
    const entity = this.toEntity(token);
    await this.repo.save(entity);
  }

  async findValidByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const entity = await this.repo.findOneBy({
      tokenHash,
      usedAt: IsNull(),
    });

    if (!entity) return null;

    // Check expiry
    if (entity.expiresAt <= new Date()) {
      return null;
    }

    return this.toDomain(entity);
  }

  async markUsed(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { usedAt: new Date() });
  }

  async deleteExpired(): Promise<void> {
    await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() }
    );
  }

  private toDomain(entity: PasswordResetTokenEntity): PasswordResetToken {
    return {
      id: entity.id,
      userId: entity.userId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      createdAt: entity.createdAt,
    };
  }

  private toEntity(token: PasswordResetToken): PasswordResetTokenEntity {
    const entity = new PasswordResetTokenEntity();
    entity.id = token.id;
    entity.userId = token.userId;
    entity.tokenHash = token.tokenHash;
    entity.expiresAt = token.expiresAt;
    entity.usedAt = token.usedAt;
    entity.createdAt = token.createdAt;
    return entity;
  }
}
