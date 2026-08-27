/**
 * Use case: ReactivateUserUseCase
 *
 * Reactivates a previously deactivated user:
 * 1. Only admins can perform this action
 * 2. User must currently be inactive
 * 3. Registers an audit entry
 */

import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
} from "../../domain/errors/AuthErrors.js";

export interface ReactivateUserInput {
  targetUserId: string;
  actorUserId: string;
  actorRole: string;
}

export class ReactivateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IUserAuditRepository
  ) {}

  async execute(input: ReactivateUserInput): Promise<void> {
    // 1. Verify actor is admin
    if (input.actorRole !== "admin") {
      throw new InsufficientPermissionsError("Only admins can reactivate users");
    }

    // 2. Find target user
    const targetUser = await this.userRepo.findById(input.targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`User ${input.targetUserId} not found`);
    }

    // 3. Check if user is already active
    if (targetUser.isActive) {
      return; // Already active, idempotent
    }

    // 4. Reactivate user
    const reactivatedUser = {
      ...targetUser,
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
    };
    await this.userRepo.save(reactivatedUser);

    // 5. Register audit entry
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetUserId: input.targetUserId,
      actorUserId: input.actorUserId,
      action: "user.reactivated",
      details: JSON.stringify({ previousDeactivatedAt: targetUser.deactivatedAt }),
      ipAddress: null,
    });
  }
}
