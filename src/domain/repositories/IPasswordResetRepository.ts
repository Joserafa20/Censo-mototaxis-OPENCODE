/**
 * Repository port: IPasswordResetRepository
 *
 * Persistence interface for PasswordResetToken entities.
 * Supports create, find-valid, and mark-as-used lifecycle.
 */

import type { PasswordResetToken } from "../entities/PasswordResetToken.js";

export interface IPasswordResetRepository {
  create(token: PasswordResetToken): Promise<void>;
  findValidByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(tokenHash: string): Promise<void>;
  deleteExpired(): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
