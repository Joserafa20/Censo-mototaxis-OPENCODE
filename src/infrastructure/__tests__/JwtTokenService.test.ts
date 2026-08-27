/**
 * Unit test: JwtTokenService
 *
 * Tests JWT access token generation and verification,
 * and refresh token generation (opaque + SHA-256 hash).
 */

import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { JwtTokenService } from "../services/JwtTokenService.js";
import { TokenExpiredError } from "../../domain/errors/AuthErrors.js";

describe("JwtTokenService", () => {
  const config = {
    accessSecret: "test-access-secret-key-for-unit-tests",
    accessExpiresInSeconds: 900, // 15 minutes
    refreshSecret: "test-refresh-secret-key-for-unit-tests",
    refreshExpiresInDays: 7,
  };

  const service = new JwtTokenService(config);

  describe("generateAccessToken", () => {
    it("should generate a valid JWT access token", () => {
      const token = service.generateAccessToken({
        id: "user-123",
        role: "admin",
      });

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("should encode userId and role in the payload", () => {
      const token = service.generateAccessToken({
        id: "user-456",
        role: "censista",
      });

      const decoded = jwt.verify(token, config.accessSecret) as {
        userId: string;
        role: string;
      };
      expect(decoded.userId).toBe("user-456");
      expect(decoded.role).toBe("censista");
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", () => {
      const token = service.generateAccessToken({
        id: "user-789",
        role: "admin",
      });

      const result = service.verifyAccessToken(token);
      expect(result.userId).toBe("user-789");
      expect(result.role).toBe("admin");
    });

    it("should throw TokenExpiredError for expired token", () => {
      // Create a token that expired 1 hour ago
      const token = jwt.sign(
        { userId: "user-999", role: "censista" },
        config.accessSecret,
        { expiresIn: "-1h" }
      );

      expect(() => service.verifyAccessToken(token)).toThrow(
        TokenExpiredError
      );
    });

    it("should throw for token signed with wrong secret", () => {
      const token = jwt.sign(
        { userId: "user-111", role: "admin" },
        "wrong-secret",
        { expiresIn: "15m" }
      );

      expect(() => service.verifyAccessToken(token)).toThrow();
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a raw token and its SHA-256 hash", () => {
      const { rawToken, tokenHash } = service.generateRefreshToken("user-123");

      expect(typeof rawToken).toBe("string");
      expect(rawToken.length).toBe(80); // 40 bytes = 80 hex chars

      expect(typeof tokenHash).toBe("string");
      expect(tokenHash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it("should produce unique tokens on each call", () => {
      const t1 = service.generateRefreshToken("user-123");
      const t2 = service.generateRefreshToken("user-123");

      expect(t1.rawToken).not.toBe(t2.rawToken);
      expect(t1.tokenHash).not.toBe(t2.tokenHash);
    });

    it("should match SHA-256 hash of the raw token", () => {
      const { rawToken, tokenHash } = service.generateRefreshToken("user-123");

      const expectedHash = createHash("sha256")
        .update(rawToken)
        .digest("hex");

      expect(tokenHash).toBe(expectedHash);
    });
  });
});
