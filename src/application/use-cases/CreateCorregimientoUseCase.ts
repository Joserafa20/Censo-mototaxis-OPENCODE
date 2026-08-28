/**
 * Use case: CreateCorregimientoUseCase
 *
 * Creates a new corregimiento within a municipality:
 * 1. Validates municipality exists and is active
 * 2. Validates name uniqueness within the municipality
 * 3. Validates GPS coordinates if provided
 * 4. Persists the corregimiento
 * 5. Registers an audit entry
 */

import type { Corregimiento } from "../../domain/entities/Corregimiento.js";
import { createCorregimiento } from "../../domain/entities/Corregimiento.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { IMunicipalityRepository } from "../../domain/repositories/IMunicipalityRepository.js";
import type { IGeographyAuditRepository } from "../../domain/repositories/IGeographyAuditRepository.js";
import { Coordinates } from "../../domain/value-objects/Coordinates.js";
import {
  DuplicateGeographyNameError,
  InactiveParentError,
  MunicipalityNotFoundError,
} from "../../domain/errors/GeographyErrors.js";

export interface CreateCorregimientoInput {
  municipalityId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  actorUserId: string;
}

export interface CreateCorregimientoOutput {
  corregimientoId: string;
}

export class CreateCorregimientoUseCase {
  constructor(
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly municipalityRepo: IMunicipalityRepository,
    private readonly auditRepo: IGeographyAuditRepository
  ) {}

  async execute(input: CreateCorregimientoInput): Promise<CreateCorregimientoOutput> {
    // 1. Validate municipality exists
    const municipality = await this.municipalityRepo.findById(input.municipalityId);
    if (!municipality) {
      throw new MunicipalityNotFoundError(input.municipalityId);
    }

    // 2. Validate municipality is active
    if (!municipality.isActive) {
      throw new InactiveParentError("municipality", municipality.name);
    }

    // 3. Validate name uniqueness within municipality
    const existingCorregimiento = await this.corregimientoRepo.findByNameAndMunicipality(
      input.name,
      input.municipalityId
    );
    if (existingCorregimiento) {
      throw new DuplicateGeographyNameError(input.name, "corregimiento");
    }

    // 4. Validate GPS coordinates if provided
    let coordinates: Coordinates | null = null;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordinates = Coordinates.create(input.latitude, input.longitude);
    }

    // 5. Create corregimiento entity
    const corregimientoId = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const corregimiento = createCorregimiento({
      id: corregimientoId,
      municipalityId: input.municipalityId,
      name: input.name.trim(),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    // 6. Persist corregimiento
    await this.corregimientoRepo.save(corregimiento);

    // 7. Register audit entry
    await this.auditRepo.create({
      id: `geo-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entityType: "corregimiento",
      entityId: corregimientoId,
      actorUserId: input.actorUserId,
      action: "corregimiento.created",
      details: JSON.stringify({
        name: input.name,
        municipalityId: input.municipalityId,
      }),
      ipAddress: null,
    });

    return { corregimientoId };
  }
}
