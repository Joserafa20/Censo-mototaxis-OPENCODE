/**
 * Repository port: ICensusPeriodRepository
 *
 * Persistence interface for CensusPeriod entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { CensusPeriod, CensusPeriodStatus } from "../entities/CensusPeriod.js";

export interface CensusPeriodListFilters {
  status?: CensusPeriodStatus;
  searchTerm?: string; // matches name
}

export interface CensusPeriodListOptions {
  filters?: CensusPeriodListFilters;
  limit?: number;
  offset?: number;
}

export interface ICensusPeriodRepository {
  findById(id: string): Promise<CensusPeriod | null>;
  findByName(name: string): Promise<CensusPeriod | null>;
  save(period: CensusPeriod): Promise<void>;
  findAll(options?: CensusPeriodListOptions): Promise<CensusPeriod[]>;
  countAll(filters?: CensusPeriodListFilters): Promise<number>;
  countActive(): Promise<number>;
  hasOverlap(startDate: Date, endDate: Date, excludeId?: string): Promise<boolean>;
  close?(id: string, adminId: string): Promise<CensusPeriod>;
}
