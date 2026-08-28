/**
 * Use case: ReactivateNeighborhoodUseCase
 *
 * Reactivates a single neighborhood:
 * 1. Validates neighborhood exists
 * 2. Validates neighborhood is inactive (can only reactivate inactive ones)
 * 3. Validates parent corregimiento is active
 * 4. Reactivates the neighborhood
 * 5. Registers an audit entry
 */

import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { IGeographyAuditRepository } from "../../domain/repositories/IGeographyAuditRepository.js";
import {
  NeighborhoodNotFoundError,
  CorregimientoNotFoundError,
  ReactivateRequiresActiveParentError,
} from "../../domain/errors/GeographyErrors.js";

export interface ReactivateNeighborhoodInput {
  neighborhoodId: string;
  actorUserId: string;
}

export class ReactivateNeighborhoodUseCase {
  constructor(
    private readonly neighborhoodRepo: INeighborhoodRepository,
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly auditRepo: IGeographyAuditRepository
  ) {}

  async execute(input: ReactivateNeighborhoodInput): Promise<void> {
    // 1. Validate neighborhood exists
    const neighborhood = await this.neighborhoodRepo.findById(input.neighborhoodId);
    if (!neighborhood) {
      throw new NeighborhoodNotFoundError(input.neighborhoodId);
    }

    // 2. Validate neighborhood is inactive
    if (neighborhood.isActive) {
      // Already active — no-op
      return;
    }

    // 3. Validate parent corregimiento is active
    const corregimiento = await this.corregimientoRepo.findById(neighborhood.corregimientoId);
    if (!corregimiento) {
      throw new CorregimientoNotFoundError(neighborhood.corregimientoId);
    }

    if (!corregimiento.isActive) {
      throw new ReactivateRequiresActiveParentError(
        "neighborhood",
        neighborhood.name,
        "corregimiento",
        corregimiento.name
      );
    }

    // 4. Reactivate the neighborhood
    await this.neighborhoodRepo.reactivateById(input.neighborhoodId);

    // 5. Register audit entry
    await this.auditRepo.create({
      id: `geo-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entityType: "neighborhood",
      entityId: input.neighborhoodId,
      actorUserId: input.actorUserId,
      action: "neighborhood.reactivated",
      details: JSON.stringify({
        name: neighborhood.name,
        corregimientoId: neighborhood.corregimientoId,
      }),
      ipAddress: null,
    });
  }
}
