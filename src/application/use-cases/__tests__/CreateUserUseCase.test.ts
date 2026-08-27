/**
 * Tests: CreateUserUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: email uniqueness, document uniqueness, password hashing,
 * audit logging, role assignment.
 */

import { CreateUserUseCase, CreateUserInput } from "../CreateUserUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../../domain/repositories/IUserAuditRepository.js";
import type { IPasswordHasher } from "../../../domain/services/IPasswordHasher.js";
import { createUser } from "../../../domain/entities/User.js";
import {
  EmailAlreadyExistsError,
  DocumentAlreadyExistsError,
} from "../../../domain/errors/AuthErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeUserRepo(): IUserRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByDocument: jest.fn().mockResolvedValue(null),
    incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
    lockAccount: jest.fn().mockResolvedValue(undefined),
    resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    countActiveAdmins: jest.fn().mockResolvedValue(1),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
  };
}

function makeAuditRepo(): IUserAuditRepository {
  return {
    create: jest.fn().mockImplementation((entry) =>
      Promise.resolve({
        id: entry.id ?? "audit-1",
        ...entry,
        createdAt: new Date(),
      })
    ),
    findByTargetUser: jest.fn().mockResolvedValue([]),
    findByAction: jest.fn().mockResolvedValue([]),
  };
}

function makePasswordHasher(): IPasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue("$2b$12$hashedpassword"),
    compare: jest.fn().mockResolvedValue(true),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("CreateUserUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let passwordHasher: ReturnType<typeof makePasswordHasher>;
  let useCase: CreateUserUseCase;

  const baseInput: CreateUserInput = {
    email: "new@example.com",
    password: "Secret123!",
    role: "censista",
    actorUserId: "admin-1",
  };

  beforeEach(() => {
    userRepo = makeUserRepo();
    auditRepo = makeAuditRepo();
    passwordHasher = makePasswordHasher();
    useCase = new CreateUserUseCase(userRepo, auditRepo, passwordHasher);
  });

  // ── Email uniqueness ─────────────────────────────────────────────

  it("should throw EmailAlreadyExistsError when email is already taken", async () => {
    const existingUser = createUser({
      id: "existing",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "new@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(existingUser);

    await expect(useCase.execute(baseInput)).rejects.toThrow(EmailAlreadyExistsError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // ── Document uniqueness ──────────────────────────────────────────

  it("should throw DocumentAlreadyExistsError when document is already taken", async () => {
    const input: CreateUserInput = {
      ...baseInput,
      email: undefined,
      documentType: "CC",
      documentNumber: "1234567890",
    };
    const existingUser = createUser({
      id: "existing",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      documentNumber: "1234567890",
    });
    (userRepo.findByDocument as jest.Mock).mockResolvedValue(existingUser);

    await expect(useCase.execute(input)).rejects.toThrow(DocumentAlreadyExistsError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // ── Password hashing ─────────────────────────────────────────────

  it("should hash the password before saving", async () => {
    await useCase.execute(baseInput);

    expect(passwordHasher.hash).toHaveBeenCalledWith("Secret123!");
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: "$2b$12$hashedpassword",
      })
    );
  });

  // ── Successful creation ──────────────────────────────────────────

  it("should create user with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("userId");
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "censista",
        email: "new@example.com",
        isActive: true,
        isFirstLogin: true,
      })
    );
  });

  it("should create admin user with email", async () => {
    const input: CreateUserInput = {
      email: "admin@example.com",
      password: "Admin123!",
      role: "admin",
      actorUserId: "superadmin-1",
    };

    const result = await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "admin",
        email: "admin@example.com",
      })
    );
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful creation", async () => {
    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.created",
        targetUserId: expect.any(String),
        actorUserId: "admin-1",
      })
    );
  });

  // ── Optional fields ──────────────────────────────────────────────

  it("should handle optional fields gracefully", async () => {
    const input: CreateUserInput = {
      password: "Test123!",
      role: "censista",
      actorUserId: "admin-1",
    };

    const result = await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: null,
        documentType: null,
        documentNumber: null,
        phoneNumber: null,
      })
    );
  });

  it("should set documentType and phoneNumber when provided", async () => {
    const input: CreateUserInput = {
      ...baseInput,
      documentType: "CC",
      documentNumber: "9876543210",
      phoneNumber: "+573001234567",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "CC",
        documentNumber: "9876543210",
        phoneNumber: "+573001234567",
      })
    );
  });
});
