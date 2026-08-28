/**
 * Use case: CreateNeighborhoodUseCase
 *
 * Creates a new neighborhood within a corregimiento:
 * 1. Validates corregimiento exists and is active
 * 2. Validates name uniqueness within the corregimiento
 * 3. Validates GPS coordinates if provided
 * 4. Persists the neighborhood
 * 5. Registers an audit entry
 */

import type { Neighborhood } from "../../domain/entities/Neighborhood.js";
import { createNeighborhood } from "../../domain/entities/Neighborhood.js";
import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { IGeographyAuditRepository } from "../../domain/repositories/IGeographyAuditRepository.js";
import { Coordinates } from "../../domain/value-objects/Coordinates.js";
import {
  DuplicateGeographyNameError,
  InactiveParentError,
  CorregimientoNotFoundError,
} from "../../domain/errors/GeographyErrors.js";

export interface CreateNeighborhoodInput {
  corregimientoId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  actorUserId: string;
}

export interface CreateNeighborhoodOutput {
  neighborhoodId: string;
}

export class CreateNeighborhoodUseCase {
  constructor(
    private readonly neighborhoodRepo: INeighborhoodRepository,
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly auditRepo: IGeographyAuditRepository
  ) {}

  async execute(input: CreateNeighborhoodInput): Promise<CreateNeighborhoodOutput> {
    // 1. Validate corregimiento exists
    const corregimiento = await this.corregimientoRepo.findById(input.corregimientoId);
    if (!corregimiento) {
      throw new CorregimientoNotFoundError(input.corregimientoId);
    }

    // 2. Validate corregimiento is active
    if (!corregimiento.isActive) {
      throw new InactiveParentError("corregimiento", corregimiento.name);
    }

    // 3. Validate name uniqueness within corregimiento
    const existingNeighborhood = await this.neighborhoodRepo.findByNameAndCorregimiento(
      input.name,
      input.corregimientoId
    );
    if (existingNeighborhood) {
      throw new DuplicateGeographyNameError(input.name, "neighborhood");
    }

    // 4. Validate GPS coordinates if provided
    let coordinates: Coordinates | null = null;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordinates = Coordinates.create(input.latitude, input.longitude);
    }

    // 5. Create neighborhood entity
    const neighborhoodId = `nbh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const neighborhood = createNeighborhood({
      id: neighborhoodId,
      corregimientoId: input.corregimientoId,
      name: input.name.trim(),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    // 6. Persist neighborhood
    await this.neighborhoodRepo.save(neighborhood);

    // 7. Register audit entry
    await this.auditRepo.create({
      id: `geo-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entityType: "neighborhood",
      entityId: neighborhoodId,
      actorUserId: input.actorUserId,
      action: "neighborhood.created",
      details: JSON.stringify({
        name: input.name,
        corregimientoId: input.corregimientoId,
      }),
      ipAddress: null,
    });

    return { neighborhoodId };
  }
}
