/**
 * Repository port: IStationRepository
 *
 * Persistence interface for Station entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { Station } from "../entities/Station.js";

export interface StationListFilters {
  corregimientoId?: string;
  neighborhoodId?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface IStationRepository {
  findById(id: string): Promise<Station | null>;
  findByNameAndCorregimiento(
    name: string,
    corregimientoId: string
  ): Promise<Station | null>;
  findAll(filters?: StationListFilters): Promise<Station[]>;
  save(station: Station): Promise<void>;
  deactivateById(id: string): Promise<void>;
  countActiveByCorregimientoId(corregimientoId: string): Promise<number>;
}
