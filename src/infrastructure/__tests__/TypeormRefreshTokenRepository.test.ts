/**
 * Integration test: TypeormRefreshTokenRepository
 *
 * Tests refresh token persistence operations against an in-memory SQLite database.
 * Validates token rotation, revocation, and cleanup operations.
 */

import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "./test-data-source.js";
import { UserEntity } from "../database/entities/UserEntity.js";
import { RefreshTokenEntity } from "../database/entities/RefreshTokenEntity.js";
import { TypeormRefreshTokenRepository } from "../repositories/TypeormRefreshTokenRepository.js";
import { createUser } from "../../domain/entities/User.js";
import { createRefreshToken } from "../../domain/entities/RefreshToken.js";

describe("TypeormRefreshTokenRepository", () => {
  let dataSource: DataSource;
  let repo: TypeormRefreshTokenRepository;
  let userRepo: Repository<UserEntity>;
  let tokenRepo: Repository<RefreshTokenEntity>;

  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    userRepo = dataSource.getRepository(UserEntity);
    tokenRepo = dataSource.getRepository(RefreshTokenEntity);
    repo = new TypeormRefreshTokenRepository(tokenRepo);

    // Create a test user (foreign key constraint)
    const user = createUser({
      id: userId,
      passwordHash: "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12",
      role: "censista",
    });
    const userEntity = new UserEntity();
    Object.assign(userEntity, user);
    await userRepo.save(userEntity);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await tokenRepo.clear();
  });

  describe("save and findActiveByHash", () => {
    it("should save and find an active token by hash", async () => {
      const token = createRefreshToken({
        id: "rt-1",
        userId,
        tokenHash: "abc123hash",
        deviceInfo: "Chrome/120",
        ipAddress: "192.168.1.1",
      });

      await repo.save(token);

      const found = await repo.findActiveByHash("abc123hash");
      expect(found).not.toBeNull();
      expect(found!.id).toBe("rt-1");
      expect(found!.userId).toBe(userId);
    });

    it("should return null for non-existent hash", async () => {
      const found = await repo.findActiveByHash("nonexistent");
      expect(found).toBeNull();
    });

    it("should return null for revoked token", async () => {
      const token = createRefreshToken({
        id: "rt-2",
        userId,
        tokenHash: "revokedhash",
        deviceInfo: "Chrome/120",
        ipAddress: "192.168.1.1",
      });
      await repo.save(token);

      // Revoke it
      await repo.revoke("revokedhash");

      const found = await repo.findActiveByHash("revokedhash");
      expect(found).toBeNull();
    });
  });

  describe("revoke", () => {
    it("should revoke a token by hash", async () => {
      const token = createRefreshToken({
        id: "rt-3",
        userId,
        tokenHash: "torevoke",
        deviceInfo: "Firefox/121",
        ipAddress: "10.0.0.1",
      });
      await repo.save(token);

      await repo.revoke("torevoke");

      const entity = await tokenRepo.findOneBy({ tokenHash: "torevoke" });
      expect(entity).not.toBeNull();
      expect(entity!.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe("revokeAllForUser", () => {
    it("should revoke all active tokens for a user", async () => {
      const token1 = createRefreshToken({
        id: "rt-4",
        userId,
        tokenHash: "hash1",
        deviceInfo: "Chrome",
        ipAddress: "1.1.1.1",
      });
      const token2 = createRefreshToken({
        id: "rt-5",
        userId,
        tokenHash: "hash2",
        deviceInfo: "Firefox",
        ipAddress: "2.2.2.2",
      });

      await repo.save(token1);
      await repo.save(token2);

      await repo.revokeAllForUser(userId);

      const found1 = await repo.findActiveByHash("hash1");
      const found2 = await repo.findActiveByHash("hash2");
      expect(found1).toBeNull();
      expect(found2).toBeNull();
    });
  });

  describe("deleteExpired", () => {
    it("should delete expired tokens", async () => {
      // Create an already-expired token
      const expiredToken = createRefreshToken({
        id: "rt-6",
        userId,
        tokenHash: "expiredhash",
        deviceInfo: "Chrome",
        ipAddress: "1.1.1.1",
        expiresAt: new Date(Date.now() - 86400000), // yesterday
      });
      await repo.save(expiredToken);

      // Create a valid token
      const validToken = createRefreshToken({
        id: "rt-7",
        userId,
        tokenHash: "validhash",
        deviceInfo: "Chrome",
        ipAddress: "1.1.1.1",
      });
      await repo.save(validToken);

      await repo.deleteExpired();

      const expiredFound = await repo.findActiveByHash("expiredhash");
      const validFound = await repo.findActiveByHash("validhash");
      expect(expiredFound).toBeNull();
      expect(validFound).not.toBeNull();
    });
  });
});
