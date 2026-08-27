/**
 * Use case: DeactivateUserUseCase
 *
 * Logically deactivates a user:
 * 1. Only admins can perform this action
 * 2. Cannot deactivate the last active admin
 * 3. Revokes all active sessions
 * 4. Registers an audit entry
 */

import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
  LastAdminDeactivationError,
} from "../../domain/errors/AuthErrors.js";

export interface DeactivateUserInput {
  targetUserId: string;
  actorUserId: string;
  actorRole: string;
}

export class DeactivateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditRepo: IUserAuditRepository
  ) {}

  async execute(input: DeactivateUserInput): Promise<void> {
    // 1. Verify actor is admin
    if (input.actorRole !== "admin") {
      throw new InsufficientPermissionsError("Only admins can deactivate users");
    }

    // 2. Find target user
    const targetUser = await this.userRepo.findById(input.targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`User ${input.targetUserId} not found`);
    }

    // 3. Check if target is the last active admin
    if (targetUser.role === "admin" && targetUser.isActive) {
      const activeAdminCount = await this.userRepo.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new LastAdminDeactivationError();
      }
    }

    // 4. Deactivate user
    const deactivatedUser = {
      ...targetUser,
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: input.actorUserId,
    };
    await this.userRepo.save(deactivatedUser);

    // 5. Revoke all active sessions
    await this.refreshTokenRepo.revokeAllForUser(input.targetUserId);

    // 6. Register audit entry
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetUserId: input.targetUserId,
      actorUserId: input.actorUserId,
      action: "user.deactivated",
      details: JSON.stringify({
        previousRole: targetUser.role,
        reason: "admin_deactivation",
      }),
      ipAddress: null,
    });
  }
}
