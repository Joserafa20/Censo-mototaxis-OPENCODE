import { Router } from "express";
import multer from "multer";
import type { CensusController } from "../controllers/CensusController.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { ALLOWED_MIMES, MAX_EVIDENCE_SIZE_BYTES } from "../../domain/value-objects/EvidencePhoto.js";
import { validate } from "../middlewares/validate.js";
import { censusCreateSchema } from "../validators/census.schema.js";

export function createCensusRecordRoutes(
  censusController: CensusController,
  tokenService: ITokenService
): Router {
  const router = Router();
  const auth = authMiddleware(tokenService);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_EVIDENCE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if ((ALLOWED_MIMES as readonly string[]).includes(file.mimetype)) cb(null, true);
      else cb(new Error("INVALID_EVIDENCE_MIME"));
    },
  });

  // Search must be before /:id
  router.get("/search", auth, roleMiddleware("admin", "censista"), censusController.searchRecords);

  router.post("/", auth, roleMiddleware("admin", "censista"), validate(censusCreateSchema), censusController.createRecord);
  router.patch("/:id", auth, roleMiddleware("admin", "censista"), validate(censusCreateSchema), async (req,res,next)=>{ const uc:any = (censusController as any).updateUseCase; if(!uc) return res.status(500).json({error:"Not configured"}); try{ await uc.execute({ id: String(req.params.id), ...req.body }); res.json({ ok:true }); } catch(e){ next(e); } });

  router.post("/:id/evidence", auth, roleMiddleware("admin", "censista"), (req, res, next) => {
    upload.array("photos", 5)(req as any, res as any, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "Archivo excede 5 MB" });
        if (err.message === "INVALID_EVIDENCE_MIME") return res.status(422).json({ code: "INVALID_EVIDENCE_MIME", message: "MIME no permitido" });
        return res.status(400).json({ code: err.code ?? "UPLOAD_ERROR", message: err.message });
      }
      next();
    });
  }, censusController.addEvidence);

  router.get("/", auth, roleMiddleware("admin", "censista"), censusController.listRecords);

  router.get("/:id", auth, roleMiddleware("admin", "censista"), censusController.getRecordById);

  router.patch("/:id/deactivate", auth, roleMiddleware("admin"), censusController.deactivateRecord);

  router.patch("/:id/submit", auth, roleMiddleware("admin", "censista"), censusController.submitRecord);
  router.patch("/:id/review", auth, roleMiddleware("admin"), censusController.reviewRecord);
  router.patch("/:id/approve", auth, roleMiddleware("admin"), censusController.approveRecord);
  router.patch("/:id/reject", auth, roleMiddleware("admin"), censusController.rejectRecord);

  return router;
}
