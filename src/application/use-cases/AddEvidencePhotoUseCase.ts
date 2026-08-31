import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import { isValidEvidenceMime, isValidEvidenceSize, validateEvidenceCount } from "../../domain/value-objects/EvidencePhoto.js";
import { InvalidEvidenceMimeError, PayloadTooLargeError, EvidenceLimitExceededError } from "../../domain/errors/CensusErrors.js";

export interface AddEvidenceInput {
  recordId: string;
  files: Array<{ mimetype: string; size: number; buffer: Buffer; originalname: string }>;
  actorUserId: string;
  actorRole: string;
}

export class AddEvidencePhotoUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly storage: { save(buffer: Buffer, mime: string): Promise<string> }
  ) {}

  async execute(input: AddEvidenceInput): Promise<{ evidencePhotos: string[] }> {
    const record = await this.censusRecordRepo.findById(input.recordId);
    if (!record) {
      const e: any = new Error(`Census record ${input.recordId} not found`);
      e.statusCode = 404; throw e;
    }
    if (input.actorRole !== "admin" && record.createdByUserId !== input.actorUserId) {
      const e: any = new Error("No tiene permisos para adjuntar evidencia a este registro");
      e.statusCode = 403; e.code = "FORBIDDEN"; throw e;
    }

    if (!validateEvidenceCount(record.evidencePhotos.length, input.files.length)) {
      throw new EvidenceLimitExceededError();
    }

    // Validate all before persisting (atomic)
    for (const f of input.files) {
      if (!isValidEvidenceMime(f.mimetype)) throw new InvalidEvidenceMimeError();
      if (!isValidEvidenceSize(f.size)) throw new PayloadTooLargeError();
    }

    const urls: string[] = [];
    for (const f of input.files) {
      const url = await this.storage.save(f.buffer, f.mimetype);
      urls.push(url);
    }

    const updated = [...record.evidencePhotos, ...urls];
    await this.censusRecordRepo.updateEvidencePhotos(record.id, updated);
    return { evidencePhotos: updated };
  }
}
