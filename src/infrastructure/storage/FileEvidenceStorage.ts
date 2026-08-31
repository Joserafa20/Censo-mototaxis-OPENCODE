import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join, extname } from "path";
import { mimeToExtension } from "../../domain/value-objects/EvidencePhoto.js";

export interface IEvidenceStorage {
  save(buffer: Buffer, mime: string): Promise<string>;
}

export class FileEvidenceStorage implements IEvidenceStorage {
  constructor(private readonly basePath: string) {
    try { mkdirSync(this.basePath, { recursive: true }); } catch {}
  }

  async save(buffer: Buffer, mime: string): Promise<string> {
    const ext = mimeToExtension(mime);
    const filename = `${randomUUID()}.${ext}`;
    const full = join(this.basePath, filename);
    try { mkdirSync(this.basePath, { recursive: true }); } catch {}
    writeFileSync(full, buffer);
    return `/evidence/${filename}`;
  }
}
