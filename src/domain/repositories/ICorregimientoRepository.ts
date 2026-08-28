/**
 * Repository port: ICorregimientoRepository
 *
 * Persistence interface for Corregimiento entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { Corregimiento } from "../entities/Corregimiento.js";

export interface CorregimientoListFilters {
  municipalityId?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface ICorregimientoRepository {
  findById(id: string): Promise<Corregimiento | null>;
  findByNameAndMunicipality(name: string, municipalityId: string): Promise<Corregimiento | null>;
  findByMunicipality(municipalityId: string): Promise<Corregimiento[]>;
  findAll(filters?: CorregimientoListFilters): Promise<Corregimiento[]>;
  save(corregimiento: Corregimiento): Promise<void>;
  deactivateById(id: string, deactivatedBy: string): Promise<void>;
  reactivateById(id: string): Promise<void>;
}
