/**
 * Use case: CreateUserUseCase
 *
 * Creates a new user in the system:
 * 1. Validates email/document uniqueness
 * 2. Hashes the password
 * 3. Persists the user
 * 4. Registers an audit entry
 */

import type { User, UserRole, DocumentType } from "../../domain/entities/User.js";
import { createUser } from "../../domain/entities/User.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import {
  EmailAlreadyExistsError,
  DocumentAlreadyExistsError,
  InsufficientPermissionsError,
} from "../../domain/errors/AuthErrors.js";

export interface CreateUserInput {
  email?: string | null;
  password: string;
  role: UserRole;
  documentType?: DocumentType | null;
  documentNumber?: string | null;
  phoneNumber?: string | null;
  actorUserId: string;
}

export interface CreateUserOutput {
  userId: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IUserAuditRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // 1. Validate uniqueness constraints
    if (input.email) {
      const existingByEmail = await this.userRepo.findByEmail(input.email);
      if (existingByEmail) {
        throw new EmailAlreadyExistsError(input.email);
      }
    }

    if (input.documentNumber) {
      const existingByDoc = await this.userRepo.findByDocument(input.documentNumber);
      if (existingByDoc) {
        throw new DocumentAlreadyExistsError(input.documentNumber);
      }
    }

    // 2. Hash password
    const passwordHash = await this.passwordHasher.hash(input.password);

    // 3. Create user entity
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = createUser({
      id: userId,
      passwordHash,
      role: input.role,
      email: input.email ?? null,
      documentType: input.documentType ?? null,
      documentNumber: input.documentNumber ?? null,
      phoneNumber: input.phoneNumber ?? null,
    });

    // 4. Persist user
    await this.userRepo.save(user);

    // 5. Register audit entry
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetUserId: userId,
      actorUserId: input.actorUserId,
      action: "user.created",
      details: JSON.stringify({ role: input.role, email: input.email }),
      ipAddress: null,
    });

    return { userId };
  }
}
