/**
 * Tests: LogoutUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: token revocation, invalid token handling.
 */

import { LogoutUseCase } from "../LogoutUseCase.js";
import type { IRefreshTokenRepository } from "../../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../../domain/repositories/ILoginAuditRepository.js";
import { InvalidCredentialsError } from "../../../domain/errors/AuthErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

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

// ── Test suite ──────────────────────────────────────────────────────

describe("LogoutUseCase", () => {
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: LogoutUseCase;

  const baseInput = {
    refreshToken: "raw-token-to-invalidate",
    userId: "u1",
    ipAddress: "10.0.0.1",
    userAgent: "Chrome/120",
  };

  beforeEach(() => {
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    useCase = new LogoutUseCase(refreshTokenRepo, auditRepo);
  });

  // ── Invalid token ────────────────────────────────────────────────

  it("should throw InvalidCredentialsError when token hash not found", async () => {
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  // ── Successful logout ────────────────────────────────────────────

  it("should revoke the refresh token", async () => {
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue({
      id: "rt-1",
      userId: "u1",
      tokenHash: "hashed-token",
    });

    await useCase.execute(baseInput);

    expect(refreshTokenRepo.revoke).toHaveBeenCalledWith(expect.any(String));
  });

  it("should register audit entry on successful logout", async () => {
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue({
      id: "rt-2",
      userId: "u1",
      tokenHash: "hashed-token",
    });

    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        success: true,
        failureReason: null,
      })
    );
  });

  it("should be idempotent — revoking an already revoked token succeeds", async () => {
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue({
      id: "rt-3",
      userId: "u1",
      tokenHash: "already-revoked",
      revokedAt: new Date(),
    });

    // Should not throw — just revoke again
    await expect(useCase.execute(baseInput)).resolves.toBeUndefined();
    expect(refreshTokenRepo.revoke).toHaveBeenCalledWith(expect.any(String));
  });
});
