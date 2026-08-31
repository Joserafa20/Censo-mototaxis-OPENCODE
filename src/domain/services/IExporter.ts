import type { CensusRecord } from "../entities/CensusRecord.js";
import type { ReportSummary } from "../entities/ReportSummary.js";

export interface ExportMeta {
  periodName?: string;
  operatorName?: string;
  generatedAt: Date;
  folio: string;
  hash?: string;
  filtersApplied?: Record<string, unknown>;
  total: number;
}

export interface IExporter {
  export(records: CensusRecord[], summary: ReportSummary, meta: ExportMeta): Promise<Buffer>;
  getContentType(): string;
  getExtension(): string;
}
