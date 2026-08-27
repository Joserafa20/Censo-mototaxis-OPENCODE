/**
 * Tests: LoginUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: credential resolution, lock checks, password validation,
 * token generation, audit logging, failed attempts + lockout.
 */

import { LoginUseCase } from "../LoginUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../../domain/repositories/ILoginAuditRepository.js";
import type { IPasswordHasher } from "../../../domain/services/IPasswordHasher.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createUser } from "../../../domain/entities/User.js";
import {
  InvalidCredentialsError,
  AccountLockedError,
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

function makeRefreshTokenRepo(): IRefreshTokenRepository {
  return {
    findActiveByHash: jest.fn().mockResolvedValue(null),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAuditRepo(): ILoginAuditRepository {
  return {
    create: jest.fn().mockImplementation((entry) =>
      Promise.resolve({
        id: entry.id ?? "audit-1",
        ...entry,
        createdAt: new Date(),
      })
    ),
  };
}

function makePasswordHasher(): IPasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue("$2b$12$hashed"),
    compare: jest.fn().mockResolvedValue(true),
  };
}

function makeTokenService(): ITokenService {
  return {
    generateAccessToken: jest.fn().mockReturnValue("access-token-123"),
    generateRefreshToken: jest.fn().mockReturnValue({
      rawToken: "refresh-raw-123",
      tokenHash: "refresh-hash-123",
    }),
    verifyAccessToken: jest.fn(),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("LoginUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let passwordHasher: ReturnType<typeof makePasswordHasher>;
  let tokenService: ReturnType<typeof makeTokenService>;
  let useCase: LoginUseCase;

  const baseInput = {
    credential: "admin@example.com",
    password: "Secret123!",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
  };

  beforeEach(() => {
    userRepo = makeUserRepo();
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    passwordHasher = makePasswordHasher();
    tokenService = makeTokenService();
    useCase = new LoginUseCase(
      userRepo,
      refreshTokenRepo,
      auditRepo,
      passwordHasher,
      tokenService
    );
  });

  // ── Credential resolution ────────────────────────────────────────

  it("should find user by email when credential contains @", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    await useCase.execute(baseInput);

    expect(userRepo.findByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(userRepo.findByDocument).not.toHaveBeenCalled();
  });

  it("should find user by document number when credential has no @", async () => {
    const user = createUser({
      id: "u2",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      documentNumber: "1234567890",
    });
    (userRepo.findByDocument as jest.Mock).mockResolvedValue(user);

    await useCase.execute({
      ...baseInput,
      credential: "1234567890",
    });

    expect(userRepo.findByDocument).toHaveBeenCalledWith("1234567890");
    expect(userRepo.findByEmail).not.toHaveBeenCalled();
  });

  // ── Invalid credentials ──────────────────────────────────────────

  it("should throw InvalidCredentialsError when user is not found", async () => {
    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureReason: "User not found",
      })
    );
  });

  it("should throw InvalidCredentialsError when password is wrong", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
    expect(userRepo.incrementFailedAttempts).toHaveBeenCalledWith("u1");
  });

  // ── Account locked ───────────────────────────────────────────────

  it("should throw AccountLockedError when account is locked", async () => {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
      lockedUntil,
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      AccountLockedError
    );
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureReason: "Account locked",
      })
    );
  });

  // ── Successful login ─────────────────────────────────────────────

  it("should return tokens on successful login", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    const result = await useCase.execute(baseInput);

    expect(result).toEqual({
      accessToken: "access-token-123",
      refreshToken: "refresh-raw-123",
      expiresIn: 900,
    });
  });

  it("should reset failed attempts on successful login", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
      failedLoginAttempts: 3,
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    await useCase.execute(baseInput);

    expect(userRepo.resetFailedAttempts).toHaveBeenCalledWith("u1");
  });

  it("should save refresh token to repository", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    await useCase.execute(baseInput);

    expect(refreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        tokenHash: "refresh-hash-123",
        deviceInfo: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
      })
    );
  });

  it("should register successful audit entry", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        success: true,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      })
    );
  });

  // ── Failed attempts and lockout ──────────────────────────────────

  it("should increment failed attempts on wrong password", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
      failedLoginAttempts: 2,
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
    expect(userRepo.incrementFailedAttempts).toHaveBeenCalledWith("u1");
    expect(userRepo.lockAccount).not.toHaveBeenCalled();
  });

  it("should lock account after 5 failed attempts", async () => {
    const user = createUser({
      id: "u1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
      failedLoginAttempts: 4, // next failure = 5th
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
    expect(userRepo.lockAccount).toHaveBeenCalledWith(
      "u1",
      expect.any(Date)
    );
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        failureReason: "Account locked after max attempts",
      })
    );
  });
});
