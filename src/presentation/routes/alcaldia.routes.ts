import { Router } from "express";
import multer from "multer";
import type { AlcaldiaController } from "../controllers/AlcaldiaController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

export function createAlcaldiaRoutes(
  controller: AlcaldiaController,
  tokenService: ITokenService
): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);

  router.get("/", auth, controller.get);
  router.patch("/", auth, roleMiddleware("admin"), upload.single("escudo"), controller.update);

  return router;
}
