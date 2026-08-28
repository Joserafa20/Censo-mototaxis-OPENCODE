/**
 * StationController
 *
 * HTTP adapter for station management use cases.
 * Maps HTTP requests to use case inputs and use case outputs to HTTP responses.
 *
 * Routes:
 *   POST   /api/v1/stations                    - Create station (admin)
 *   GET    /api/v1/stations                    - List stations (admin/censista)
 *   GET    /api/v1/stations/:id                - Get station by ID (admin/censista)
 *   PATCH  /api/v1/stations/:id/deactivate     - Deactivate station (admin)
 *   POST   /api/v1/stations/:id/agents         - Assign agent (admin)
 *   DELETE /api/v1/stations/:id/agents/:agentId - Unassign agent (admin)
 */

import type { Request, Response, NextFunction } from "express";
import type { CreateStationUseCase } from "../../application/use-cases/CreateStationUseCase.js";
import type { ListStationsUseCase } from "../../application/use-cases/ListStationsUseCase.js";
import type { DeactivateStationUseCase } from "../../application/use-cases/DeactivateStationUseCase.js";
import type { AssignAgentUseCase } from "../../application/use-cases/AssignAgentUseCase.js";
import type { UnassignAgentUseCase } from "../../application/use-cases/UnassignAgentUseCase.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import type { StationLocationType } from "../../domain/entities/Station.js";

export class StationController {
  constructor(
    private readonly createStationUseCase: CreateStationUseCase,
    private readonly listStationsUseCase: ListStationsUseCase,
    private readonly deactivateStationUseCase: DeactivateStationUseCase,
    private readonly assignAgentUseCase: AssignAgentUseCase,
    private readonly unassignAgentUseCase: UnassignAgentUseCase,
    private readonly stationRepo: IStationRepository
  ) {}

  /**
   * POST /api/v1/stations
   * Creates a new station. Admin only.
   */
  createStation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, locationType, corregimientoId, neighborhoodId, latitude, longitude } = req.body;

      if (!name) {
        res.status(400).json({
          error: "Bad Request",
          message: "name is required",
        });
        return;
      }

      if (!locationType) {
        res.status(400).json({
          error: "Bad Request",
          message: "locationType is required (urban or rural)",
        });
        return;
      }

      if (locationType !== "urban" && locationType !== "rural") {
        res.status(400).json({
          error: "Bad Request",
          message: "locationType must be 'urban' or 'rural'",
        });
        return;
      }

      const result = await this.createStationUseCase.execute({
        name,
        locationType: locationType as StationLocationType,
        corregimientoId,
        neighborhoodId,
        latitude,
        longitude,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/stations
   * Lists stations with optional filters. Admin/Censista.
   */
  listStations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { locationType, isActive, corregimientoId, neighborhoodId, searchTerm, page, pageSize } = req.query;

      const result = await this.listStationsUseCase.execute({
        filters: {
          locationType: locationType as StationLocationType | undefined,
          isActive: isActive !== undefined ? isActive === "true" : undefined,
          corregimientoId: corregimientoId as string | undefined,
          neighborhoodId: neighborhoodId as string | undefined,
          searchTerm: searchTerm as string | undefined,
        },
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/stations/:id
   * Gets a station by ID. Admin/Censista.
   */
  getStationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stationId = String(req.params.id);
      const station = await this.stationRepo.findById(stationId);

      if (!station) {
        res.status(404).json({
          error: "Not Found",
          message: `Station with id "${stationId}" not found`,
        });
        return;
      }

      res.status(200).json(station);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/stations/:id/deactivate
   * Deactivates a station. Admin only.
   */
  deactivateStation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stationId = String(req.params.id);

      await this.deactivateStationUseCase.execute({ stationId });

      res.status(200).json({ message: "Station deactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/stations/:id/agents
   * Assigns an agent to a station. Admin only.
   */
  assignAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stationId = String(req.params.id);
      const { censusRecordId } = req.body;

      if (!censusRecordId) {
        res.status(400).json({
          error: "Bad Request",
          message: "censusRecordId is required",
        });
        return;
      }

      const result = await this.assignAgentUseCase.execute({
        stationId,
        censusRecordId,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/stations/:id/agents/:agentId
   * Unassigns an agent from a station. Admin only.
   */
  unassignAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stationId = String(req.params.id);
      const censusRecordId = String(req.params.agentId);

      await this.unassignAgentUseCase.execute({
        stationId,
        censusRecordId,
      });

      res.status(200).json({ message: "Agent unassigned successfully" });
    } catch (error) {
      next(error);
    }
  };
}
