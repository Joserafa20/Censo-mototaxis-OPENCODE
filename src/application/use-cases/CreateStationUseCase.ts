/**
 * Use case: CreateStationUseCase
 *
 * Creates a new mototaxi station:
 * 1. Validates corregimiento exists and is active
 * 2. Validates name uniqueness within the corregimiento
 * 3. Validates GPS coordinates if provided
 * 4. Persists the station
 */

import type { Station } from "../../domain/entities/Station.js";
import { createStation } from "../../domain/entities/Station.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import { DuplicateStationNameError } from "../../domain/errors/StationErrors.js";
import {
  CorregimientoNotFoundError,
  InactiveParentError,
} from "../../domain/errors/GeographyErrors.js";
import { Coordinates } from "../../domain/value-objects/Coordinates.js";

export interface CreateStationInput {
  name: string;
  corregimientoId: string;
  neighborhoodId?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateStationOutput {
  stationId: string;
}

export class CreateStationUseCase {
  constructor(
    private readonly stationRepo: IStationRepository,
    private readonly corregimientoRepo: ICorregimientoRepository
  ) {}

  async execute(input: CreateStationInput): Promise<CreateStationOutput> {
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
    const existingStation = await this.stationRepo.findByNameAndCorregimiento(
      input.name,
      input.corregimientoId
    );
    if (existingStation) {
      throw new DuplicateStationNameError(input.name, input.corregimientoId);
    }

    // 4. Validate GPS coordinates if provided
    let coordinates: Coordinates | null = null;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordinates = Coordinates.create(input.latitude, input.longitude);
    }

    // 5. Create station entity
    const stationId = `station-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const station = createStation({
      id: stationId,
      name: input.name.trim(),
      corregimientoId: input.corregimientoId,
      neighborhoodId: input.neighborhoodId ?? null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    // 6. Persist station
    await this.stationRepo.save(station);

    return { stationId };
  }
}
