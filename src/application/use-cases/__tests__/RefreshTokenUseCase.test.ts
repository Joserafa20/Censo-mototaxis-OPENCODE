/**
 * Tests: RefreshTokenUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: token validation, reuse detection, rotation, expiry handling.
 */

import { RefreshTokenUseCase } from "../RefreshTokenUseCase.js";
import type { IRefreshTokenRepository } from "../../../domain/repositories/IRefreshTokenRepository.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import type { ILoginAuditRepository } from "../../../domain/repositories/ILoginAuditRepository.js";
import { createRefreshToken } from "../../../domain/entities/RefreshToken.js";
import {
  TokenExpiredError,
  TokenReuseDetectedError,
  InvalidCredentialsError,
} from "../../../domain/errors/AuthErrors.js";

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

function makeTokenService(): ITokenService {
  return {
    generateAccessToken: jest.fn().mockReturnValue("new-access-token"),
    generateRefreshToken: jest.fn().mockReturnValue({
      rawToken: "new-refresh-raw",
      tokenHash: "new-refresh-hash",
    }),
    verifyAccessToken: jest.fn(),
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

describe("RefreshTokenUseCase", () => {
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let tokenService: ReturnType<typeof makeTokenService>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: RefreshTokenUseCase;

  const baseInput = {
    refreshToken: "raw-token-value",
    deviceInfo: "Chrome/120",
    ipAddress: "10.0.0.1",
  };

  beforeEach(() => {
    refreshTokenRepo = makeRefreshTokenRepo();
    tokenService = makeTokenService();
    auditRepo = makeAuditRepo();
    useCase = new RefreshTokenUseCase(
      refreshTokenRepo,
      tokenService,
      auditRepo
    );
  });

  // ── Invalid / expired token ──────────────────────────────────────

  it("should throw InvalidCredentialsError when token hash not found", async () => {
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  it("should throw TokenExpiredError when token is expired", async () => {
    const expiredToken = createRefreshToken({
      id: "rt-1",
      userId: "u1",
      tokenHash: "hashed-token",
      deviceInfo: "Chrome",
      ipAddress: "1.1.1.1",
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(
      expiredToken
    );

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      TokenExpiredError
    );
  });

  // ── Token reuse detection ────────────────────────────────────────

  it("should detect token reuse when token is already revoked", async () => {
    const revokedToken = createRefreshToken({
      id: "rt-3",
      userId: "u1",
      tokenHash: "hashed-token",
      deviceInfo: "Chrome",
      ipAddress: "1.1.1.1",
      revokedAt: new Date(),
    });
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(
      revokedToken
    );

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      TokenReuseDetectedError
    );
  });

  it("should revoke all user sessions on reuse detection", async () => {
    const revokedToken = createRefreshToken({
      id: "rt-4",
      userId: "u1",
      tokenHash: "hashed-token",
      deviceInfo: "Chrome",
      ipAddress: "1.1.1.1",
      revokedAt: new Date(),
    });
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(
      revokedToken
    );

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      TokenReuseDetectedError
    );
    expect(refreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith("u1");
  });

  // ── Successful rotation ──────────────────────────────────────────

  it("should revoke old token and save new one on successful refresh", async () => {
    const activeToken = createRefreshToken({
      id: "rt-5",
      userId: "u1",
      tokenHash: "hashed-token",
      deviceInfo: "Chrome",
      ipAddress: "1.1.1.1",
    });
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(
      activeToken
    );

    const result = await useCase.execute(baseInput);

    expect(refreshTokenRepo.revoke).toHaveBeenCalledWith(expect.any(String));
    expect(refreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        tokenHash: "new-refresh-hash",
      })
    );
    expect(result).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-raw",
      expiresIn: 900,
    });
  });

  it("should register audit entry on successful refresh", async () => {
    const activeToken = createRefreshToken({
      id: "rt-6",
      userId: "u1",
      tokenHash: "hashed-token",
      deviceInfo: "Chrome",
      ipAddress: "1.1.1.1",
    });
    (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(
      activeToken
    );

    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        success: true,
        failureReason: null,
      })
    );
  });
});
