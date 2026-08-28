/**
 * Repository port: INeighborhoodRepository
 *
 * Persistence interface for Neighborhood entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { Neighborhood } from "../entities/Neighborhood.js";

export interface NeighborhoodListFilters {
  corregimientoId?: string;
  municipalityId?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface INeighborhoodRepository {
  findById(id: string): Promise<Neighborhood | null>;
  findByNameAndCorregimiento(name: string, corregimientoId: string): Promise<Neighborhood | null>;
  findByCorregimiento(corregimientoId: string): Promise<Neighborhood[]>;
  findAll(filters?: NeighborhoodListFilters): Promise<Neighborhood[]>;
  save(neighborhood: Neighborhood): Promise<void>;
  deactivateByCorregimientoId(corregimientoId: string, deactivatedBy: string): Promise<void>;
  reactivateById(id: string): Promise<void>;
  countByCorregimientoId(corregimientoId: string): Promise<number>;
}
