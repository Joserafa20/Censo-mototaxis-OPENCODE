/**
 * App entry point
 *
 * Assembles the Express server, routes, and dependency injection.
 * This file wires together all layers without importing infrastructure
 * details — it receives configured dependencies from the outside.
 */

import { createServer } from "./presentation/server.js";
import { createAuthRoutes } from "./presentation/routes/auth.routes.js";
import { AuthController } from "./presentation/controllers/AuthController.js";
import { LoginUseCase } from "./application/use-cases/LoginUseCase.js";
import { RefreshTokenUseCase } from "./application/use-cases/RefreshTokenUseCase.js";
import { LogoutUseCase } from "./application/use-cases/LogoutUseCase.js";
import { errorHandler } from "./presentation/middlewares/errorHandler.js";
import type { IUserRepository } from "./domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "./domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "./domain/repositories/ILoginAuditRepository.js";
import type { IPasswordHasher } from "./domain/services/IPasswordHasher.js";
import type { ITokenService } from "./domain/services/ITokenService.js";
import type { Express } from "express";

export interface AppDependencies {
  userRepo: IUserRepository;
  refreshTokenRepo: IRefreshTokenRepository;
  auditRepo: ILoginAuditRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
}

export function createApp(deps: AppDependencies): Express {
  // Wire use cases
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

  // Wire controller
  const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase
  );

  // Wire routes
  const authRoutes = createAuthRoutes(authController, deps.tokenService);

  // Assemble server
  const app = createServer(authRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
