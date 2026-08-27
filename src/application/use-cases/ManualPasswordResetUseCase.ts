/**
 * Use case: ManualPasswordResetUseCase
 *
 * Admin-initiated password reset:
 * 1. Only admins can perform this action
 * 2. Generates a secure reset token
 * 3. Marks the user with forcePasswordChange = true
 * 4. Revokes all existing refresh tokens
 * 5. Registers an audit entry
 *
 * Returns the raw token for the admin to share with the user.
 */

import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordResetRepository } from "../../domain/repositories/IPasswordResetRepository.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import type { ISecureTokenGenerator } from "../../domain/services/ISecureTokenGenerator.js";
import { createPasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
} from "../../domain/errors/AuthErrors.js";

export interface ManualPasswordResetInput {
  targetUserId: string;
  actorUserId: string;
  actorRole: string;
}

export interface ManualPasswordResetOutput {
  rawToken: string;
}

export class ManualPasswordResetUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordResetRepo: IPasswordResetRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditRepo: IUserAuditRepository,
    private readonly tokenGenerator: ISecureTokenGenerator
  ) {}

  async execute(input: ManualPasswordResetInput): Promise<ManualPasswordResetOutput> {
    // 1. Verify actor is admin
    if (input.actorRole !== "admin") {
      throw new InsufficientPermissionsError("Only admins can perform manual password resets");
    }

    // 2. Find target user
    const targetUser = await this.userRepo.findById(input.targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`User ${input.targetUserId} not found`);
    }

    // 3. Generate secure token
    const { rawToken, tokenHash } = this.tokenGenerator.generate();

    // 4. Create password reset token entity
    const resetToken = createPasswordResetToken({
      id: `prt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: input.targetUserId,
      tokenHash,
    });
    await this.passwordResetRepo.create(resetToken);

    // 5. Mark user with forcePasswordChange
    await this.userRepo.save({
      ...targetUser,
      forcePasswordChange: true,
    });

    // 6. Revoke all existing sessions
    await this.refreshTokenRepo.revokeAllForUser(input.targetUserId);

    // 7. Register audit entry
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetUserId: input.targetUserId,
      actorUserId: input.actorUserId,
      action: "user.password_reset",
      details: JSON.stringify({ initiatedBy: "admin", method: "manual" }),
      ipAddress: null,
    });

    return { rawToken };
  }
}
