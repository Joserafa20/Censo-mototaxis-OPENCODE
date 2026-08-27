/**
 * Integration tests: Auth API
 *
 * Tests the full HTTP flow using Supertest against the Express app.
 * Uses in-memory mocks for all dependencies to avoid database coupling.
 */

import request from "supertest";
import express, { Router } from "express";
import { createServer } from "../server.js";
import { createAuthRoutes } from "../routes/auth.routes.js";
import { AuthController } from "../controllers/AuthController.js";
import { LoginUseCase } from "../../application/use-cases/LoginUseCase.js";
import { RefreshTokenUseCase } from "../../application/use-cases/RefreshTokenUseCase.js";
import { LogoutUseCase } from "../../application/use-cases/LogoutUseCase.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { JwtTokenService } from "../../infrastructure/services/JwtTokenService.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import { createUser } from "../../domain/entities/User.js";
import {
  InvalidCredentialsError,
  AccountLockedError,
  TokenExpiredError,
} from "../../domain/errors/AuthErrors.js";

// ── Shared config ────────────────────────────────────────────────────

const JWT_CONFIG = {
  accessSecret: "test-access-secret-integration",
  accessExpiresInSeconds: 900,
  refreshSecret: "test-refresh-secret-integration",
  refreshExpiresInDays: 7,
};

// ── Mock factories ──────────────────────────────────────────────────

function makeUserRepo(): IUserRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByDocument: jest.fn().mockResolvedValue(null),
    incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
    lockAccount: jest.fn().mockResolvedValue(undefined),
    resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    countActiveAdmins: jest.fn().mockResolvedValue(1),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
  };
}

function makeRefreshTokenRepo(): IRefreshTokenRepository {
  return {
    findActiveByHash: jest.fn().mockResolvedValue(null),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAuditRepo(): ILoginAuditRepository {
  return {
    create: jest.fn().mockImplementation((entry) =>
      Promise.resolve({
        id: entry.id ?? "audit-1",
        ...entry,
        createdAt: new Date(),
      })
    ),
  };
}

function makePasswordHasher(): IPasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue("$2b$12$hashed"),
    compare: jest.fn().mockResolvedValue(true),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("Auth API Integration", () => {
  let app: express.Express;
  let userRepo: ReturnType<typeof makeUserRepo>;
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let passwordHasher: ReturnType<typeof makePasswordHasher>;
  let tokenService: JwtTokenService;

  beforeEach(() => {
    userRepo = makeUserRepo();
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    passwordHasher = makePasswordHasher();
    tokenService = new JwtTokenService(JWT_CONFIG);

    const loginUseCase = new LoginUseCase(
      userRepo,
      refreshTokenRepo,
      auditRepo,
      passwordHasher,
      tokenService
    );
    const refreshTokenUseCase = new RefreshTokenUseCase(
      refreshTokenRepo,
      tokenService,
      auditRepo
    );
    const logoutUseCase = new LogoutUseCase(refreshTokenRepo, auditRepo);

    const authController = new AuthController(
      loginUseCase,
      refreshTokenUseCase,
      logoutUseCase
    );

    const authRoutes = createAuthRoutes(authController, tokenService);

    // Mount auth routes under /auth prefix to match the expected URL structure
    const apiRouter = Router();
    apiRouter.use("/auth", authRoutes);

    app = createServer(apiRouter);
    app.use(errorHandler);
  });

  // ── Health check ──────────────────────────────────────────────────

  describe("GET /health", () => {
    it("should return 200 with status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  // ── POST /api/v1/auth/login ───────────────────────────────────────

  describe("POST /api/v1/auth/login", () => {
    it("should return 200 with tokens on valid credentials", async () => {
      const user = createUser({
        id: "u1",
        passwordHash: "$2b$12$hashed",
        role: "admin",
        email: "admin@test.com",
      });
      (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "admin@test.com", password: "Secret123!" })
        .set("User-Agent", "TestAgent/1.0");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("expiresIn", 900);
      expect(typeof res.body.accessToken).toBe("string");
      expect(typeof res.body.refreshToken).toBe("string");
    });

    it("should return 400 when credential is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ password: "Secret123!" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("credential");
    });

    it("should return 400 when password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "admin@test.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("password");
    });

    it("should return 401 on invalid credentials", async () => {
      (userRepo.findByEmail as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "wrong@test.com", password: "Secret123!" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("InvalidCredentialsError");
    });

    it("should return 423 when account is locked", async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const user = createUser({
        id: "u1",
        passwordHash: "$2b$12$hashed",
        role: "admin",
        email: "admin@test.com",
        lockedUntil,
      });
      (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "admin@test.com", password: "Secret123!" });

      expect(res.status).toBe(423);
      expect(res.body.error).toBe("AccountLockedError");
    });

    it("should find user by document number when no @ in credential", async () => {
      const user = createUser({
        id: "u2",
        passwordHash: "$2b$12$hashed",
        role: "censista",
        documentNumber: "1234567890",
      });
      (userRepo.findByDocument as jest.Mock).mockResolvedValue(user);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "1234567890", password: "Secret123!" });

      expect(res.status).toBe(200);
      expect(userRepo.findByDocument).toHaveBeenCalledWith("1234567890");
    });
  });

  // ── POST /api/v1/auth/refresh ─────────────────────────────────────

  describe("POST /api/v1/auth/refresh", () => {
    it("should return 200 with new tokens on valid refresh token", async () => {
      // Generate a real refresh token and its hash
      const { rawToken, tokenHash } = tokenService.generateRefreshToken("u1");

      // Mock: find the token by hash
      (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue({
        id: "rt-1",
        userId: "u1",
        tokenHash,
        deviceInfo: "TestAgent/1.0",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: rawToken })
        .set("User-Agent", "TestAgent/1.0");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("expiresIn", 900);
    });

    it("should return 400 when refreshToken is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("refreshToken");
    });

    it("should return 401 on invalid refresh token", async () => {
      (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/v1/auth/logout ──────────────────────────────────────

  describe("POST /api/v1/auth/logout", () => {
    it("should return 204 on successful logout", async () => {
      // Generate a valid access token for the auth header
      const accessToken = tokenService.generateAccessToken({
        id: "u1",
        role: "admin",
      });

      // Generate a refresh token
      const { rawToken, tokenHash } = tokenService.generateRefreshToken("u1");

      // Mock: find the refresh token
      (refreshTokenRepo.findActiveByHash as jest.Mock).mockResolvedValue({
        id: "rt-1",
        userId: "u1",
        tokenHash,
        deviceInfo: "TestAgent/1.0",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: rawToken })
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", "TestAgent/1.0");

      expect(res.status).toBe(204);
      expect(refreshTokenRepo.revoke).toHaveBeenCalledWith(tokenHash);
    });

    it("should return 401 without access token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: "some-token" });

      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid access token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: "some-token" })
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });

    it("should return 400 when refreshToken body is missing", async () => {
      const accessToken = tokenService.generateAccessToken({
        id: "u1",
        role: "admin",
      });

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({})
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("refreshToken");
    });
  });

  // ── Full flow: login → refresh → logout ───────────────────────────

  describe("Full auth flow", () => {
    it("should complete login → refresh → logout cycle", async () => {
      // Setup: user exists with valid password
      const user = createUser({
        id: "u-flow",
        passwordHash: "$2b$12$hashed",
        role: "censista",
        email: "censista@test.com",
        documentNumber: "9876543210",
      });
      (userRepo.findByEmail as jest.Mock).mockResolvedValue(user);

      // Step 1: Login
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ credential: "censista@test.com", password: "Secret123!" })
        .set("User-Agent", "FlowTest/1.0");

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken: rt1 } = loginRes.body;

      // Step 2: Refresh
      // Mock: the old refresh token is found by hash
      const { tokenHash: rt1Hash } = tokenService.generateRefreshToken("u-flow");
      // We need to find by the hash that was stored during login
      // Since we mocked the token service, we know the hash
      // Let's re-mock: findActiveByHash should return the token for any hash
      // that matches what login stored
      (refreshTokenRepo.findActiveByHash as jest.Mock).mockImplementation(
        (hash: string) =>
          Promise.resolve({
            id: "rt-flow-1",
            userId: "u-flow",
            tokenHash: hash,
            deviceInfo: "FlowTest/1.0",
            ipAddress: "127.0.0.1",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            createdAt: new Date(),
          })
      );

      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: rt1 })
        .set("User-Agent", "FlowTest/1.0");

      expect(refreshRes.status).toBe(200);
      const { refreshToken: rt2 } = refreshRes.body;

      // Step 3: Logout (requires valid access token)
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: rt2 })
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", "FlowTest/1.0");

      expect(logoutRes.status).toBe(204);
      expect(refreshTokenRepo.revoke).toHaveBeenCalled();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle empty body on login", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({});

      expect(res.status).toBe(400);
    });

    it("should handle malformed Authorization header", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: "some-token" })
        .set("Authorization", "Basic abc123");

      expect(res.status).toBe(401);
    });

    it("should handle expired access token on logout", async () => {
      // Create an expired token
      const jwt = await import("jsonwebtoken");
      const expiredToken = jwt.default.sign(
        { userId: "u1", role: "admin" },
        JWT_CONFIG.accessSecret,
        { expiresIn: "-1h" }
      );

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: "some-token" })
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/v1/auth/unknown");
      expect(res.status).toBe(404);
    });
  });
});
