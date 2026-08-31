import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { StickerController } from "../controllers/StickerController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validate } from "../middlewares/validate.js";

const batchSchema = z.object({
  body: z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export function createStickerRoutes(controller: StickerController, tokenService: ITokenService): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);
  const batchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "TooManyRequests", message: "Rate limit 10/min" } });

  router.get("/census-records/:id/sticker", auth, roleMiddleware("admin", "censista"), controller.getSticker);
  router.post("/stickers/batch", auth, roleMiddleware("admin", "censista"), batchLimiter, validate(batchSchema), controller.batchStickers);
  return router;
}
