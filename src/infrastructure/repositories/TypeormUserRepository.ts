/**
 * Repository adapter: TypeormUserRepository
 *
 * Implements IUserRepository using TypeORM and PostgreSQL.
 * Maps between domain User entities and TypeORM UserEntity records.
 */

import { type Repository } from "typeorm";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { User } from "../../domain/entities/User.js";
import { UserEntity } from "../database/entities/UserEntity.js";

export class TypeormUserRepository implements IUserRepository {
  constructor(private readonly repo: Repository<UserEntity>) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ email });
    return entity ? this.toDomain(entity) : null;
  }

  async findByDocument(documentNumber: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ documentNumber });
    return entity ? this.toDomain(entity) : null;
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    await this.repo.increment({ id: userId }, "failedLoginAttempts", 1);
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    await this.repo.update(userId, {
      lockedUntil: until,
      failedLoginAttempts: 0,
    });
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ failedLoginAttempts: 0, lockedUntil: () => "NULL" })
      .where("id = :userId", { userId })
      .execute();
  }

  async save(user: User): Promise<void> {
    const entity = this.toEntity(user);
    await this.repo.save(entity);
  }

  private toDomain(entity: UserEntity): User {
    return {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      role: entity.role,
      documentType: entity.documentType,
      documentNumber: entity.documentNumber,
      phoneNumber: entity.phoneNumber,
      isActive: entity.isActive,
      isFirstLogin: entity.isFirstLogin,
      forcePasswordChange: entity.forcePasswordChange,
      failedLoginAttempts: entity.failedLoginAttempts,
      lockedUntil: entity.lockedUntil,
      deactivatedAt: entity.deactivatedAt,
      deactivatedBy: entity.deactivatedBy,
    };
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.role = user.role;
    entity.documentType = user.documentType;
    entity.documentNumber = user.documentNumber;
    entity.phoneNumber = user.phoneNumber;
    entity.isActive = user.isActive;
    entity.isFirstLogin = user.isFirstLogin;
    entity.forcePasswordChange = user.forcePasswordChange;
    entity.failedLoginAttempts = user.failedLoginAttempts;
    entity.lockedUntil = user.lockedUntil;
    entity.deactivatedAt = user.deactivatedAt;
    entity.deactivatedBy = user.deactivatedBy;
    return entity;
  }
}
