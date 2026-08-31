import { Router } from "express";
import type { AuditController } from "../controllers/AuditController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

export function createAuditRoutes(auditController: AuditController, tokenService: ITokenService): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);
  // GET /audit/:type/:id  admin y censista (censista solo sus registros, enforced via scoping if needed; for now allow both, filter in use-case if needed)
  router.get("/:type/:id", auth, roleMiddleware("admin", "censista"), auditController.getTimelineHandler);
  return router;
}
