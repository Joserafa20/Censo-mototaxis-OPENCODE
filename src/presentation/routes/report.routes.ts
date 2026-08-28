import { Router } from "express";
import type { ReportController } from "../controllers/ReportController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import rateLimit from "express-rate-limit";

export function createReportRoutes(
  reportController: ReportController,
  tokenService: ITokenService,
): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);

  const exportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TooManyRequests", message: "Rate limit 10/min" },
  });

  router.get("/summary", auth, roleMiddleware("admin", "censista"), reportController.getSummary);
  router.get("/export", auth, roleMiddleware("admin", "censista"), exportLimiter, reportController.exportReport);

  return router;
}
