/**
 * Repository port: IRefreshTokenRepository
 *
 * Persistence interface for RefreshToken entities.
 * Supports rotation (find → revoke → save new) and reuse detection.
 */

import type { RefreshToken } from "../entities/RefreshToken.js";

export interface IRefreshTokenRepository {
  findActiveByHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  save(token: RefreshToken): Promise<void>;
  deleteExpired(): Promise<void>;
}
