/**
 * Integration test: TypeormLoginAuditRepository
 *
 * Tests login audit persistence against an in-memory SQLite database.
 * Validates audit entry creation with all required fields.
 */

import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "./test-data-source.js";
import { UserEntity } from "../database/entities/UserEntity.js";
import { LoginAuditEntity } from "../database/entities/LoginAuditEntity.js";
import { TypeormLoginAuditRepository } from "../repositories/TypeormLoginAuditRepository.js";
import { createUser } from "../../domain/entities/User.js";

describe("TypeormLoginAuditRepository", () => {
  let dataSource: DataSource;
  let repo: TypeormLoginAuditRepository;
  let auditRepo: Repository<LoginAuditEntity>;
  let userRepo: Repository<UserEntity>;

  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    userRepo = dataSource.getRepository(UserEntity);
    auditRepo = dataSource.getRepository(LoginAuditEntity);
    repo = new TypeormLoginAuditRepository(auditRepo);

    // Create a test user
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
    await auditRepo.clear();
  });

  describe("create", () => {
    it("should create a successful login audit entry", async () => {
      const entry = await repo.create({
        userId,
        success: true,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        failureReason: null,
      });

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe(userId);
      expect(entry.success).toBe(true);
      expect(entry.ipAddress).toBe("192.168.1.1");
      expect(entry.userAgent).toBe("Mozilla/5.0");
      expect(entry.failureReason).toBeNull();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it("should create a failed login audit with failure reason", async () => {
      const entry = await repo.create({
        userId,
        success: false,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        failureReason: "Invalid password",
      });

      expect(entry.success).toBe(false);
      expect(entry.failureReason).toBe("Invalid password");
    });

    it("should accept a custom id", async () => {
      const customId = "audit-custom-123";
      const entry = await repo.create({
        id: customId,
        userId,
        success: true,
        ipAddress: "10.0.0.1",
        userAgent: "Chrome/120",
        failureReason: null,
      });

      expect(entry.id).toBe(customId);
    });

    it("should persist the entry in the database", async () => {
      await repo.create({
        userId,
        success: false,
        ipAddress: "1.1.1.1",
        userAgent: "TestAgent",
        failureReason: "Account locked",
      });

      const count = await auditRepo.count();
      expect(count).toBe(1);

      const saved = await auditRepo.findOneBy({ userId });
      expect(saved).not.toBeNull();
      expect(saved!.success).toBe(false);
      expect(saved!.failureReason).toBe("Account locked");
    });
  });
});
