/**
 * CensusPeriodController
 *
 * HTTP adapter for census period use cases.
 * Maps HTTP requests to use case inputs and use case outputs to HTTP responses.
 *
 * Routes:
 *   POST   /census-periods              - Create a new period (admin)
 *   GET    /census-periods              - List periods with filters (admin)
 *   GET    /census-periods/:id          - Get period by ID (admin)
 *   PATCH  /census-periods/:id          - Update period (admin)
 *   PATCH  /census-periods/:id/status   - Change period status (admin)
 */

import type { Request, Response, NextFunction } from "express";
import type { CreateCensusPeriodUseCase } from "../../application/use-cases/CreateCensusPeriodUseCase.js";
import type { UpdateCensusPeriodUseCase } from "../../application/use-cases/UpdateCensusPeriodUseCase.js";
import type { ChangeCensusPeriodStatusUseCase } from "../../application/use-cases/ChangeCensusPeriodStatusUseCase.js";
import type { ListCensusPeriodsUseCase } from "../../application/use-cases/ListCensusPeriodsUseCase.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { CensusPeriodStatus } from "../../domain/entities/CensusPeriod.js";

export class CensusPeriodController {
  constructor(
    private readonly createUseCase: CreateCensusPeriodUseCase,
    private readonly updateUseCase: UpdateCensusPeriodUseCase,
    private readonly changeStatusUseCase: ChangeCensusPeriodStatusUseCase,
    private readonly listUseCase: ListCensusPeriodsUseCase,
    private readonly periodRepo: ICensusPeriodRepository
  ) {}

  /**
   * POST /census-periods
   * Creates a new census period.
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, startDate, endDate } = req.body;

      if (!name || !startDate || !endDate) {
        res.status(400).json({
          error: "Bad Request",
          message: "name, startDate, and endDate are required",
        });
        return;
      }

      const result = await this.createUseCase.execute({
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /census-periods
   * Lists periods with optional filters and pagination.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, searchTerm, page, pageSize } = req.query;

      const result = await this.listUseCase.execute({
        filters: {
          status: status as CensusPeriodStatus | undefined,
          searchTerm: searchTerm as string | undefined,
        },
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      });

      res.status(200).json({
        periods: result.periods,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /census-periods/:id
   * Gets a period by ID.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const period = await this.periodRepo.findById(id);

      if (!period) {
        res.status(404).json({
          error: "Not Found",
          message: `Census period ${id} not found`,
        });
        return;
      }

      res.status(200).json(period);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /census-periods/:id
   * Updates a census period (only INACTIVO periods).
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { name, description, startDate, endDate } = req.body;

      await this.updateUseCase.execute({
        periodId: id,
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.status(200).json({ message: "Census period updated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /census-periods/:id/status
   * Changes the status of a census period.
   */
  changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          error: "Bad Request",
          message: "status is required",
        });
        return;
      }

      await this.changeStatusUseCase.execute({
        periodId: id,
        newStatus: status as CensusPeriodStatus,
      });

      res.status(200).json({ message: `Census period status changed to ${status}` });
    } catch (error) {
      next(error);
    }
  };
}
