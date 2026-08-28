import type { Request, Response, NextFunction } from "express";
import type { CreateCensusRecordUseCase } from "../../application/use-cases/CreateCensusRecordUseCase.js";
import type { ListCensusRecordsUseCase } from "../../application/use-cases/ListCensusRecordsUseCase.js";
import type { SearchCensusRecordsUseCase } from "../../application/use-cases/SearchCensusRecordsUseCase.js";
import type { DeactivateCensusRecordUseCase } from "../../application/use-cases/DeactivateCensusRecordUseCase.js";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";

export class CensusController {
  constructor(
    private readonly createUseCase: CreateCensusRecordUseCase,
    private readonly listUseCase: ListCensusRecordsUseCase,
    private readonly searchUseCase: SearchCensusRecordsUseCase,
    private readonly deactivateUseCase: DeactivateCensusRecordUseCase,
    private readonly censusRecordRepo: ICensusRecordRepository
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
      });

      res.status(201).json(result);
    } catch (error) {
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
      // Censista can only see own records
      if (req.user!.role !== "admin" && record.createdByUserId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden", message: "No tiene permisos para ver este registro" });
        return;
      }
      res.status(200).json(record);
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
}
