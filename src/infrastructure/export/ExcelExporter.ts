import ExcelJS from "exceljs";
import { LEY_1581_NOTICE } from "../../domain/services/Anonymizer.js";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";
import type { ReportSummary } from "../../domain/entities/ReportSummary.js";
import type { IExporter, ExportMeta } from "../../domain/services/IExporter.js";
import { createHash, randomUUID } from "crypto";

const HEADERS = [
  "id","periodId","corregimientoId","stationId","operationType","mototaxiCedula","mototaxiFirstName","mototaxiLastName","mototaxiPhone","motorcyclePlate","motorcycleBrand","motorcycleModel","motorcycleColor","status","isActive","createdByUserId","createdAt",
];

function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } } as any;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as any;
}

export class ExcelExporter implements IExporter {
  async export(records: CensusRecord[], summary: ReportSummary, meta: ExportMeta): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Censo Mototaxis";
    wb.created = meta.generatedAt ?? new Date();
    const folio = meta.folio ?? randomUUID();

    // --- Hoja Aviso ---
    const aviso = wb.addWorksheet("Aviso", { properties: { tabColor: { argb: "FFFF0000" } } });
    aviso.getCell("A1").value = LEY_1581_NOTICE;
    aviso.getCell("A1").font = { italic: true, size: 10, color: { argb: "FF444444" } };
    aviso.getCell("A1").alignment = { wrapText: true, vertical: "middle" };
    aviso.getRow(1).height = 40;
    aviso.getColumn(1).width = 120;
    aviso.getCell("A3").value = `Folio: ${folio}`;
    aviso.getCell("A4").value = `Generado: ${(meta.generatedAt ?? new Date()).toISOString()}`;
    aviso.getCell("A5").value = `Periodo: ${meta.periodName ?? "—"}`;
    aviso.getCell("A6").value = `Operador: ${meta.operatorName ?? "—"}`;
    const hash = createHash("sha256").update(JSON.stringify({ records, folio })).digest("hex");
    aviso.getCell("A7").value = `SHA256: ${hash}`;

    // --- Hoja Resumen ---
    const resumen = wb.addWorksheet("Resumen");
    resumen.getCell("A1").value = "Resumen del Censo";
    resumen.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    resumen.addRow([]);
    const addKpi = (k: string, v: string | number) => {
      const r = resumen.addRow([k, v]);
      r.getCell(1).font = { bold: true };
      return r;
    };
    addKpi("Folio", folio);
    addKpi("Total global", summary.totalGlobal);
    addKpi("Urban", summary.byLocationType.urban);
    addKpi("Rural", summary.byLocationType.rural);
    addKpi("Estación", summary.byOperationType.station);
    addKpi("Independiente", summary.byOperationType.independent);
    addKpi("Filas exportadas", meta.total);
    resumen.addRow([]);
    resumen.addRow(["Por corregimiento"]).getCell(1).font = { bold: true, color: { argb: "FF1E40AF" } };
    const corrHeader = resumen.addRow(["Corregimiento", "Total"]);
    corrHeader.eachCell(styleHeader);
    for (const c of summary.byCorregimiento) {
      resumen.addRow([c.name, c.total]);
    }
    resumen.columns.forEach((col) => { col.width = 28; });

    // --- Hoja Datos ---
    const datos = wb.addWorksheet("Datos", { properties: { tabColor: { argb: "FF1E40AF" } } });
    // header row
    const headerRow = datos.addRow(HEADERS);
    headerRow.eachCell(styleHeader);
    headerRow.height = 20;
    // freeze pane
    (datos as any).views = [{ state: "frozen", ySplit: 1 }];
    datos.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } } as any;

    for (const r of records) {
      datos.addRow([
        r.id, r.periodId, r.corregimientoId, r.stationId ?? "", r.operationType, r.mototaxiCedula, r.mototaxiFirstName, r.mototaxiLastName, r.mototaxiPhone ?? "", r.motorcyclePlate, r.motorcycleBrand, r.motorcycleModel, r.motorcycleColor, r.status, r.isActive, r.createdByUserId, r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      ]);
    }
    // column widths
    const widths: Record<string, number> = { id: 18, mototaxiCedula: 14, mototaxiFirstName: 16, motorcyclePlate: 12, createdAt: 22 };
    HEADERS.forEach((h, i) => {
      const col = datos.getColumn(i + 1);
      col.width = widths[h] ?? 14;
    });
    // thin borders for data
    datos.eachRow((row, idx) => {
      if (idx === 1) return;
      row.eachCell((cell) => {
        cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } } as any;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  getContentType(): string {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  getExtension(): string {
    return "xlsx";
  }
}
