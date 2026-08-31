import type { IReportRepository, UserScope } from "../../domain/repositories/IReportRepository.js";
import type { ReportFiltersInput } from "../../domain/value-objects/ReportFilters.js";
import { validateReportFilters } from "../../domain/value-objects/ReportFilters.js";
import {
  InvalidPeriodError,
  InvalidCorregimientoError,
  InvalidStationError,
  ForbiddenIncludeInactiveError,
  InvalidFormatError,
  ExportLimitExceededError,
} from "../../domain/errors/ReportErrors.js";
import { maskCedula, maskPhone, maskName } from "../../domain/services/Anonymizer.js";
import type { DataSource } from "typeorm";
import { CsvExporter } from "../../infrastructure/export/CsvExporter.js";
import { ExcelExporter } from "../../infrastructure/export/ExcelExporter.js";
import { PdfExporter } from "../../infrastructure/export/PdfExporter.js";
import { randomUUID } from "crypto";

const EXPORT_LIMIT = 10_000;

export class ExportReportUseCase {
  constructor(
    private reportRepo: IReportRepository,
    private dataSource: DataSource,
    private csvExporter: CsvExporter,
    private excelExporter?: ExcelExporter,
    private pdfExporter?: PdfExporter,
  ) {}

  async execute(
    input: ReportFiltersInput & { format: string },
    scope: UserScope,
    operatorName?: string,
  ): Promise<{ content: Buffer | string; contentType: string; filename: string; total: number }> {
    const format = input.format?.toLowerCase();
    if (format !== "csv" && format !== "xlsx" && format !== "pdf") throw new InvalidFormatError();

    const { format: _f, ...filterInput } = input as any;
    const filters = validateReportFilters(filterInput);

    if (filters.includeInactive && scope.role !== "admin") throw new ForbiddenIncludeInactiveError();

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

    const total = await this.reportRepo.countFiltered(filters, scope);
    if (total > EXPORT_LIMIT) throw new ExportLimitExceededError();

    let records = await this.reportRepo.getFilteredRecords(filters, scope);

    if (scope.role !== "admin") {
      records = records.map((r) => {
        const masked = maskName(r.mototaxiFirstName, r.mototaxiLastName);
        return {
          ...r,
          mototaxiCedula: maskCedula(r.mototaxiCedula),
          mototaxiPhone: maskPhone(r.mototaxiPhone),
          mototaxiFirstName: masked.firstName,
          mototaxiLastName: masked.lastName,
        };
      });
    }

    const summary = await this.reportRepo.getSummary(filters, scope);
    const date = new Date().toISOString().slice(0, 10);
    const folio = randomUUID();

    if (format === "csv") {
      const content = this.csvExporter.export(records);
      const filename = `censo-mototaxis-${date}.csv`;
      return { content, contentType: "text/csv; charset=utf-8", filename, total };
    }
    if (format === "xlsx") {
      const exporter = this.excelExporter ?? new ExcelExporter();
      const periodName = filters.periodId ? (await this.dataSource.getRepository("CensusPeriodEntity" as any).findOne({ where: { id: filters.periodId } }))?.name : undefined;
      const buffer = await exporter.export(records, summary, { generatedAt: new Date(), folio, total, periodName, operatorName, filtersApplied: filters as any });
      const filename = `censo-mototaxis-${date}.xlsx`;
      return { content: buffer, contentType: exporter.getContentType(), filename, total };
    }
    // pdf
    const exporter = this.pdfExporter ?? new PdfExporter();
    const periodName = filters.periodId ? (await this.dataSource.getRepository("CensusPeriodEntity" as any).findOne({ where: { id: filters.periodId } }))?.name : undefined;
    const buffer = await exporter.export(records, summary, { generatedAt: new Date(), folio, total, periodName, operatorName, filtersApplied: filters as any });
    const filename = `censo-mototaxis-${date}.pdf`;
    return { content: buffer, contentType: exporter.getContentType(), filename, total };
  }
}
