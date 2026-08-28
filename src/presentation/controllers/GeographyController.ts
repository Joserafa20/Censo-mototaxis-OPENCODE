/**
 * GeographyController
 *
 * HTTP adapter for geography and coverage use cases.
 * Maps HTTP requests to use case inputs and use case outputs to HTTP responses.
 *
 * Routes:
 *   GET   /geography/municipality                    - Get root municipality
 *   POST  /geography/corregimientos                  - Create corregimiento (admin)
 *   GET   /geography/corregimientos                  - List corregimientos (admin/censista)
 *   POST  /geography/corregimientos/:id/neighborhoods - Create neighborhood (admin)
 *   PATCH /geography/corregimientos/:id/deactivate   - Deactivate corregimiento (admin)
 *   PATCH /geography/neighborhoods/:id/reactivate    - Reactivate neighborhood (admin)
 *   GET   /geography/tree                            - Get geography tree (admin/censista)
 */

import type { Request, Response, NextFunction } from "express";
import type { CreateCorregimientoUseCase } from "../../application/use-cases/CreateCorregimientoUseCase.js";
import type { CreateNeighborhoodUseCase } from "../../application/use-cases/CreateNeighborhoodUseCase.js";
import type { DeactivateCorregimientoUseCase } from "../../application/use-cases/DeactivateCorregimientoUseCase.js";
import type { ReactivateNeighborhoodUseCase } from "../../application/use-cases/ReactivateNeighborhoodUseCase.js";
import type { GetGeographyTreeUseCase } from "../../application/use-cases/GetGeographyTreeUseCase.js";
import type { ListCorregimientosUseCase } from "../../application/use-cases/ListCorregimientosUseCase.js";
import type { IMunicipalityRepository } from "../../domain/repositories/IMunicipalityRepository.js";

export class GeographyController {
  constructor(
    private readonly createCorregimientoUseCase: CreateCorregimientoUseCase,
    private readonly createNeighborhoodUseCase: CreateNeighborhoodUseCase,
    private readonly deactivateCorregimientoUseCase: DeactivateCorregimientoUseCase,
    private readonly reactivateNeighborhoodUseCase: ReactivateNeighborhoodUseCase,
    private readonly getGeographyTreeUseCase: GetGeographyTreeUseCase,
    private readonly listCorregimientosUseCase: ListCorregimientosUseCase,
    private readonly municipalityRepo: IMunicipalityRepository
  ) {}

  /**
   * GET /geography/municipality
   * Returns the root municipality (Sabanalarga).
   */
  getMunicipality = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const municipality = await this.municipalityRepo.findRoot();

      if (!municipality) {
        res.status(404).json({
          error: "Not Found",
          message: "Root municipality not found",
        });
        return;
      }

      res.status(200).json(municipality);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /geography/corregimientos
   * Creates a new corregimiento. Admin only.
   */
  createCorregimiento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, latitude, longitude } = req.body;

      if (!name) {
        res.status(400).json({
          error: "Bad Request",
          message: "name is required",
        });
        return;
      }

      // Get the root municipality
      const municipality = await this.municipalityRepo.findRoot();
      if (!municipality) {
        res.status(500).json({
          error: "Internal Server Error",
          message: "Root municipality not configured",
        });
        return;
      }

      const result = await this.createCorregimientoUseCase.execute({
        municipalityId: municipality.id,
        name,
        latitude,
        longitude,
        actorUserId: req.user!.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /geography/corregimientos
   * Lists corregimientos with optional filters. Admin/Censista.
   */
  listCorregimientos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { isActive, searchTerm, page, pageSize } = req.query;

      const result = await this.listCorregimientosUseCase.execute({
        filters: {
          isActive: isActive !== undefined ? isActive === "true" : undefined,
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
   * POST /geography/corregimientos/:id/neighborhoods
   * Creates a new neighborhood within a corregimiento. Admin only.
   */
  createNeighborhood = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const corregimientoId = String(req.params.id);
      const { name, latitude, longitude } = req.body;

      if (!name) {
        res.status(400).json({
          error: "Bad Request",
          message: "name is required",
        });
        return;
      }

      const result = await this.createNeighborhoodUseCase.execute({
        corregimientoId,
        name,
        latitude,
        longitude,
        actorUserId: req.user!.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /geography/corregimientos/:id/deactivate
   * Deactivates a corregimiento and cascades to neighborhoods. Admin only.
   */
  deactivateCorregimiento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const corregimientoId = String(req.params.id);

      await this.deactivateCorregimientoUseCase.execute({
        corregimientoId,
        actorUserId: req.user!.userId,
      });

      res.status(200).json({ message: "Corregimiento deactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /geography/neighborhoods/:id/reactivate
   * Reactivates a single neighborhood. Admin only.
   */
  reactivateNeighborhood = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const neighborhoodId = String(req.params.id);

      await this.reactivateNeighborhoodUseCase.execute({
        neighborhoodId,
        actorUserId: req.user!.userId,
      });

      res.status(200).json({ message: "Neighborhood reactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /geography/tree
   * Returns the complete geographic hierarchy tree. Admin/Censista.
   */
  getTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { includeInactive } = req.query;

      const result = await this.getGeographyTreeUseCase.execute({
        includeInactive: includeInactive === "true",
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
