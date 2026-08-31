import PDFDocument from "pdfkit";
import { createHash, randomUUID } from "crypto";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";
import type { ReportSummary } from "../../domain/entities/ReportSummary.js";
import type { IExporter, ExportMeta } from "../../domain/services/IExporter.js";
import { LEY_1581_NOTICE } from "../../domain/services/Anonymizer.js";

export class PdfExporter implements IExporter {
  async export(records: CensusRecord[], summary: ReportSummary, meta: ExportMeta & { escudoBuffer?: Buffer | null }): Promise<Buffer> {
    const folio = meta.folio ?? randomUUID();
    const generatedAt = meta.generatedAt ?? new Date();
    const hash = createHash("sha256").update(JSON.stringify({ records, summary, folio })).digest("hex");

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, info: { Title: `Censo Mototaxis - ${folio}` } } as any);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header - escudo
      const escudoBuf = (meta as any).escudoBuffer as Buffer | null | undefined;
      if (escudoBuf) {
        try { doc.image(escudoBuf, 40, 30, { width: 40, height: 40 }); } catch {}
        doc.fontSize(16).fillColor("#1e40af").text("Censo de Mototaxis — Sabanalarga", { align: "center" });
      } else {
        doc.fontSize(16).fillColor("#1e40af").text("Censo de Mototaxis — Sabanalarga", { align: "center" });
      }
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#555").text(`Folio: ${folio}  |  Fecha: ${generatedAt.toISOString()}  |  Periodo: ${meta.periodName ?? "—"}  |  Operador: ${meta.operatorName ?? "—"}`, { align: "center" });
      doc.fontSize(7).fillColor("#888").text(`SHA256: ${hash}`, { align: "center" });
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
      doc.moveDown(0.8);

      // Summary section
      doc.fontSize(11).fillColor("#111").text("Resumen", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(8).fillColor("#222");
      const lines = [
        `Total global: ${summary.totalGlobal}`,
        `Urban: ${summary.byLocationType.urban}  Rural: ${summary.byLocationType.rural}`,
        `Estación: ${summary.byOperationType.station}  Independiente: ${summary.byOperationType.independent}`,
        `Total filas exportadas: ${meta.total}`,
        `Filtros: ${JSON.stringify(meta.filtersApplied ?? {})}`,
      ];
      lines.forEach((l) => doc.text(`• ${l}`));
      doc.moveDown(0.6);

      // Table-like records (paginated, limited)
      doc.fontSize(10).fillColor("#111").text(`Registros (${records.length})`, { underline: true });
      doc.moveDown(0.3);
      const headers = ["Cédula", "Nombre", "Placa", "Corregimiento", "Operación", "Estado"];
      const colW = [80, 110, 70, 100, 70, 60];
      let x = 40;
      doc.fontSize(7).fillColor("#fff");
      // header background
      doc.rect(40, doc.y, 515, 14).fill("#1e40af");
      doc.fillColor("#fff");
      let hx = 40;
      headers.forEach((h, i) => {
        doc.text(h, hx + 4, doc.y - 10, { width: colW[i], align: "left" });
        hx += colW[i];
      });
      doc.moveDown(0.6);
      doc.fillColor("#222");
      for (const r of records.slice(0, 500)) {
        if (doc.y > 750) {
          doc.addPage();
        }
        const row = [r.mototaxiCedula, `${r.mototaxiFirstName} ${r.mototaxiLastName}`, r.motorcyclePlate, r.corregimientoId.slice(0, 8), r.operationType, r.status];
        let cx = 40;
        const y = doc.y;
        // alternating row bg
        // doc.rect(40, y-2, 515, 12).fillOpacity(0.03).fill("#eee").fillOpacity(1);
        row.forEach((val, i) => {
          doc.fontSize(6).text(String(val ?? ""), cx + 4, y, { width: colW[i], align: "left" });
          cx += colW[i];
        });
        doc.moveDown(0.7);
      }

      // Footer + Aviso
      doc.moveDown(1);
      doc.fontSize(7).fillColor("#555").text(LEY_1581_NOTICE, { align: "justify" });

      // Add page numbers footer
      const range = (doc as any).bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        (doc as any).switchToPage(i);
        doc.fontSize(6).fillColor("#999").text(`Página ${i + 1} de ${range.count}  —  Folio ${folio}`, 40, 820, { align: "center", width: 515 });
      }

      doc.end();
    });
  }

  getContentType(): string {
    return "application/pdf";
  }
  getExtension(): string {
    return "pdf";
  }
}
