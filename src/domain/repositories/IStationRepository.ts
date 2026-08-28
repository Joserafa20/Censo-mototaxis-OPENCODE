/**
 * Repository port: IStationRepository
 *
 * Persistence interface for Station entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { Station, StationLocationType } from "../entities/Station.js";

export interface StationListFilters {
  locationType?: StationLocationType;
  corregimientoId?: string;
  neighborhoodId?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface IStationRepository {
  findById(id: string): Promise<Station | null>;
  findByNameAndLocation(
    name: string,
    locationType: StationLocationType,
    corregimientoId?: string | null
  ): Promise<Station | null>;
  findAll(filters?: StationListFilters): Promise<Station[]>;
  save(station: Station): Promise<void>;
  deactivateById(id: string): Promise<void>;
  countActiveByCorregimientoId(corregimientoId: string): Promise<number>;
}
