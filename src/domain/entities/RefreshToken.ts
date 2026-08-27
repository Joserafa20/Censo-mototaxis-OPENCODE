/**
 * Domain entity: RefreshToken
 *
 * Single-use refresh token with rotation and revocation support.
 * The tokenHash is a SHA-256 hash of the raw token string.
 */

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo: string;
  ipAddress: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Factory to create a RefreshToken with safe defaults.
 */
export function createRefreshToken(
  overrides: Partial<RefreshToken> & {
    id: string;
    userId: string;
    tokenHash: string;
    deviceInfo: string;
    ipAddress: string;
  }
): RefreshToken {
  const now = new Date();
  return {
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    revokedAt: null,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Checks whether the refresh token is still active (not revoked and not expired).
 */
export function isRefreshTokenActive(token: RefreshToken): boolean {
  return token.revokedAt === null && token.expiresAt > new Date();
}
