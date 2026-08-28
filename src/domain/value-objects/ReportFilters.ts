import {
  InvalidLocationTypeError,
  InvalidDateRangeError,
  InvalidOperationTypeError,
} from "../errors/ReportErrors.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReportFilters {
  periodId?: string;
  locationType?: "urban" | "rural";
  corregimientoId?: string;
  stationId?: string;
  operationType?: "station" | "independent";
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: boolean;
}

export interface ReportFiltersInput {
  periodId?: string;
  locationType?: string;
  corregimientoId?: string;
  stationId?: string;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: string | boolean;
}

export function validateReportFilters(input: ReportFiltersInput): ReportFilters {
  const out: ReportFilters = {};

  if (input.periodId) {
    if (!UUID_RE.test(input.periodId)) throw new InvalidLocationTypeError("periodId debe ser UUID válido");
    // actual existence checked in use-case via repo; here just format
    // reuse same error code but message; will be mapped to INVALID_PERIOD in use-case if not found
    out.periodId = input.periodId;
  }
  if (input.locationType) {
    if (input.locationType !== "urban" && input.locationType !== "rural") {
      throw new InvalidLocationTypeError();
    }
    out.locationType = input.locationType as "urban" | "rural";
  }
  if (input.corregimientoId) {
    if (!UUID_RE.test(input.corregimientoId)) throw new InvalidLocationTypeError("corregimientoId debe ser UUID");
    out.corregimientoId = input.corregimientoId;
  }
  if (input.stationId) {
    if (!UUID_RE.test(input.stationId)) throw new InvalidLocationTypeError("stationId debe ser UUID");
    out.stationId = input.stationId;
  }
  if (input.operationType) {
    if (input.operationType !== "station" && input.operationType !== "independent") {
      throw new InvalidOperationTypeError();
    }
    out.operationType = input.operationType as "station" | "independent";
  }
  if (input.dateFrom) {
    const d = new Date(input.dateFrom);
    if (isNaN(d.getTime())) throw new InvalidDateRangeError("dateFrom inválido");
    out.dateFrom = input.dateFrom;
  }
  if (input.dateTo) {
    const d = new Date(input.dateTo);
    if (isNaN(d.getTime())) throw new InvalidDateRangeError("dateTo inválido");
    out.dateTo = input.dateTo;
  }
  if (out.dateFrom && out.dateTo) {
    if (new Date(out.dateFrom) > new Date(out.dateTo)) throw new InvalidDateRangeError();
  }
  if (input.includeInactive !== undefined) {
    if (typeof input.includeInactive === "boolean") out.includeInactive = input.includeInactive;
    else out.includeInactive = input.includeInactive === "true";
  }
  return out;
}
