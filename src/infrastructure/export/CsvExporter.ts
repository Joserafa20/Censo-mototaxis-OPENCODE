import type { CensusRecord } from "../../domain/entities/CensusRecord.js";
import { LEY_1581_NOTICE } from "../../domain/services/Anonymizer.js";

const HEADERS = [
  "id",
  "periodId",
  "corregimientoId",
  "stationId",
  "operationType",
  "mototaxiCedula",
  "mototaxiFirstName",
  "mototaxiLastName",
  "mototaxiPhone",
  "motorcyclePlate",
  "motorcycleBrand",
  "motorcycleModel",
  "motorcycleColor",
  "status",
  "isActive",
  "createdByUserId",
  "createdAt",
];

function escapeCsv(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export class CsvExporter {
  export(records: CensusRecord[]): string {
    const lines: string[] = [];
    // Ley 1581 notice as first row (single column)
    lines.push(`"${LEY_1581_NOTICE}"`);
    lines.push(HEADERS.join(","));
    for (const r of records) {
      const row = [
        r.id,
        r.periodId,
        r.corregimientoId,
        r.stationId ?? "",
        r.operationType,
        r.mototaxiCedula,
        r.mototaxiFirstName,
        r.mototaxiLastName,
        r.mototaxiPhone ?? "",
        r.motorcyclePlate,
        r.motorcycleBrand,
        r.motorcycleModel,
        r.motorcycleColor,
        r.status,
        r.isActive,
        r.createdByUserId,
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      ].map(escapeCsv).join(",");
      lines.push(row);
    }
    return lines.join("\n");
  }

  getHeaders(): string[] {
    return HEADERS;
  }
}
