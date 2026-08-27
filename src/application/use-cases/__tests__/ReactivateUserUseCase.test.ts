/**
 * Tests: ReactivateUserUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: permission checks, user not found, already active (idempotent),
 * successful reactivation, audit logging.
 */

import { ReactivateUserUseCase, ReactivateUserInput } from "../ReactivateUserUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../../domain/repositories/IUserAuditRepository.js";
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

describe("ReactivateUserUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: ReactivateUserUseCase;

  const deactivatedUser = createUser({
    id: "user-1",
    passwordHash: "$2b$12$hashed",
    role: "censista",
    email: "censista@example.com",
    isActive: false,
    deactivatedAt: new Date("2025-01-01"),
    deactivatedBy: "admin-1",
  });

  beforeEach(() => {
    userRepo = makeUserRepo();
    auditRepo = makeAuditRepo();
    useCase = new ReactivateUserUseCase(userRepo, auditRepo);
    (userRepo.findById as jest.Mock).mockResolvedValue(deactivatedUser);
  });

  // ── Permission checks ────────────────────────────────────────────

  it("should throw InsufficientPermissionsError when actor is not admin", async () => {
    const input: ReactivateUserInput = {
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

    const input: ReactivateUserInput = {
      targetUserId: "nonexistent",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
  });

  // ── Already active (idempotent) ──────────────────────────────────

  it("should be idempotent when user is already active", async () => {
    const activeUser = createUser({
      id: "user-1",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      isActive: true,
    });
    (userRepo.findById as jest.Mock).mockResolvedValue(activeUser);

    const input: ReactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
    };

    await useCase.execute(input);

    // Should not save or create audit when already active
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(auditRepo.create).not.toHaveBeenCalled();
  });

  // ── Successful reactivation ──────────────────────────────────────

  it("should reactivate user and clear deactivation metadata", async () => {
    const input: ReactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-2",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
      })
    );
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful reactivation", async () => {
    const input: ReactivateUserInput = {
      targetUserId: "user-1",
      actorUserId: "admin-2",
      actorRole: "admin",
    };

    await useCase.execute(input);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.reactivated",
        targetUserId: "user-1",
        actorUserId: "admin-2",
      })
    );
  });
});
