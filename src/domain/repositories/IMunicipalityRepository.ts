/**
 * Repository port: IMunicipalityRepository
 *
 * Persistence interface for Municipality entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { Municipality } from "../entities/Municipality.js";

export interface IMunicipalityRepository {
  findById(id: string): Promise<Municipality | null>;
  findRoot(): Promise<Municipality | null>;
  save(municipality: Municipality): Promise<void>;
}
