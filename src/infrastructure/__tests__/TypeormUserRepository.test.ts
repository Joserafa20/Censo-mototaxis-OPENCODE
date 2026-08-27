/**
 * Integration test: TypeormUserRepository
 *
 * Tests user persistence operations against an in-memory SQLite database.
 * Validates that repository methods correctly map between domain and entity models.
 */

import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "./test-data-source.js";
import { UserEntity } from "../database/entities/UserEntity.js";
import { TypeormUserRepository } from "../repositories/TypeormUserRepository.js";
import { createUser } from "../../domain/entities/User.js";

describe("TypeormUserRepository", () => {
  let dataSource: DataSource;
  let repo: TypeormUserRepository;
  let typeormRepo: Repository<UserEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    typeormRepo = dataSource.getRepository(UserEntity);
    repo = new TypeormUserRepository(typeormRepo);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await typeormRepo.clear();
  });

  const adminId = "550e8400-e29b-41d4-a716-446655440000";
  const censistaId = "660e8400-e29b-41d4-a716-446655440001";

  function createAdminUser(overrides = {}) {
    return createUser({
      id: adminId,
      email: "admin@test.com",
      passwordHash: "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12",
      role: "admin",
      ...overrides,
    });
  }

  function createCensistaUser(overrides = {}) {
    return createUser({
      id: censistaId,
      documentType: "CC",
      documentNumber: "1234567890",
      passwordHash: "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12",
      role: "censista",
      ...overrides,
    });
  }

  describe("save and findById", () => {
    it("should save and retrieve a user by id", async () => {
      const user = createAdminUser();
      await repo.save(user);

      const found = await repo.findById(adminId);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(adminId);
      expect(found!.email).toBe("admin@test.com");
      expect(found!.role).toBe("admin");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find a user by email", async () => {
      const user = createAdminUser();
      await repo.save(user);

      const found = await repo.findByEmail("admin@test.com");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(adminId);
    });

    it("should return null for non-existent email", async () => {
      const found = await repo.findByEmail("nobody@test.com");
      expect(found).toBeNull();
    });
  });

  describe("findByDocument", () => {
    it("should find a user by document number", async () => {
      const user = createCensistaUser();
      await repo.save(user);

      const found = await repo.findByDocument("1234567890");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(censistaId);
    });

    it("should return null for non-existent document", async () => {
      const found = await repo.findByDocument("0000000000");
      expect(found).toBeNull();
    });
  });

  describe("incrementFailedAttempts", () => {
    it("should increment failed login attempts", async () => {
      const user = createAdminUser({ failedLoginAttempts: 0 });
      await repo.save(user);

      await repo.incrementFailedAttempts(adminId);

      const found = await repo.findById(adminId);
      expect(found!.failedLoginAttempts).toBe(1);
    });

    it("should increment multiple times", async () => {
      const user = createAdminUser({ failedLoginAttempts: 2 });
      await repo.save(user);

      await repo.incrementFailedAttempts(adminId);
      await repo.incrementFailedAttempts(adminId);
      await repo.incrementFailedAttempts(adminId);

      const found = await repo.findById(adminId);
      expect(found!.failedLoginAttempts).toBe(5);
    });
  });

  describe("lockAccount", () => {
    it("should lock the account and reset failed attempts", async () => {
      const user = createAdminUser({ failedLoginAttempts: 5 });
      await repo.save(user);

      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await repo.lockAccount(adminId, lockUntil);

      const found = await repo.findById(adminId);
      expect(found!.lockedUntil).toBeInstanceOf(Date);
      expect(found!.lockedUntil!.getTime()).toBe(lockUntil.getTime());
      expect(found!.failedLoginAttempts).toBe(0);
    });
  });

  describe("resetFailedAttempts", () => {
    it("should reset failed attempts and unlock account", async () => {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      const user = createAdminUser({
        failedLoginAttempts: 5,
        lockedUntil: lockUntil,
      });
      await repo.save(user);

      await repo.resetFailedAttempts(adminId);

      const found = await repo.findById(adminId);
      expect(found!.failedLoginAttempts).toBe(0);
      expect(found!.lockedUntil).toBeNull();
    });
  });
});
