/**
 * Repository port: ICensusRecordRepository
 *
 * Persistence interface for CensusRecord entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { CensusRecord, CensusRecordStatus, OperationType } from "../entities/CensusRecord.js";

export interface CensusRecordListFilters {
  periodId?: string;
  corregimientoId?: string;
  neighborhoodId?: string;
  stationId?: string;
  operationType?: OperationType;
  status?: CensusRecordStatus;
  createdByUserId?: string;
  searchTerm?: string;
}

export interface CensusRecordListOptions {
  filters?: CensusRecordListFilters;
  limit?: number;
  offset?: number;
}

export interface ICensusRecordRepository {
  findById(id: string): Promise<CensusRecord | null>;
  findByCedula(cedula: string): Promise<CensusRecord | null>;
  findByPlate(plate: string): Promise<CensusRecord | null>;
  findAll(options?: CensusRecordListOptions): Promise<CensusRecord[]>;
  countAll(filters?: CensusRecordListFilters): Promise<number>;
  save(record: CensusRecord): Promise<void>;
  deactivateById(id: string, reason: string): Promise<void>;
  countActiveByStationId(stationId: string): Promise<number>;
  countActiveByPeriodId(periodId: string): Promise<number>;
  countByStatus(periodId: string, statuses: CensusRecordStatus[]): Promise<number>;
  countByStatusGrouped(periodId: string): Promise<Record<string, number>>;
  updateStatus(id: string, status: CensusRecordStatus, extra?: Partial<Pick<CensusRecord, "validationReason" | "validatedBy" | "validatedAt">>): Promise<void>;
}
