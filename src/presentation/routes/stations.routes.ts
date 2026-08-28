/**
 * Station management routes
 *
 * POST   /api/v1/stations                    - Create station (admin)
 * GET    /api/v1/stations                    - List stations (admin/censista)
 * GET    /api/v1/stations/:id                - Get station by ID (admin/censista)
 * PATCH  /api/v1/stations/:id/deactivate     - Deactivate station (admin)
 * POST   /api/v1/stations/:id/agents         - Assign agent (admin)
 * DELETE /api/v1/stations/:id/agents/:agentId - Unassign agent (admin)
 */

import { Router } from "express";
import type { StationController } from "../controllers/StationController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createStationRoutes(
  stationController: StationController,
  tokenService: ITokenService
): Router {
  const router = Router();

  // All routes require authentication
  const auth = authMiddleware(tokenService);

  // ── Admin-only collection routes ────────────────────────────────

  // POST /api/v1/stations — Create station
  router.post(
    "/",
    auth,
    roleMiddleware("admin"),
    stationController.createStation
  );

  // GET /api/v1/stations — List stations
  router.get(
    "/",
    auth,
    roleMiddleware("admin", "censista"),
    stationController.listStations
  );

  // ── Admin/censista parameterized routes ─────────────────────────

  // GET /api/v1/stations/:id — Get station by ID
  router.get(
    "/:id",
    auth,
    roleMiddleware("admin", "censista"),
    stationController.getStationById
  );

  // ── Admin-only parameterized routes ─────────────────────────────

  // PATCH /api/v1/stations/:id/deactivate — Deactivate station
  router.patch(
    "/:id/deactivate",
    auth,
    roleMiddleware("admin"),
    stationController.deactivateStation
  );

  // POST /api/v1/stations/:id/agents — Assign agent
  router.post(
    "/:id/agents",
    auth,
    roleMiddleware("admin"),
    stationController.assignAgent
  );

  // DELETE /api/v1/stations/:id/agents/:agentId — Unassign agent
  router.delete(
    "/:id/agents/:agentId",
    auth,
    roleMiddleware("admin"),
    stationController.unassignAgent
  );

  return router;
}
