import type { Request, Response, NextFunction } from "express";
import type { CreateCensusRecordUseCase } from "../../application/use-cases/CreateCensusRecordUseCase.js";
import type { ListCensusRecordsUseCase } from "../../application/use-cases/ListCensusRecordsUseCase.js";
import type { SearchCensusRecordsUseCase } from "../../application/use-cases/SearchCensusRecordsUseCase.js";
import type { DeactivateCensusRecordUseCase } from "../../application/use-cases/DeactivateCensusRecordUseCase.js";
import type { SubmitCensusRecordUseCase } from "../../application/use-cases/SubmitCensusRecordUseCase.js";
import type { ReviewCensusRecordUseCase } from "../../application/use-cases/ReviewCensusRecordUseCase.js";
import type { ApproveCensusRecordUseCase } from "../../application/use-cases/ApproveCensusRecordUseCase.js";
import type { RejectCensusRecordUseCase } from "../../application/use-cases/RejectCensusRecordUseCase.js";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { IValidationRepository } from "../../domain/repositories/IValidationRepository.js";
import type { AddEvidencePhotoUseCase } from "../../application/use-cases/AddEvidencePhotoUseCase.js";

export class CensusController {
  constructor(
    private readonly createUseCase: CreateCensusRecordUseCase,
    private readonly listUseCase: ListCensusRecordsUseCase,
    private readonly searchUseCase: SearchCensusRecordsUseCase,
    private readonly deactivateUseCase: DeactivateCensusRecordUseCase,
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly submitUseCase?: SubmitCensusRecordUseCase,
    private readonly reviewUseCase?: ReviewCensusRecordUseCase,
    private readonly approveUseCase?: ApproveCensusRecordUseCase,
    private readonly rejectUseCase?: RejectCensusRecordUseCase,
    private readonly validationRepo?: IValidationRepository,
    private readonly addEvidenceUseCase?: AddEvidencePhotoUseCase
  ) {}

  createRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user!;
      const {
        periodId,
        corregimientoId,
        neighborhoodId,
        stationId,
        operationType,
        mototaxiCedula,
        mototaxiFirstName,
        mototaxiLastName,
        mototaxiPhone,
        mototaxiAddress,
        motorcyclePlate,
        motorcycleBrand,
        motorcycleModel,
        motorcycleColor,
        motorcycleYear,
        latitude,
        longitude,
        consentGiven,
        consentSignature,
        consentDate,
        vehicleType,
        ownershipType,
        operationMode,
        tarifaValor,
        documentosAlDia,
        horario,
        actividadMotocarro,
      } = req.body;

      if (!periodId || !corregimientoId || !operationType || !mototaxiCedula || !mototaxiFirstName || !mototaxiLastName || !motorcyclePlate || !motorcycleBrand || !motorcycleModel || !motorcycleColor) {
        res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
        return;
      }

      const result = await this.createUseCase.execute({
        periodId,
        corregimientoId,
        neighborhoodId: neighborhoodId ?? null,
        stationId: stationId ?? null,
        operationType,
        mototaxiCedula,
        mototaxiFirstName,
        mototaxiLastName,
        mototaxiPhone: mototaxiPhone ?? null,
        mototaxiAddress: mototaxiAddress ?? null,
        motorcyclePlate,
        motorcycleBrand,
        motorcycleModel,
        motorcycleColor,
        motorcycleYear: motorcycleYear ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        createdByUserId: actor.userId,
        consentGiven: consentGiven as boolean,
        consentSignature: (consentSignature as string) ?? "",
        consentDate,
        vehicleType: vehicleType ?? "MOTOTAXI",
        ownershipType: ownershipType ?? null,
        operationMode: operationMode ?? null,
        tarifaValor: tarifaValor ?? null,
        documentosAlDia: documentosAlDia ?? null,
        horario: horario ?? null,
        actividadMotocarro: actividadMotocarro ?? null,
      } as any);

      // include habeas fields for spec: fetch record if possible
      try {
        const rec: any = await this.censusRecordRepo.findById(result.recordId);
        if (rec) {
          res.status(201).json({ ...result, consentGiven: rec.consentGiven, consentSignature: rec.consentSignature, consentDate: rec.consentDate, evidencePhotos: rec.evidencePhotos });
          return;
        }
      } catch {}
      res.status(201).json(result);
    } catch (error) {
      const e: any = error;
      if (e?.statusCode === 400 && e?.details) {
        res.status(400).json({ code: e.code ?? "VALIDATION_ERROR", message: e.message, details: e.details, errors: e.details, vehicleType: req.body?.vehicleType });
        return;
      }
      if (e?.statusCode === 422 || e?.statusCode === 413) {
        res.status(e.statusCode).json({ code: e.code, message: e.message, details: e.details, error: e.name });
        return;
      }
      next(error);
    }
  };

  addEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.addEvidenceUseCase) { res.status(500).json({ error: "Not configured" }); return; }
      const id = String(req.params.id);
      const actor = req.user!;
      const files = (req.files as Express.Multer.File[]) ?? (req.file ? [req.file as any] : []);
      if (!files.length) { res.status(400).json({ code: "NO_FILES", message: "No files provided" }); return; }
      const result = await this.addEvidenceUseCase.execute({
        recordId: id,
        files: files.map((f: any) => ({ mimetype: f.mimetype, size: f.size, buffer: f.buffer ?? Buffer.alloc(0), originalname: f.originalname })),
        actorUserId: actor.userId,
        actorRole: actor.role,
      });
      res.status(200).json(result);
    } catch (error) {
      const e: any = error;
      if (e?.statusCode === 422 || e?.statusCode === 413 || e?.statusCode === 403 || e?.statusCode === 404) {
        res.status(e.statusCode).json({ code: e.code ?? e.name, message: e.message, details: e.details, error: e.name });
        return;
      }
      next(error);
    }
  };

  listRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user!;
      const { periodId, corregimientoId, neighborhoodId, stationId, operationType, status, page, pageSize } = req.query;

      const result = await this.listUseCase.execute({
        filters: {
          periodId: periodId as string | undefined,
          corregimientoId: corregimientoId as string | undefined,
          neighborhoodId: neighborhoodId as string | undefined,
          stationId: stationId as string | undefined,
          operationType: operationType as "station" | "independent" | undefined,
          status: status as "active" | "inactive" | "suspended" | undefined,
        },
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        actorUserId: actor.userId,
        actorRole: actor.role,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  searchRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user!;
      const q = (req.query.q as string) ?? (req.query.search as string) ?? "";

      const result = await this.searchUseCase.execute({
        searchTerm: q,
        actorUserId: actor.userId,
        actorRole: actor.role,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const record = await this.censusRecordRepo.findById(id);
      if (!record) {
        res.status(404).json({ error: "Not Found", message: `Census record with id "${id}" not found` });
        return;
      }
      if (req.user!.role !== "admin" && record.createdByUserId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden", message: "No tiene permisos para ver este registro" });
        return;
      }
      let validations: any[] | undefined;
      if (this.validationRepo) {
        validations = await this.validationRepo.findByRecordId(id);
      }
      res.status(200).json({ ...record, validations: validations ?? [] });
    } catch (error) {
      next(error);
    }
  };

  deactivateRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ error: "Bad Request", message: "reason is required" });
        return;
      }

      await this.deactivateUseCase.execute({
        recordId: id,
        reason,
        actorUserId: req.user!.userId,
      });

      res.status(200).json({ message: "Record deactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  submitRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.submitUseCase) { res.status(500).json({ error: "Not configured" }); return; }
      const id = String(req.params.id);
      const actor = req.user!;
      const result = await this.submitUseCase.execute({ recordId: id, actorUserId: actor.userId, actorRole: actor.role });
      const rec = await this.censusRecordRepo.findById(id);
      res.status(200).json({ id: result.id, status: result.status, previousStatus: result.previousStatus, periodId: rec?.periodId, updatedAt: new Date().toISOString(), validation: { actorId: actor.userId, actorRole: actor.role } });
    } catch (error) { this.handleValidationError(error, res, next); }
  };

  reviewRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.reviewUseCase) { res.status(500).json({ error: "Not configured" }); return; }
      const id = String(req.params.id);
      const actor = req.user!;
      const result = await this.reviewUseCase.execute({ recordId: id, actorUserId: actor.userId, actorRole: actor.role });
      res.status(200).json({ id: result.id, status: result.status, previousStatus: result.previousStatus, updatedAt: new Date().toISOString(), validation: { actorId: actor.userId, actorRole: actor.role } });
    } catch (error) { this.handleValidationError(error, res, next); }
  };

  approveRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.approveUseCase) { res.status(500).json({ error: "Not configured" }); return; }
      const id = String(req.params.id);
      const actor = req.user!;
      const result = await this.approveUseCase.execute({ recordId: id, actorUserId: actor.userId, actorRole: actor.role });
      res.status(200).json({ id: result.id, status: result.status, previousStatus: result.previousStatus, updatedAt: new Date().toISOString(), validation: { actorId: actor.userId, actorRole: actor.role } });
    } catch (error) { this.handleValidationError(error, res, next); }
  };

  rejectRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.rejectUseCase) { res.status(500).json({ error: "Not configured" }); return; }
      const id = String(req.params.id);
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        res.status(400).json({ code: "REJECT_REASON_REQUIRED", message: "reason is required (10-500 chars)" }); return;
      }
      const actor = req.user!;
      const result = await this.rejectUseCase.execute({ recordId: id, actorUserId: actor.userId, actorRole: actor.role, reason });
      res.status(200).json({ id: result.id, status: result.status, previousStatus: result.previousStatus, updatedAt: new Date().toISOString(), validation: { actorId: actor.userId, actorRole: actor.role } });
    } catch (error) { this.handleValidationError(error, res, next); }
  };

  private handleValidationError(error: any, res: Response, next: NextFunction): void {
    if (error?.statusCode === 422 && (error?.code === "VALIDATION_FAILED" || error?.code === "INVALID_CONSENT" || String(error?.code).startsWith("INVALID_SIGNATURE") || String(error?.code).startsWith("INVALID_EVIDENCE") || error?.code === "EVIDENCE_LIMIT_EXCEEDED")) {
      res.status(422).json({ code: error.code, details: error.details, message: error.message }); return;
    }
    if (error?.statusCode === 413) { res.status(413).json({ code: error.code, message: error.message, details: error.details }); return; }
    if (error?.statusCode === 400 && (error?.code === "REJECT_REASON_REQUIRED" || error?.code === "REJECT_REASON_TOO_SHORT" || error?.code === "REJECT_REASON_TOO_LONG")) {
      res.status(400).json({ code: error.code, message: error.message }); return;
    }
    if (error?.statusCode === 409) {
      res.status(409).json({ code: error.code ?? "CONFLICT", message: error.message, pendingCount: error.pendingCount, inProgressCount: error.inProgressCount }); return;
    }
    if (error?.statusCode === 403) { res.status(403).json({ error: "Forbidden", message: error.message, code: error.code }); return; }
    if (error?.statusCode === 404) { res.status(404).json({ error: "Not Found", message: error.message }); return; }
    next(error);
  }
}
