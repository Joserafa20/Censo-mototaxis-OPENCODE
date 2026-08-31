import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";

function verifyUrl(folio: string): string {
  const base = process.env.VERIFY_BASE_URL ?? "https://censo.sabanalarga.gov.co/verify";
  return `${base.replace(/\/$/, "")}/${folio}`;
}

export class BatchSheetRenderer {
  async render(records: Array<CensusRecord & { stickerFolio: string }>): Promise<Buffer> {
    const qrMap = new Map<string, Buffer>();
    for (const r of records) {
      const buf = await QRCode.toBuffer(verifyUrl(r.stickerFolio!), { width: 120, margin: 0 });
      qrMap.set(r.id, buf);
    }
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 18, info: { Title: `Lote adhesivos ${records.length}` } } as any);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const cols = 2, rows = 3;
      const cellW = (595 - 36) / cols; // A4 width 595pt
      const cellH = (842 - 36) / rows;
      const perPage = 6;

      records.forEach((rec, idx) => {
        if (idx > 0 && idx % perPage === 0) doc.addPage();
        const pos = idx % perPage;
        const col = pos % cols;
        const row = Math.floor(pos / cols);
        const x = 18 + col * cellW;
        const y = 18 + row * cellH;

        // crop marks
        doc.save();
        doc.rect(x + 2, y + 2, cellW - 4, cellH - 4).strokeColor("#1e3a8a").lineWidth(0.7).stroke();
        // corner crop marks
        const mk = 6;
        [[x, y], [x + cellW, y], [x, y + cellH], [x + cellW, y + cellH]].forEach(([cx, cy]) => {
          doc.moveTo(cx - mk, cy).lineTo(cx + mk, cy).moveTo(cx, cy - mk).lineTo(cx, cy + mk).strokeColor("#999").lineWidth(0.4).stroke();
        });

        doc.fontSize(6).fillColor("#1e3a8a").text("CENSO MOTOTAXIS - SABANALARGA", x + 6, y + 8, { width: cellW - 12, align: "center" });
        doc.fontSize(5).fillColor("#666").text(`FOLIO ${rec.stickerFolio}`, x + 6, y + 18, { width: cellW - 12, align: "center" });
        doc.fontSize(10).fillColor("#111").text(rec.motorcyclePlate, x + 6, y + 28, { width: cellW - 12, align: "center" });
        const qr = qrMap.get(rec.id)!;
        const qSize = 70;
        doc.image(qr, x + (cellW - qSize) / 2, y + 44, { width: qSize, height: qSize });
        doc.fontSize(4).fillColor("#888").text(verifyUrl(rec.stickerFolio!), x + 6, y + cellH - 28, { width: cellW - 12, align: "center" });
        doc.fontSize(4).fillColor("#999").text(new Date().toISOString().slice(0, 10), x + 6, y + cellH - 14, { width: cellW - 12, align: "center" });
        doc.restore();
      });

      doc.end();
    });
  }
}
