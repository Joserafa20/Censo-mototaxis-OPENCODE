import type { ReportFilters } from "../value-objects/ReportFilters.js";
import type { ReportSummary } from "../entities/ReportSummary.js";
import type { CensusRecord } from "../entities/CensusRecord.js";

export interface UserScope {
  userId: string;
  role: "admin" | "censista";
}

export interface IReportRepository {
  getSummary(filters: ReportFilters, scope: UserScope): Promise<ReportSummary>;
  getFilteredRecords(filters: ReportFilters, scope: UserScope, pagination?: { page: number; limit: number }): Promise<CensusRecord[]>;
  countFiltered(filters: ReportFilters, scope: UserScope): Promise<number>;
}
