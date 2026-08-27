/**
 * Tests: ManualPasswordResetUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: permission checks, user not found, token generation,
 * forcePasswordChange flag, session revocation, audit logging.
 */

import { ManualPasswordResetUseCase, ManualPasswordResetInput } from "../ManualPasswordResetUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IPasswordResetRepository } from "../../../domain/repositories/IPasswordResetRepository.js";
import type { IRefreshTokenRepository } from "../../../domain/repositories/IRefreshTokenRepository.js";
import type { IUserAuditRepository } from "../../../domain/repositories/IUserAuditRepository.js";
import type { ISecureTokenGenerator } from "../../../domain/services/ISecureTokenGenerator.js";
import { createUser } from "../../../domain/entities/User.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
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

function makePasswordResetRepo(): IPasswordResetRepository {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findValidByHash: jest.fn().mockResolvedValue(null),
    markUsed: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
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

function makeTokenGenerator(): ISecureTokenGenerator {
  return {
    generate: jest.fn().mockReturnValue({
      rawToken: "raw-reset-token-abc123",
      tokenHash: "sha256-hash-of-token",
    }),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("ManualPasswordResetUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let passwordResetRepo: ReturnType<typeof makePasswordResetRepo>;
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let tokenGenerator: ReturnType<typeof makeTokenGenerator>;
  let useCase: ManualPasswordResetUseCase;

  const targetUser = createUser({
    id: "user-1",
    passwordHash: "$2b$12$hashed",
    role: "censista",
    email: "censista@example.com",
  });

  beforeEach(() => {
    userRepo = makeUserRepo();
    passwordResetRepo = makePasswordResetRepo();
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    tokenGenerator = makeTokenGenerator();
    useCase = new ManualPasswordResetUseCase(
      userRepo,
      passwordResetRepo,
      refreshTokenRepo,
      auditRepo,
      tokenGenerator
    );
    (userRepo.findById as jest.Mock).mockResolvedValue(targetUser);
  });

  // ── Permission checks ────────────────────────────────────────────

  it("should throw InsufficientPermissionsError when actor is not admin", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "actor-1",
      actorRole: "censista",
    };

    await expect(useCase.execute(input)).rejects.toThrow(InsufficientPermissionsError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // ── User not found ───────────────────────────────────────────────

  it("should throw UserNotFoundError when target user does not exist", async () => {
    (userRepo.findById as jest.Mock).mockResolvedValue(null);

    const input: ManualPasswordResetInput = {
      targetUserId: "nonexistent",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
  });

  // ── Token generation ─────────────────────────────────────────────

  it("should generate a secure token", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(tokenGenerator.generate).toHaveBeenCalled();
  });

  it("should return the raw token in the output", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    const result = await useCase.execute(input);

    expect(result).toEqual({ rawToken: "raw-reset-token-abc123" });
  });

  // ── Password reset token persistence ─────────────────────────────

  it("should create a password reset token entity", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(passwordResetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tokenHash: "sha256-hash-of-token",
      })
    );
  });

  // ── forcePasswordChange flag ─────────────────────────────────────

  it("should set forcePasswordChange to true on the user", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        forcePasswordChange: true,
      })
    );
  });

  // ── Session revocation ───────────────────────────────────────────

  it("should revoke all active sessions for the target user", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(refreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith("user-1");
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful password reset", async () => {
    const input: ManualPasswordResetInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.password_reset",
        targetUserId: "user-1",
        actorUserId: "admin-1",
      })
    );
  });
});
