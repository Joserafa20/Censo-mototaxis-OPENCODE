import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";

export interface StickerData {
  folio: string;
  plate: string;
  date: string;
  verifyUrl: string;
  holderName: string;
}

function buildVerifyUrl(folio: string): string {
  const base = process.env.VERIFY_BASE_URL ?? "https://censo.sabanalarga.gov.co/verify";
  return `${base.replace(/\/$/, "")}/${folio}`;
}

export class StickerRenderer {
  async render(record: CensusRecord, folio: string): Promise<Buffer> {
    const verifyUrl = buildVerifyUrl(folio);
    const qrBuf = await QRCode.toBuffer(verifyUrl, { width: 180, margin: 1 });
    const logoPath = path.join(process.cwd(), "assets", "logo-alcaldia.png");
    const hasLogo = existsSync(logoPath);
    let logoBuf: Buffer | null = null;
    if (hasLogo) try { logoBuf = readFileSync(logoPath); } catch {}

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [260, 380], margin: 12, info: { Title: `Adhesivo ${folio}` } } as any);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Border
      doc.rect(6, 6, 248, 368).strokeColor("#1e3a8a").lineWidth(1.5).stroke();

      if (logoBuf) {
        try { doc.image(logoBuf, 20, 14, { width: 40, height: 40 }); } catch {}
      } else {
        doc.fontSize(6).fillColor("#1e3a8a").text("ALCALDIA SABANALARGA", 20, 20, { width: 40 });
      }
      doc.fontSize(9).fillColor("#1e3a8a").text("CENSO MOTOTAXIS", 70, 18, { align: "left" });
      doc.fontSize(6).fillColor("#555").text("Adhesivo Oficial", 70, 30);

      doc.moveTo(12, 58).lineTo(248, 58).strokeColor("#ccc").lineWidth(0.5).stroke();

      // Fields
      let y = 66;
      doc.fontSize(7).fillColor("#666").text("FOLIO", 16, y);
      doc.fontSize(8).fillColor("#111").text(folio, 16, y + 9, { width: 228 });
      y += 28;
      doc.fontSize(7).fillColor("#666").text("PLACA", 16, y);
      doc.fontSize(14).fillColor("#111").text(record.motorcyclePlate, 16, y + 9);
      y += 30;
      doc.fontSize(7).fillColor("#666").text("FECHA", 16, y);
      doc.fontSize(7).fillColor("#111").text(new Date().toISOString().slice(0, 10), 16, y + 9);
      y += 22;
      doc.fontSize(6).fillColor("#666").text(`Titular: ${record.mototaxiFirstName} ${record.mototaxiLastName}`, 16, y);

      // QR
      doc.image(qrBuf, 65, 180, { width: 130, height: 130 });
      doc.fontSize(5).fillColor("#666").text(verifyUrl, 16, 312, { align: "center", width: 228 });
      doc.fontSize(5).fillColor("#999").text("Verifique en censo.sabanalarga.gov.co", 16, 330, { align: "center", width: 228 });
      doc.fontSize(5).fillColor("#999").text(`Placa ${record.motorcyclePlate} - Folio ${folio.slice(0, 8)}`, 16, 340, { align: "center", width: 228 });

      doc.end();
    });
  }
}
