/**
 * Tests: EditUserProfileUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: permission checks, user not found, email/document uniqueness,
 * field updates, audit logging.
 */

import { EditUserProfileUseCase, EditUserProfileInput } from "../EditUserProfileUseCase.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../../domain/repositories/IUserAuditRepository.js";
import { createUser } from "../../../domain/entities/User.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
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

// ── Test suite ──────────────────────────────────────────────────────

describe("EditUserProfileUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: EditUserProfileUseCase;

  const targetUser = createUser({
    id: "user-1",
    passwordHash: "$2b$12$hashed",
    role: "censista",
    email: "censista@example.com",
    documentNumber: "1234567890",
    phoneNumber: "+573001234567",
  });

  beforeEach(() => {
    userRepo = makeUserRepo();
    auditRepo = makeAuditRepo();
    useCase = new EditUserProfileUseCase(userRepo, auditRepo);
    (userRepo.findById as jest.Mock).mockResolvedValue(targetUser);
  });

  // ── Permission checks ────────────────────────────────────────────

  it("should throw InsufficientPermissionsError when actor is not admin", async () => {
    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "actor-1",
      actorRole: "censista",
      email: "new@example.com",
    };

    await expect(useCase.execute(input)).rejects.toThrow(InsufficientPermissionsError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // ── User not found ───────────────────────────────────────────────

  it("should throw UserNotFoundError when target user does not exist", async () => {
    (userRepo.findById as jest.Mock).mockResolvedValue(null);

    const input: EditUserProfileInput = {
      targetUserId: "nonexistent",
      actorUserId: "admin-1",
      actorRole: "admin",
      email: "new@example.com",
    };

    await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
  });

  // ── Email uniqueness ─────────────────────────────────────────────

  it("should throw EmailAlreadyExistsError when email is taken by another user", async () => {
    const otherUser = createUser({
      id: "other",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      email: "taken@example.com",
    });
    (userRepo.findByEmail as jest.Mock).mockResolvedValue(otherUser);

    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      email: "taken@example.com",
    };

    await expect(useCase.execute(input)).rejects.toThrow(EmailAlreadyExistsError);
  });

  // ── Document uniqueness ──────────────────────────────────────────

  it("should throw DocumentAlreadyExistsError when document is taken by another user", async () => {
    const otherUser = createUser({
      id: "other",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      documentNumber: "9999999999",
    });
    (userRepo.findByDocument as jest.Mock).mockResolvedValue(otherUser);

    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      documentNumber: "9999999999",
    };

    await expect(useCase.execute(input)).rejects.toThrow(DocumentAlreadyExistsError);
  });

  // ── Successful updates ───────────────────────────────────────────

  it("should update email when changed", async () => {
    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      email: "updated@example.com",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "updated@example.com",
      })
    );
  });

  it("should update phoneNumber", async () => {
    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      phoneNumber: "+573009876543",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: "+573009876543",
      })
    );
  });

  it("should allow keeping the same email (no uniqueness conflict)", async () => {
    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      email: "censista@example.com", // same as current
      phoneNumber: "+573009999999",
    };

    await useCase.execute(input);

    expect(userRepo.save).toHaveBeenCalled();
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful edit", async () => {
    const input: EditUserProfileInput = {
      targetUserId: "user-1",
      actorUserId: "admin-1",
      actorRole: "admin",
      email: "updated@example.com",
    };

    await useCase.execute(input);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.updated",
        targetUserId: "user-1",
        actorUserId: "admin-1",
      })
    );
  });
});
