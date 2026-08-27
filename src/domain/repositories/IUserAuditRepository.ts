/**
 * Repository port: IUserAuditRepository
 *
 * Persistence interface for UserAuditLog entities.
 * Append-only — creates audit entries, never modifies them.
 */

import type { UserAuditAction, UserAuditLog } from "../entities/UserAuditLog.js";

export interface IUserAuditRepository {
  create(entry: Omit<UserAuditLog, "id" | "createdAt"> & { id?: string }): Promise<UserAuditLog>;
  findByTargetUser(targetUserId: string, options?: { limit?: number; offset?: number }): Promise<UserAuditLog[]>;
  findByAction(action: UserAuditAction, options?: { limit?: number; offset?: number }): Promise<UserAuditLog[]>;
}
