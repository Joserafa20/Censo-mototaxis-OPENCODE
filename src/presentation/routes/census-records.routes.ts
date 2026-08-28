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

  router.patch("/:id/submit", auth, roleMiddleware("admin", "censista"), censusController.submitRecord);
  router.patch("/:id/review", auth, roleMiddleware("admin"), censusController.reviewRecord);
  router.patch("/:id/approve", auth, roleMiddleware("admin"), censusController.approveRecord);
  router.patch("/:id/reject", auth, roleMiddleware("admin"), censusController.rejectRecord);

  return router;
}
