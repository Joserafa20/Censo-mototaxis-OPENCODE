import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import { StickerNotFoundError } from "../../domain/errors/index.js";

export interface VerifyResult { folio: string; plate: string; status: string; validatedAt: string | null; holderInitials: string; isValid: boolean; }

export class VerifyStickerUseCase {
  constructor(private readonly repo: ICensusRecordRepository, private readonly auditRepo?: any) {}
  async execute(folio: string): Promise<VerifyResult> {
    const rec: any = await this.repo.findByFolio(folio);
    if (!rec) throw new StickerNotFoundError(folio);
    if (this.auditRepo?.save) {
      try { await this.auditRepo.save({ action: "VERIFY_HIT", folio, at: new Date() }); } catch {}
    }
    // also try generic audit_logs table if dataSource provided
    const initials = `${(rec.mototaxiFirstName?.[0] ?? "").toUpperCase()}.${(rec.mototaxiLastName?.[0] ?? "").toUpperCase()}.`;
    return {
      folio: rec.stickerFolio,
      plate: rec.motorcyclePlate,
      status: rec.status,
      validatedAt: rec.validatedAt ? new Date(rec.validatedAt).toISOString() : null,
      holderInitials: initials,
      isValid: rec.status === "APROBADO" || rec.status === "APROBADA",
    };
  }
}
