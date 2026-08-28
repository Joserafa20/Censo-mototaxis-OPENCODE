import type { IReportRepository, UserScope } from "../../domain/repositories/IReportRepository.js";
import type { ReportFilters, ReportFiltersInput } from "../../domain/value-objects/ReportFilters.js";
import { validateReportFilters } from "../../domain/value-objects/ReportFilters.js";
import {
  InvalidPeriodError,
  InvalidCorregimientoError,
  InvalidStationError,
  ForbiddenIncludeInactiveError,
} from "../../domain/errors/ReportErrors.js";
import type { ReportSummary } from "../../domain/entities/ReportSummary.js";
import type { IReportCache } from "../../infrastructure/cache/InMemoryReportCache.js";
import type { DataSource } from "typeorm";

export class GetReportSummaryUseCase {
  constructor(
    private reportRepo: IReportRepository,
    private cache: IReportCache,
    private dataSource: DataSource,
  ) {}

  async execute(input: ReportFiltersInput, scope: UserScope): Promise<{ summary: ReportSummary; cacheHit: boolean }> {
    const filters = validateReportFilters(input);

    if (filters.includeInactive && scope.role !== "admin") {
      throw new ForbiddenIncludeInactiveError();
    }

    // FK existence checks
    if (filters.periodId) {
      const repo = this.dataSource.getRepository("CensusPeriodEntity" as any);
      const exists = await repo.findOne({ where: { id: filters.periodId } });
      if (!exists) throw new InvalidPeriodError();
    }
    if (filters.corregimientoId) {
      const repo = this.dataSource.getRepository("CorregimientoEntity" as any);
      const exists = await repo.findOne({ where: { id: filters.corregimientoId } });
      if (!exists) throw new InvalidCorregimientoError();
    }
    if (filters.stationId) {
      const repo = this.dataSource.getRepository("StationEntity" as any);
      const exists = await repo.findOne({ where: { id: filters.stationId } });
      if (!exists || !exists.isActive) throw new InvalidStationError();
    }

    const cached = this.cache.get(filters, scope);
    if (cached) return { summary: cached, cacheHit: true };

    const summary = await this.reportRepo.getSummary(filters, scope);
    this.cache.set(filters, scope, summary);
    return { summary, cacheHit: false };
  }
}
