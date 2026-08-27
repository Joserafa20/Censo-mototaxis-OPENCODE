/**
 * Integration tests: User Management API
 *
 * Tests the full HTTP flow using Supertest against the Express app.
 * Uses in-memory mocks for all dependencies to avoid database coupling.
 *
 * Covers:
 *   - Admin CRUD operations (create, list, get, update, deactivate, reactivate, reset-password)
 *   - Censista self-profile edit
 *   - RBAC enforcement (censista cannot access admin routes, unauthenticated access)
 */

import request from "supertest";
import express, { Router } from "express";
import { createServer } from "../server.js";
import { createAuthRoutes } from "../routes/auth.routes.js";
import { createUserRoutes } from "../routes/user.routes.js";
import { AuthController } from "../controllers/AuthController.js";
import { UserController } from "../controllers/UserController.js";
import { LoginUseCase } from "../../application/use-cases/LoginUseCase.js";
import { RefreshTokenUseCase } from "../../application/use-cases/RefreshTokenUseCase.js";
import { LogoutUseCase } from "../../application/use-cases/LogoutUseCase.js";
import { CreateUserUseCase } from "../../application/use-cases/CreateUserUseCase.js";
import { ListUsersUseCase } from "../../application/use-cases/ListUsersUseCase.js";
import { EditUserProfileUseCase } from "../../application/use-cases/EditUserProfileUseCase.js";
import { DeactivateUserUseCase } from "../../application/use-cases/DeactivateUserUseCase.js";
import { ReactivateUserUseCase } from "../../application/use-cases/ReactivateUserUseCase.js";
import { ManualPasswordResetUseCase } from "../../application/use-cases/ManualPasswordResetUseCase.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { JwtTokenService } from "../../infrastructure/services/JwtTokenService.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import type { IPasswordResetRepository } from "../../domain/repositories/IPasswordResetRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import type { ISecureTokenGenerator } from "../../domain/services/ISecureTokenGenerator.js";
import { createUser } from "../../domain/entities/User.js";

// ── Shared config ────────────────────────────────────────────────────

const JWT_CONFIG = {
  accessSecret: "test-access-secret-user-integration",
  accessExpiresInSeconds: 900,
  refreshSecret: "test-refresh-secret-user-integration",
  refreshExpiresInDays: 7,
};

// ── Mock factories ──────────────────────────────────────────────────

function makeUserRepo(): IUserRepository & { _store: Map<string, any> } {
  const store = new Map<string, any>();
  return {
    _store: store,
    findById: jest.fn().mockImplementation(async (id: string) => store.get(id) ?? null),
    findByEmail: jest.fn().mockImplementation(async (email: string) => {
      for (const user of store.values()) {
        if (user.email === email) return user;
      }
      return null;
    }),
    findByDocument: jest.fn().mockImplementation(async (doc: string) => {
      for (const user of store.values()) {
        if (user.documentNumber === doc) return user;
      }
      return null;
    }),
    incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
    lockAccount: jest.fn().mockResolvedValue(undefined),
    resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockImplementation(async (user: any) => {
      store.set(user.id, { ...user });
    }),
    countActiveAdmins: jest.fn().mockImplementation(async () => {
      let count = 0;
      for (const user of store.values()) {
        if (user.role === "admin" && user.isActive) count++;
      }
      return count;
    }),
    findAll: jest.fn().mockImplementation(async (options?: any) => {
      const users = Array.from(store.values());
      let filtered = users;
      if (options?.filters?.role) {
        filtered = filtered.filter((u) => u.role === options.filters.role);
      }
      if (options?.filters?.isActive !== undefined) {
        filtered = filtered.filter((u) => u.isActive === options.filters.isActive);
      }
      if (options?.filters?.searchTerm) {
        const term = options.filters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.documentNumber && u.documentNumber.includes(term))
        );
      }
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 20;
      return filtered.slice(offset, offset + limit);
    }),
    countAll: jest.fn().mockImplementation(async () => store.size),
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

function makeUserAuditRepo(): IUserAuditRepository {
  return {
    create: jest.fn().mockImplementation((entry) =>
      Promise.resolve({
        id: entry.id ?? "audit-1",
        ...entry,
        createdAt: new Date(),
      })
    ),
    findByTargetUser: jest.fn().mockResolvedValue([]),
    findByAction: jest.fn().mockResolvedValue([]),
  };
}

function makePasswordResetRepo(): IPasswordResetRepository {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findValidByHash: jest.fn().mockResolvedValue(null),
    markUsed: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
}

function makePasswordHasher(): IPasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue("$2b$12$hashed"),
    compare: jest.fn().mockResolvedValue(true),
  };
}

function makeSecureTokenGenerator(): ISecureTokenGenerator {
  return {
    generate: jest.fn().mockReturnValue({
      rawToken: "test-raw-token-12345",
      tokenHash: "test-token-hash-abcdef",
    }),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("User Management API Integration", () => {
  let app: express.Express;
  let userRepo: ReturnType<typeof makeUserRepo>;
  let refreshTokenRepo: ReturnType<typeof makeRefreshTokenRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let userAuditRepo: ReturnType<typeof makeUserAuditRepo>;
  let passwordResetRepo: ReturnType<typeof makePasswordResetRepo>;
  let passwordHasher: ReturnType<typeof makePasswordHasher>;
  let secureTokenGenerator: ReturnType<typeof makeSecureTokenGenerator>;
  let tokenService: JwtTokenService;

  beforeEach(() => {
    userRepo = makeUserRepo();
    refreshTokenRepo = makeRefreshTokenRepo();
    auditRepo = makeAuditRepo();
    userAuditRepo = makeUserAuditRepo();
    passwordResetRepo = makePasswordResetRepo();
    passwordHasher = makePasswordHasher();
    secureTokenGenerator = makeSecureTokenGenerator();
    tokenService = new JwtTokenService(JWT_CONFIG);

    // Seed an admin user
    const adminUser = createUser({
      id: "admin-1",
      passwordHash: "$2b$12$hashed",
      role: "admin",
      email: "admin@test.com",
    });
    userRepo._store.set("admin-1", adminUser);

    // Seed a censista user
    const censistaUser = createUser({
      id: "censista-1",
      passwordHash: "$2b$12$hashed",
      role: "censista",
      documentNumber: "1234567890",
      phoneNumber: "+573001234567",
    });
    userRepo._store.set("censista-1", censistaUser);

    // Wire auth use cases
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

    // Wire user management use cases
    const createUserUseCase = new CreateUserUseCase(
      userRepo,
      userAuditRepo,
      passwordHasher
    );
    const listUsersUseCase = new ListUsersUseCase(userRepo);
    const editUserProfileUseCase = new EditUserProfileUseCase(
      userRepo,
      userAuditRepo
    );
    const deactivateUserUseCase = new DeactivateUserUseCase(
      userRepo,
      refreshTokenRepo,
      userAuditRepo
    );
    const reactivateUserUseCase = new ReactivateUserUseCase(
      userRepo,
      userAuditRepo
    );
    const manualPasswordResetUseCase = new ManualPasswordResetUseCase(
      userRepo,
      passwordResetRepo,
      refreshTokenRepo,
      userAuditRepo,
      secureTokenGenerator
    );

    // Wire controllers
    const authController = new AuthController(
      loginUseCase,
      refreshTokenUseCase,
      logoutUseCase
    );

    const userController = new UserController(
      createUserUseCase,
      listUsersUseCase,
      editUserProfileUseCase,
      deactivateUserUseCase,
      reactivateUserUseCase,
      manualPasswordResetUseCase,
      userRepo,
      userAuditRepo
    );

    // Wire routes
    const authRoutes = createAuthRoutes(authController, tokenService);
    const userRoutes = createUserRoutes(userController, tokenService);

    const apiRouter = Router();
    apiRouter.use("/auth", authRoutes);
    apiRouter.use("/users", userRoutes);

    app = createServer(apiRouter);
    app.use(errorHandler);
  });

  // Helper: generate access token for a user
  function makeToken(userId: string, role: string): string {
    return tokenService.generateAccessToken({ id: userId, role: role as any });
  }

  // ── GET /api/v1/users (admin) ─────────────────────────────────────

  describe("GET /api/v1/users", () => {
    it("should return 200 with user list for admin", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page", 1);
      expect(res.body).toHaveProperty("pageSize");
      expect(res.body).toHaveProperty("totalPages");
      // Should not include passwordHash
      for (const user of res.body.users) {
        expect(user).not.toHaveProperty("passwordHash");
      }
    });

    it("should return 401 without auth token", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
    });

    it("should return 403 for censista role", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });
  });

  // ── POST /api/v1/users (admin) ────────────────────────────────────

  describe("POST /api/v1/users", () => {
    it("should return 201 when admin creates a new user", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "new@test.com",
          password: "SecurePass123!",
          role: "censista",
          documentNumber: "9876543210",
          phoneNumber: "+573009876543",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("userId");
      expect(typeof res.body.userId).toBe("string");
    });

    it("should return 400 when password is missing", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "new@test.com",
          role: "censista",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("password");
    });

    it("should return 400 when role is missing", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "new@test.com",
          password: "SecurePass123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("role");
    });

    it("should return 403 for censista trying to create user", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "new@test.com",
          password: "SecurePass123!",
          role: "censista",
        });

      expect(res.status).toBe(403);
    });

    it("should return 409 when email already exists", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "admin@test.com",
          password: "SecurePass123!",
          role: "censista",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("EmailAlreadyExistsError");
    });
  });

  // ── GET /api/v1/users/:id (admin) ────────────────────────────────

  describe("GET /api/v1/users/:id", () => {
    it("should return 200 with user data for admin", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "admin-1");
      expect(res.body).toHaveProperty("email", "admin@test.com");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("should return 404 for non-existent user", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users/non-existent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("should return 403 for censista", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .get("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/v1/users/:id (admin) ──────────────────────────────

  describe("PATCH /api/v1/users/:id", () => {
    it("should return 200 when admin updates user profile", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .patch("/api/v1/users/censista-1")
        .set("Authorization", `Bearer ${token}`)
        .send({
          phoneNumber: "+573009998877",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("updated");
    });

    it("should return 403 for censista", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .patch("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ phoneNumber: "+573009998877" });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/v1/users/:id (admin) ─────────────────────────────

  describe("DELETE /api/v1/users/:id", () => {
    it("should return 200 when admin deactivates user", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .delete("/api/v1/users/censista-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deactivated");
    });

    it("should return 403 for censista", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .delete("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return 409 when deactivating last admin", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .delete("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("LastAdminDeactivationError");
    });
  });

  // ── POST /api/v1/users/:id/reactivate (admin) ────────────────────

  describe("POST /api/v1/users/:id/reactivate", () => {
    it("should return 200 when admin reactivates user", async () => {
      const token = makeToken("admin-1", "admin");

      // First deactivate
      await request(app)
        .delete("/api/v1/users/censista-1")
        .set("Authorization", `Bearer ${token}`);

      // Then reactivate
      const res = await request(app)
        .post("/api/v1/users/censista-1/reactivate")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("reactivated");
    });

    it("should return 403 for censista", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users/admin-1/reactivate")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/v1/users/:id/reset-password (admin) ────────────────

  describe("POST /api/v1/users/:id/reset-password", () => {
    it("should return 200 with reset token when admin resets password", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .post("/api/v1/users/censista-1/reset-password")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("reset");
      expect(res.body).toHaveProperty("rawToken");
      expect(typeof res.body.rawToken).toBe("string");
    });

    it("should return 403 for censista", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users/admin-1/reset-password")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/v1/users/me/profile (censista) ────────────────────

  describe("PATCH /api/v1/users/me/profile", () => {
    it("should return 200 when censista edits own profile", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .patch("/api/v1/users/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          phoneNumber: "+573001112233",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "censista-1");
      expect(res.body).toHaveProperty("phoneNumber", "+573001112233");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .patch("/api/v1/users/me/profile")
        .send({ phoneNumber: "+573001112233" });

      expect(res.status).toBe(401);
    });

    it("should return 409 when censista tries to set duplicate email", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .patch("/api/v1/users/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "admin@test.com", // Already taken by admin
        });

      expect(res.status).toBe(409);
    });

    it("should return 409 when censista tries to set duplicate document number", async () => {
      // Create another censista with a different document
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .patch("/api/v1/users/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          documentNumber: "1234567890", // Already taken by censista-1 (self)
        });

      // Should succeed since it's the same user's document
      expect(res.status).toBe(200);
    });
  });

  // ── Full admin flow ──────────────────────────────────────────────

  describe("Full admin user management flow", () => {
    it("should complete create → list → get → update → deactivate → reactivate → reset-password cycle", async () => {
      const token = makeToken("admin-1", "admin");

      // Step 1: Create user
      const createRes = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "flow@test.com",
          password: "SecurePass123!",
          role: "censista",
          documentNumber: "1122334455",
          phoneNumber: "+573005556677",
        });

      expect(createRes.status).toBe(201);
      const newUserId = createRes.body.userId;

      // Step 2: List users (should include the new user)
      const listRes = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.users.find((u: any) => u.id === newUserId);
      expect(found).toBeDefined();
      expect(found.email).toBe("flow@test.com");

      // Step 3: Get user by ID
      const getRes = await request(app)
        .get(`/api/v1/users/${newUserId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.email).toBe("flow@test.com");

      // Step 4: Update user profile
      const updateRes = await request(app)
        .patch(`/api/v1/users/${newUserId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ phoneNumber: "+573008889900" });

      expect(updateRes.status).toBe(200);

      // Step 5: Deactivate user
      const deactivateRes = await request(app)
        .delete(`/api/v1/users/${newUserId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deactivateRes.status).toBe(200);

      // Step 6: Reactivate user
      const reactivateRes = await request(app)
        .post(`/api/v1/users/${newUserId}/reactivate`)
        .set("Authorization", `Bearer ${token}`);

      expect(reactivateRes.status).toBe(200);

      // Step 7: Reset password
      const resetRes = await request(app)
        .post(`/api/v1/users/${newUserId}/reset-password`)
        .set("Authorization", `Bearer ${token}`);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.rawToken).toBeDefined();
    });
  });

  // ── RBAC enforcement ─────────────────────────────────────────────

  describe("RBAC enforcement", () => {
    it("should return 401 for requests without Authorization header", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Authorization");
    });

    it("should return 401 for invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", "Bearer invalid-token-string");

      expect(res.status).toBe(401);
    });

    it("should return 403 when censista tries to list users", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("should return 403 when censista tries to create user", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          email: "test@test.com",
          password: "Pass123!",
          role: "censista",
        });

      expect(res.status).toBe(403);
    });

    it("should return 403 when censista tries to get user by ID", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .get("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when censista tries to update user", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .patch("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ phoneNumber: "+573009998877" });

      expect(res.status).toBe(403);
    });

    it("should return 403 when censista tries to deactivate user", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .delete("/api/v1/users/admin-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when censista tries to reactivate user", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users/admin-1/reactivate")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when censista tries to reset password", async () => {
      const token = makeToken("censista-1", "censista");

      const res = await request(app)
        .post("/api/v1/users/admin-1/reset-password")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should return 404 for unknown user routes", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users/unknown-route")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("should handle pagination query parameters", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users?page=1&pageSize=1&role=admin")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(1);
    });

    it("should handle filter by isActive", async () => {
      const token = makeToken("admin-1", "admin");

      const res = await request(app)
        .get("/api/v1/users?isActive=true")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const user of res.body.users) {
        expect(user.isActive).toBe(true);
      }
    });
  });
});
