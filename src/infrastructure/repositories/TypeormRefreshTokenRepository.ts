/**
 * Repository adapter: TypeormRefreshTokenRepository
 *
 * Implements IRefreshTokenRepository using TypeORM and PostgreSQL.
 * Supports token rotation (find → revoke → save new) and reuse detection.
 */

import { type Repository, LessThan, IsNull } from "typeorm";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { RefreshToken } from "../../domain/entities/RefreshToken.js";
import { RefreshTokenEntity } from "../database/entities/RefreshTokenEntity.js";

export class TypeormRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly repo: Repository<RefreshTokenEntity>) {}

  async findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOneBy({
      tokenHash,
      revokedAt: IsNull(),
    });
    return entity ? this.toDomain(entity) : null;
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );
  }

  async save(token: RefreshToken): Promise<void> {
    const entity = this.toEntity(token);
    await this.repo.save(entity);
  }

  async deleteExpired(): Promise<void> {
    await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  private toDomain(entity: RefreshTokenEntity): RefreshToken {
    return {
      id: entity.id,
      userId: entity.userId,
      tokenHash: entity.tokenHash,
      deviceInfo: entity.deviceInfo,
      ipAddress: entity.ipAddress,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
    };
  }

  private toEntity(token: RefreshToken): RefreshTokenEntity {
    const entity = new RefreshTokenEntity();
    entity.id = token.id;
    entity.userId = token.userId;
    entity.tokenHash = token.tokenHash;
    entity.deviceInfo = token.deviceInfo;
    entity.ipAddress = token.ipAddress;
    entity.expiresAt = token.expiresAt;
    entity.revokedAt = token.revokedAt;
    entity.createdAt = token.createdAt;
    return entity;
  }
}
