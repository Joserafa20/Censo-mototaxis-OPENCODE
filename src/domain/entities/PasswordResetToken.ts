/**
 * Domain entity: PasswordResetToken
 *
 * Single-use token for password reset flow.
 * The tokenHash is a SHA-256 hash of the raw token string.
 * Tokens have a configurable TTL and are invalidated after use or expiry.
 */

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Factory to create a PasswordResetToken with safe defaults.
 * Default TTL is 1 hour.
 */
export function createPasswordResetToken(
  overrides: Partial<PasswordResetToken> & {
    id: string;
    userId: string;
    tokenHash: string;
  }
): PasswordResetToken {
  const now = new Date();
  return {
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
    usedAt: null,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Checks whether the password reset token is still valid (not used and not expired).
 */
export function isPasswordResetTokenValid(token: PasswordResetToken): boolean {
  return token.usedAt === null && token.expiresAt > new Date();
}
