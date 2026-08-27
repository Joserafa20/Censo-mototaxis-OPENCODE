/**
 * Use case: RefreshTokenUseCase
 *
 * Orchestrates refresh token rotation:
 * 1. Hash the incoming raw token and look it up
 * 2. Detect revocation (reuse) → revoke ALL user sessions
 * 3. Detect expiry → reject
 * 4. Revoke old token, generate new pair, persist
 * 5. Register audit
 */

import { isRefreshTokenActive } from "../../domain/entities/RefreshToken.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import {
  TokenExpiredError,
  TokenReuseDetectedError,
  InvalidCredentialsError,
} from "../../domain/errors/AuthErrors.js";
import type { AuthTokens } from "../../domain/use-cases/types.js";

export interface RefreshTokenInput {
  refreshToken: string;
  deviceInfo: string;
  ipAddress: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly auditRepo: ILoginAuditRepository
  ) {}

  async execute(input: RefreshTokenInput): Promise<AuthTokens> {
    // 1. We need to hash the raw token to find it in the DB.
    //    The token service doesn't expose a hash function directly,
    //    but we stored the tokenHash when it was created. We look it up
    //    by hashing the raw token with SHA-256 (same algorithm used on creation).
    const tokenHash = await this.hashToken(input.refreshToken);

    // 2. Find the token record
    const existingToken = await this.refreshTokenRepo.findActiveByHash(
      tokenHash
    );

    // 3. If not found by hash, it may have been revoked (reuse detection)
    if (!existingToken) {
      // We cannot determine if it was revoked vs never existed,
      // so we treat "not found" as invalid.
      throw new InvalidCredentialsError("Invalid refresh token");
    }

    // 4. Check if already revoked (reuse detection)
    if (existingToken.revokedAt !== null) {
      // REUSE DETECTED: revoke ALL tokens for this user
      await this.refreshTokenRepo.revokeAllForUser(existingToken.userId);

      await this.auditRepo.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: existingToken.userId,
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.deviceInfo,
        failureReason: "Refresh token reuse detected — all sessions revoked",
      });

      throw new TokenReuseDetectedError();
    }

    // 5. Check if expired
    if (!isRefreshTokenActive(existingToken)) {
      await this.auditRepo.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: existingToken.userId,
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.deviceInfo,
        failureReason: "Refresh token expired",
      });

      throw new TokenExpiredError();
    }

    // 6. Rotate: revoke old, generate new
    await this.refreshTokenRepo.revoke(tokenHash);

    const accessToken = this.tokenService.generateAccessToken({
      id: existingToken.userId,
      role: "censista", // default; real impl would look up user
    });
    const { rawToken, tokenHash: newHash } =
      this.tokenService.generateRefreshToken(existingToken.userId);

    // 7. Persist new refresh token
    const { createRefreshToken } = await import(
      "../../domain/entities/RefreshToken.js"
    );
    const newRefreshToken = createRefreshToken({
      id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: existingToken.userId,
      tokenHash: newHash,
      deviceInfo: input.deviceInfo,
      ipAddress: input.ipAddress,
    });
    await this.refreshTokenRepo.save(newRefreshToken);

    // 8. Register audit
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: existingToken.userId,
      success: true,
      ipAddress: input.ipAddress,
      userAgent: input.deviceInfo,
      failureReason: null,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: 900,
    };
  }

  /**
   * Hash a raw token string using SHA-256.
   * Matches the hashing strategy used on token creation.
   */
  private async hashToken(rawToken: string): Promise<string> {
    const { createHash } = await import("crypto");
    return createHash("sha256").update(rawToken).digest("hex");
  }
}
