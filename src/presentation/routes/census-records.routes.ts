import { Router } from "express";
import type { CensusController } from "../controllers/CensusController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createCensusRecordRoutes(
  censusController: CensusController,
  tokenService: ITokenService
): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);

  // Search must be before /:id
  router.get("/search", auth, roleMiddleware("admin", "censista"), censusController.searchRecords);

  router.post("/", auth, roleMiddleware("admin", "censista"), censusController.createRecord);

  router.get("/", auth, roleMiddleware("admin", "censista"), censusController.listRecords);

  router.get("/:id", auth, roleMiddleware("admin", "censista"), censusController.getRecordById);

  router.patch("/:id/deactivate", auth, roleMiddleware("admin"), censusController.deactivateRecord);

  return router;
}
