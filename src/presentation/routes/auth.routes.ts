/**
 * Auth routes
 *
 * POST /api/v1/auth/login    - Authenticate user, return tokens
 * POST /api/v1/auth/refresh  - Rotate refresh token, return new pair
 * POST /api/v1/auth/logout   - Revoke refresh token (requires valid access token)
 */

import { Router } from "express";
import type { AuthController } from "../controllers/AuthController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export function createAuthRoutes(
  authController: AuthController,
  tokenService: ITokenService
): Router {
  const router = Router();

  router.post("/login", authController.login);
  router.post("/refresh", authController.refresh);
  router.post("/logout", authMiddleware(tokenService), authController.logout);

  return router;
}
