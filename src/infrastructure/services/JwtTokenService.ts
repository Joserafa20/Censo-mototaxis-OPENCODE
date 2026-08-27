/**
 * Service adapter: JwtTokenService
 *
 * Implements ITokenService using jsonwebtoken.
 * Generates Access tokens (short-lived JWT) and Refresh tokens (opaque, SHA-256 hashed).
 */

import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import type {
  ITokenService,
  TokenVerificationResult,
} from "../../domain/services/ITokenService.js";
import type { UserRole } from "../../domain/entities/User.js";
import { TokenExpiredError } from "../../domain/errors/AuthErrors.js";

export interface JwtTokenServiceConfig {
  accessSecret: string;
  /** Access token TTL in seconds (e.g. 900 for 15 minutes) */
  accessExpiresInSeconds: number;
  refreshSecret: string;
  refreshExpiresInDays: number;
}

export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  generateAccessToken(user: { id: string; role: UserRole }): string {
    const payload = { userId: user.id, role: user.role };
    return jwt.sign(payload, this.config.accessSecret, {
      expiresIn: this.config.accessExpiresInSeconds,
    });
  }

  generateRefreshToken(userId: string): {
    rawToken: string;
    tokenHash: string;
  } {
    // Generate a cryptographically secure random token
    const rawToken = randomBytes(40).toString("hex");

    // Hash the token for storage (SHA-256)
    const tokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");

    return { rawToken, tokenHash };
  }

  verifyAccessToken(token: string): TokenVerificationResult {
    try {
      const decoded = jwt.verify(token, this.config.accessSecret) as {
        userId: string;
        role: UserRole;
      };
      return { userId: decoded.userId, role: decoded.role };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw error;
    }
  }
}
