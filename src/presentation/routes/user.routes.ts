/**
 * User management routes
 *
 * POST   /users                     - Create user (admin)
 * GET    /users                     - List users (admin)
 * PATCH  /users/me/profile          - Edit own profile (censista)
 * GET    /users/:id                 - Get user by ID (admin)
 * PATCH  /users/:id                 - Update user profile (admin)
 * DELETE /users/:id                 - Deactivate user (admin)
 * POST   /users/:id/reactivate      - Reactivate user (admin)
 * POST   /users/:id/reset-password  - Reset user password (admin)
 *
 * IMPORTANT: /me/profile is defined BEFORE /:id routes to prevent
 * Express from matching "me" as a route parameter.
 */

import { Router } from "express";
import type { UserController } from "../controllers/UserController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createUserRoutes(
  userController: UserController,
  tokenService: ITokenService
): Router {
  const router = Router();

  // All routes require authentication
  const auth = authMiddleware(tokenService);

  // ── Admin-only collection routes ───────────────────────────────────

  // POST /users — Create user
  router.post(
    "/",
    auth,
    roleMiddleware("admin"),
    userController.create
  );

  // GET /users — List users with filters and pagination
  router.get(
    "/",
    auth,
    roleMiddleware("admin"),
    userController.list
  );

  // ── Self-service routes (must precede /:id routes) ─────────────────

  // PATCH /users/me/profile — Edit own profile
  // Defined BEFORE /:id to prevent Express matching "me" as a parameter.
  router.patch(
    "/me/profile",
    auth,
    roleMiddleware("censista", "admin"),
    userController.editOwnProfile
  );

  // ── Admin-only parameterized routes ────────────────────────────────

  // GET /users/:id — Get user by ID
  router.get(
    "/:id",
    auth,
    roleMiddleware("admin"),
    userController.getProfile
  );

  // PATCH /users/:id — Update user profile
  router.patch(
    "/:id",
    auth,
    roleMiddleware("admin"),
    userController.updateProfile
  );

  // DELETE /users/:id — Deactivate user
  router.delete(
    "/:id",
    auth,
    roleMiddleware("admin"),
    userController.deactivate
  );

  // POST /users/:id/reactivate — Reactivate user
  router.post(
    "/:id/reactivate",
    auth,
    roleMiddleware("admin"),
    userController.reactivate
  );

  // POST /users/:id/reset-password — Reset user password
  router.post(
    "/:id/reset-password",
    auth,
    roleMiddleware("admin"),
    userController.resetPassword
  );

  return router;
}
