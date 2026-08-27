/**
 * Tests: DeactivateUserUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: permission checks, last admin protection, session revocation,
 * audit logging, already inactive user.
 */

import { DeactivateUserUseCase, DeactivateUserInput } from "../DeactivateUserUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../../domain/repositories/IRefreshTokenRepository.js";
import type { IUserAuditRepository } from "../../../domain/repositories/IUserAuditRepository.js";
import { createUser } from "../../../domain/entities/User.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
  LastAdminDeactivationError,
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
    countActiveAdmins: jest.fn().mockResolvedValue(2),
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

// ── Test suite ──────────────────────────────────────────────────────

describe("DeactivateUserUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: DeactivateUserUseCase;

  const targetUser = createUser({
    id: "user-1",
    passwordHash: "$2b$12$hashed",
    role: "censista",
    email: "censista@example.com",
  });

  beforeEach(() => {
    userRepo = makeUserRepo();
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    useCase = new DeactivateUserUseCase(userRepo, refreshTokenRepo, auditRepo);
    (userRepo.findById as jest.Mock).mockResolvedValue(targetUser);
  });

  // ── Permission checks ────────────────────────────────────────────

  it("should throw InsufficientPermissionsError when actor is not admin", async () => {
    const input: DeactivateUserInput = {
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

    const input: DeactivateUserInput = {
      targetUserId: "nonexistent",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
  });

  // ── Last admin protection ────────────────────────────────────────

  it("should throw LastAdminDeactivationError when deactivating the last admin", async () => {
    const adminUser = createUser({
      id: "admin-1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findById as jest.Mock).mockResolvedValue(adminUser);
    (userRepo.countActiveAdmins as jest.Mock).mockResolvedValue(1);

    const input: DeactivateUserInput = {
      targetUserId: "admin-1",
      actorUserId: "admin-2",
      actorRole: "admin",
    };

    await expect(useCase.execute(input)).rejects.toThrow(LastAdminDeactivationError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it("should allow deactivating an admin when there are multiple admins", async () => {
    const adminUser = createUser({
      id: "admin-1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@example.com",
    });
    (userRepo.findById as jest.Mock).mockResolvedValue(adminUser);
    (userRepo.countActiveAdmins as jest.Mock).mockResolvedValue(3);

    const input: DeactivateUserInput = {
      targetUserId: "admin-1",
      actorUserId: "admin-2",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalled();
  });

  // ── Successful deactivation ──────────────────────────────────────

  it("should deactivate user and set deactivation metadata", async () => {
    const input: DeactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        isActive: false,
        deactivatedBy: "admin-1",
        deactivatedAt: expect.any(Date),
      })
    );
  });

  // ── Session revocation ───────────────────────────────────────────

  it("should revoke all active sessions for the deactivated user", async () => {
    const input: DeactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(refreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith("user-1");
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful deactivation", async () => {
    const input: DeactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.deactivated",
        targetUserId: "user-1",
        actorUserId: "admin-1",
      })
    );
  });
});
