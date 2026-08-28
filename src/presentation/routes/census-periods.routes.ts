/**
 * Census period management routes
 *
 * POST   /census-periods              - Create period (admin)
 * GET    /census-periods              - List periods (admin)
 * GET    /census-periods/:id          - Get period by ID (admin)
 * PATCH  /census-periods/:id          - Update period (admin)
 * PATCH  /census-periods/:id/status   - Change period status (admin)
 */

import { Router } from "express";
import type { CensusPeriodController } from "../controllers/CensusPeriodController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createCensusPeriodRoutes(
  censusPeriodController: CensusPeriodController,
  tokenService: ITokenService
): Router {
  const router = Router();

  // All routes require authentication
  const auth = authMiddleware(tokenService);

  // ── Admin-only collection routes ───────────────────────────────────

  // POST /census-periods — Create period
  router.post(
    "/",
    auth,
    roleMiddleware("admin"),
    censusPeriodController.create
  );

  // GET /census-periods — List periods with filters and pagination
  router.get(
    "/",
    auth,
    roleMiddleware("admin"),
    censusPeriodController.list
  );

  // ── Admin-only parameterized routes ────────────────────────────────

  // GET /census-periods/:id — Get period by ID
  router.get(
    "/:id",
    auth,
    roleMiddleware("admin"),
    censusPeriodController.getById
  );

  // PATCH /census-periods/:id — Update period
  router.patch(
    "/:id",
    auth,
    roleMiddleware("admin"),
    censusPeriodController.update
  );

  // PATCH /census-periods/:id/status — Change period status
  router.patch(
    "/:id/status",
    auth,
    roleMiddleware("admin"),
    censusPeriodController.changeStatus
  );

  return router;
}
