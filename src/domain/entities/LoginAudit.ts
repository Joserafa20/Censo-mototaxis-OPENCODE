/**
 * Domain entity: LoginAudit
 *
 * Immutable audit record for login attempts (success or failure).
 * Used for security monitoring and compliance.
 */

export interface LoginAudit {
  id: string;
  userId: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason: string | null;
  createdAt: Date;
}

/**
 * Factory to create a LoginAudit entry.
 */
export function createLoginAudit(
  overrides: Partial<LoginAudit> & {
    id: string;
    userId: string;
    success: boolean;
    ipAddress: string;
    userAgent: string;
  }
): LoginAudit {
  return {
    failureReason: null,
    createdAt: new Date(),
    ...overrides,
  };
}
