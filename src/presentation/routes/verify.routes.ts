import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { VerifyController } from "../controllers/VerifyController.js";

export function createVerifyRoutes(controller: VerifyController): Router {
  const router = Router();
  const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "TooManyRequests", message: "Rate limit 30/min" } });
  router.get("/verify/:folio", verifyLimiter, controller.verifyFolio);
  return router;
}
