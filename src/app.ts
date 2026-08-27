/**
 * App entry point
 *
 * Assembles the Express server, routes, and dependency injection.
 * This file wires together all layers without importing infrastructure
 * details — it receives configured dependencies from the outside.
 */

import { Router } from "express";
import { createServer } from "./presentation/server.js";
import { createAuthRoutes } from "./presentation/routes/auth.routes.js";
import { createUserRoutes } from "./presentation/routes/user.routes.js";
import { AuthController } from "./presentation/controllers/AuthController.js";
import { UserController } from "./presentation/controllers/UserController.js";
import { LoginUseCase } from "./application/use-cases/LoginUseCase.js";
import { RefreshTokenUseCase } from "./application/use-cases/RefreshTokenUseCase.js";
import { LogoutUseCase } from "./application/use-cases/LogoutUseCase.js";
import { CreateUserUseCase } from "./application/use-cases/CreateUserUseCase.js";
import { ListUsersUseCase } from "./application/use-cases/ListUsersUseCase.js";
import { EditUserProfileUseCase } from "./application/use-cases/EditUserProfileUseCase.js";
import { DeactivateUserUseCase } from "./application/use-cases/DeactivateUserUseCase.js";
import { ReactivateUserUseCase } from "./application/use-cases/ReactivateUserUseCase.js";
import { ManualPasswordResetUseCase } from "./application/use-cases/ManualPasswordResetUseCase.js";
import { errorHandler } from "./presentation/middlewares/errorHandler.js";
import type { IUserRepository } from "./domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "./domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "./domain/repositories/ILoginAuditRepository.js";
import type { IUserAuditRepository } from "./domain/repositories/IUserAuditRepository.js";
import type { IPasswordResetRepository } from "./domain/repositories/IPasswordResetRepository.js";
import type { IPasswordHasher } from "./domain/services/IPasswordHasher.js";
import type { ITokenService } from "./domain/services/ITokenService.js";
import type { ISecureTokenGenerator } from "./domain/services/ISecureTokenGenerator.js";
import type { Express } from "express";

export interface AppDependencies {
  userRepo: IUserRepository;
  refreshTokenRepo: IRefreshTokenRepository;
  auditRepo: ILoginAuditRepository;
  userAuditRepo: IUserAuditRepository;
  passwordResetRepo: IPasswordResetRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
  secureTokenGenerator: ISecureTokenGenerator;
}

export function createApp(deps: AppDependencies): Express {
  // ── Auth use cases ───────────────────────────────────────────────
  const loginUseCase = new LoginUseCase(
    deps.userRepo,
    deps.refreshTokenRepo,
    deps.auditRepo,
    deps.passwordHasher,
    deps.tokenService
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    deps.refreshTokenRepo,
    deps.tokenService,
    deps.auditRepo
  );

  const logoutUseCase = new LogoutUseCase(
    deps.refreshTokenRepo,
    deps.auditRepo
  );

  // ── User management use cases ────────────────────────────────────
  const createUserUseCase = new CreateUserUseCase(
    deps.userRepo,
    deps.userAuditRepo,
    deps.passwordHasher
  );

  const listUsersUseCase = new ListUsersUseCase(deps.userRepo);

  const editUserProfileUseCase = new EditUserProfileUseCase(
    deps.userRepo,
    deps.userAuditRepo
  );

  const deactivateUserUseCase = new DeactivateUserUseCase(
    deps.userRepo,
    deps.refreshTokenRepo,
    deps.userAuditRepo
  );

  const reactivateUserUseCase = new ReactivateUserUseCase(
    deps.userRepo,
    deps.userAuditRepo
  );

  const manualPasswordResetUseCase = new ManualPasswordResetUseCase(
    deps.userRepo,
    deps.passwordResetRepo,
    deps.refreshTokenRepo,
    deps.userAuditRepo,
    deps.secureTokenGenerator
  );

  // ── Controllers ──────────────────────────────────────────────────
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
    deps.userRepo,
    deps.userAuditRepo
  );

  // ── Routes ───────────────────────────────────────────────────────
  const authRoutes = createAuthRoutes(authController, deps.tokenService);
  const userRoutes = createUserRoutes(userController, deps.tokenService);

  // Assemble API router
  const apiRouter = Router();
  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/users", userRoutes);

  // Assemble server
  const app = createServer(apiRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
