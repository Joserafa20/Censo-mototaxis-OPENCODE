/**
 * Use case: LogoutUseCase
 *
 * Invalidates a refresh token server-side:
 * 1. Hash the raw token and look it up
 * 2. Revoke the token
 * 3. Register audit
 */

import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import { InvalidCredentialsError } from "../../domain/errors/AuthErrors.js";

export interface LogoutInput {
  refreshToken: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditRepo: ILoginAuditRepository
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    // 1. Hash the raw token to find it
    const tokenHash = await this.hashToken(input.refreshToken);

    // 2. Find the token
    const existingToken = await this.refreshTokenRepo.findActiveByHash(
      tokenHash
    );

    if (!existingToken) {
      throw new InvalidCredentialsError("Invalid refresh token");
    }

    // 3. Revoke the token (idempotent — safe if already revoked)
    await this.refreshTokenRepo.revoke(tokenHash);

    // 4. Register audit
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: input.userId,
      success: true,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      failureReason: null,
    });
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
