/**
 * Geography management routes
 *
 * GET   /geography/municipality                    - Get root municipality
 * POST  /geography/corregimientos                  - Create corregimiento (admin)
 * GET   /geography/corregimientos                  - List corregimientos (admin/censista)
 * POST  /geography/corregimientos/:id/neighborhoods - Create neighborhood (admin)
 * PATCH /geography/corregimientos/:id/deactivate   - Deactivate corregimiento (admin)
 * PATCH /geography/neighborhoods/:id/reactivate    - Reactivate neighborhood (admin)
 * GET   /geography/tree                            - Get geography tree (admin/censista)
 */

import { Router } from "express";
import type { GeographyController } from "../controllers/GeographyController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createGeographyRoutes(
  geographyController: GeographyController,
  tokenService: ITokenService
): Router {
  const router = Router();

  // All routes require authentication
  const auth = authMiddleware(tokenService);

  // ── Public collection routes ─────────────────────────────────────

  // GET /geography/municipality — Get root municipality
  router.get(
    "/municipality",
    auth,
    geographyController.getMunicipality
  );

  // ── Admin-only collection routes ────────────────────────────────

  // POST /geography/corregimientos — Create corregimiento
  router.post(
    "/corregimientos",
    auth,
    roleMiddleware("admin"),
    geographyController.createCorregimiento
  );

  // GET /geography/corregimientos — List corregimientos
  router.get(
    "/corregimientos",
    auth,
    roleMiddleware("admin", "censista"),
    geographyController.listCorregimientos
  );

  // ── Admin-only parameterized routes (corregimientos) ─────────────

  // POST /geography/corregimientos/:id/neighborhoods — Create neighborhood
  router.post(
    "/corregimientos/:id/neighborhoods",
    auth,
    roleMiddleware("admin"),
    geographyController.createNeighborhood
  );

  // PATCH /geography/corregimientos/:id/deactivate — Deactivate corregimiento
  router.patch(
    "/corregimientos/:id/deactivate",
    auth,
    roleMiddleware("admin"),
    geographyController.deactivateCorregimiento
  );

  // ── Admin-only parameterized routes (neighborhoods) ──────────────

  // PATCH /geography/neighborhoods/:id/reactivate — Reactivate neighborhood
  router.patch(
    "/neighborhoods/:id/reactivate",
    auth,
    roleMiddleware("admin"),
    geographyController.reactivateNeighborhood
  );

  // ── Shared collection routes ────────────────────────────────────

  // GET /geography/tree — Get geography tree
  router.get(
    "/tree",
    auth,
    roleMiddleware("admin", "censista"),
    geographyController.getTree
  );

  return router;
}
