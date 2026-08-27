/**
 * Use case: EditUserProfileUseCase
 *
 * Allows an admin to edit another user's profile:
 * - Only admins can perform this action
 * - Validates email/document uniqueness if changed
 * - Registers an audit entry
 */

import type { User, DocumentType } from "../../domain/entities/User.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import {
  UserNotFoundError,
  InsufficientPermissionsError,
  EmailAlreadyExistsError,
  DocumentAlreadyExistsError,
} from "../../domain/errors/AuthErrors.js";

export interface EditUserProfileInput {
  targetUserId: string;
  actorUserId: string;
  actorRole: string;
  email?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  phoneNumber?: string;
}

export class EditUserProfileUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IUserAuditRepository
  ) {}

  async execute(input: EditUserProfileInput): Promise<void> {
    // 1. Verify actor is admin
    if (input.actorRole !== "admin") {
      throw new InsufficientPermissionsError("Only admins can edit user profiles");
    }

    // 2. Find target user
    const targetUser = await this.userRepo.findById(input.targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`User ${input.targetUserId} not found`);
    }

    // 3. Validate email uniqueness if changed
    if (input.email !== undefined && input.email !== targetUser.email) {
      const existing = await this.userRepo.findByEmail(input.email);
      if (existing) {
        throw new EmailAlreadyExistsError(input.email);
      }
    }

    // 4. Validate document uniqueness if changed
    if (input.documentNumber !== undefined && input.documentNumber !== targetUser.documentNumber) {
      const existing = await this.userRepo.findByDocument(input.documentNumber);
      if (existing) {
        throw new DocumentAlreadyExistsError(input.documentNumber);
      }
    }

    // 5. Update fields
    const updatedUser: User = {
      ...targetUser,
      email: input.email !== undefined ? input.email : targetUser.email,
      documentType: input.documentType !== undefined ? input.documentType : targetUser.documentType,
      documentNumber: input.documentNumber !== undefined ? input.documentNumber : targetUser.documentNumber,
      phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : targetUser.phoneNumber,
    };

    await this.userRepo.save(updatedUser);

    // 6. Register audit entry
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetUserId: input.targetUserId,
      actorUserId: input.actorUserId,
      action: "user.updated",
      details: JSON.stringify({
        changedFields: Object.keys(input).filter(
          (k) => k !== "targetUserId" && k !== "actorUserId" && k !== "actorRole"
        ),
      }),
      ipAddress: null,
    });
  }
}
