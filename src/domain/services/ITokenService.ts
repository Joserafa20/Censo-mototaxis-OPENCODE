/**
 * Service port: ITokenService
 *
 * Abstracts token generation and verification (JWT, opaque tokens, etc.).
 * Infrastructure layer provides the concrete implementation.
 */

import type { UserRole } from "../entities/User.js";

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

export interface TokenVerificationResult {
  userId: string;
  role: UserRole;
}

export interface ITokenService {
  generateAccessToken(user: { id: string; role: UserRole }): string;
  generateRefreshToken(userId: string): { rawToken: string; tokenHash: string };
  verifyAccessToken(token: string): TokenVerificationResult;
}
