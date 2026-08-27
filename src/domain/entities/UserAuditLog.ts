/**
 * Domain entity: UserAuditLog
 *
 * Immutable audit record for user management actions.
 * Tracks all administrative changes for compliance and security.
 */

export type UserAuditAction =
  | "user.created"
  | "user.updated"
  | "user.deactivated"
  | "user.reactivated"
  | "user.role_changed"
  | "user.password_reset"
  | "user.password_changed"
  | "user.locked"
  | "user.unlocked";

export interface UserAuditLog {
  id: string;
  targetUserId: string;
  actorUserId: string | null;
  action: UserAuditAction;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * Factory to create a UserAuditLog entry.
 */
export function createUserAuditLog(
  overrides: Partial<UserAuditLog> & {
    id: string;
    targetUserId: string;
    action: UserAuditAction;
  }
): UserAuditLog {
  return {
    actorUserId: null,
    details: null,
    ipAddress: null,
    createdAt: new Date(),
    ...overrides,
  };
}
