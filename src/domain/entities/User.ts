/**
 * Domain entity: User
 *
 * Represents a system user. Roles:
 * - admin: requires email, manages system
 * - censista: requires documentNumber, performs census tasks
 */

export type UserRole = "admin" | "censista";

export type DocumentType = "CC" | "CE" | "TI";

export interface User {
  id: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  documentType: DocumentType | null;
  documentNumber: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

/**
 * Factory to create a User with safe defaults.
 */
export function createUser(overrides: Partial<User> & { id: string; passwordHash: string; role: UserRole }): User {
  return {
    email: null,
    documentType: null,
    documentNumber: null,
    phoneNumber: null,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

/**
 * Checks whether the user account is currently locked.
 */
export function isAccountLocked(user: User): boolean {
  if (user.lockedUntil === null) return false;
  return user.lockedUntil > new Date();
}
