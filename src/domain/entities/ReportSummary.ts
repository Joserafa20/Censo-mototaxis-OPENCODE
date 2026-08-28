import type { ReportFilters } from "../value-objects/ReportFilters.js";

export interface ReportSummary {
  totalGlobal: number;
  totalByPeriod: { periodId: string; periodName: string; total: number }[];
  byLocationType: { urban: number; rural: number };
  byCorregimiento: { corregimientoId: string; name: string; locationType: string; total: number }[];
  byOperationType: { station: number; independent: number };
  byStation: { stationId: string; name: string; total: number }[];
  byMotoType: { brand: string; total: number }[];
  byGenero: { genero: string; total: number }[];
  byRangoEdad: { rango: string; total: number }[];
  evolucionPorPeriodo: { periodId: string; periodName: string; total: number }[];
  filtersApplied: ReportFilters;
  generatedAt: string;
}
