/**
 * Use case: CreateStationUseCase
 *
 * Creates a new mototaxi station:
 * 1. Validates locationType is provided
 * 2. If rural: validates corregimiento exists and is active
 * 3. If urban: validates name uniqueness in urban area
 * 4. Validates name uniqueness within the location
 * 5. Validates GPS coordinates if provided
 * 6. Persists the station
 */

import type { Station, StationLocationType } from "../../domain/entities/Station.js";
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
  locationType: StationLocationType;
  corregimientoId?: string;
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
    // 1. Validate locationType
    if (!input.locationType) {
      throw new Error("locationType is required (urban or rural)");
    }

    if (input.locationType !== "urban" && input.locationType !== "rural") {
      throw new Error("locationType must be 'urban' or 'rural'");
    }

    // 2. If rural, validate corregimiento
    if (input.locationType === "rural") {
      if (!input.corregimientoId) {
        throw new Error("corregimientoId is required for rural stations");
      }

      const corregimiento = await this.corregimientoRepo.findById(input.corregimientoId);
      if (!corregimiento) {
        throw new CorregimientoNotFoundError(input.corregimientoId);
      }

      if (!corregimiento.isActive) {
        throw new InactiveParentError("corregimiento", corregimiento.name);
      }
    }

    // 3. If urban, corregimientoId must be null
    if (input.locationType === "urban") {
      if (input.corregimientoId) {
        throw new Error("corregimientoId must be null for urban stations");
      }
    }

    // 4. Validate name uniqueness within the location
    const existingStation = await this.stationRepo.findByNameAndLocation(
      input.name.trim(),
      input.locationType,
      input.locationType === "rural" ? input.corregimientoId ?? null : null
    );
    if (existingStation) {
      throw new DuplicateStationNameError(input.name, input.corregimientoId ?? "urban");
    }

    // 5. Validate GPS coordinates if provided
    let coordinates: Coordinates | null = null;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordinates = Coordinates.create(input.latitude, input.longitude);
    }

    // 6. Create station entity
    const stationId = `station-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const station = createStation({
      id: stationId,
      name: input.name.trim(),
      locationType: input.locationType,
      corregimientoId: input.locationType === "rural" ? (input.corregimientoId ?? null) : null,
      neighborhoodId: input.neighborhoodId ?? null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    // 7. Persist station
    await this.stationRepo.save(station);

    return { stationId };
  }
}
