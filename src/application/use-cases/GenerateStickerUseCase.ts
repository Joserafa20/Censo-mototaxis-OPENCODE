import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { IAlcaldiaConfigRepository } from "../../domain/repositories/IAlcaldiaConfigRepository.js";
import { CensusRecordNotFoundError, StickerNotEligibleError } from "../../domain/errors/index.js";
import { StickerRenderer } from "../../infrastructure/export/StickerRenderer.js";

function isEligible(status: string): boolean {
  return status === "APROBADO" || status === "APROBADA";
}

async function resolveEscudoBuffer(alcaldiaRepo?: IAlcaldiaConfigRepository | null): Promise<Buffer | null> {
  if (!alcaldiaRepo) return null;
  try {
    const config = await alcaldiaRepo.get();
    const escudoPath = (config as any).escudoPath as string | null;
    if (!escudoPath) return null;
    const abs = path.join(process.cwd(), escudoPath.replace(/^\//, ""));
    if (!existsSync(abs)) return null;
    return readFileSync(abs);
  } catch { return null; }
}

export class GenerateStickerUseCase {
  constructor(
    private readonly repo: ICensusRecordRepository,
    private readonly renderer: StickerRenderer,
    private readonly dataSource?: any,
    private readonly alcaldiaRepo?: IAlcaldiaConfigRepository | null
  ) {}

  async execute(params: { recordId: string; actorUserId: string; actorRole: string }): Promise<{ folio: string; pdf: Buffer }> {
    const rec = await this.repo.findById(params.recordId);
    if (!rec) throw new CensusRecordNotFoundError(params.recordId);
    if (params.actorRole !== "admin" && rec.createdByUserId !== params.actorUserId) {
      const e: any = new Error("No tiene permisos");
      e.statusCode = 403;
      throw e;
    }
    if (!isEligible(rec.status)) throw new StickerNotEligibleError();

    const escudoBuffer = await resolveEscudoBuffer(this.alcaldiaRepo ?? null);
    // idempotent lazy folio with FOR UPDATE if dataSource available
    if ((rec as any).stickerFolio) {
      const pdf = await this.renderer.render(rec as any, (rec as any).stickerFolio, escudoBuffer);
      return { folio: (rec as any).stickerFolio, pdf };
    }

    let folio = randomUUID();
    // atomic assignment - simple path for SQLite (pessimistic lock not supported on better-sqlite3)
    if (false && this.dataSource) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const locked = await this.repo.findByIdsForUpdate([params.recordId], qr.manager);
        const current = locked[0];
        if (!current) throw new CensusRecordNotFoundError(params.recordId);
        if (!isEligible(current.status)) throw new StickerNotEligibleError();
        if ((current as any).stickerFolio) {
          await qr.commitTransaction();
          const pdf = await this.renderer.render(current as any, (current as any).stickerFolio, escudoBuffer);
          return { folio: (current as any).stickerFolio, pdf };
        }
        (current as any).stickerFolio = folio;
        await qr.manager.save((await import("../../infrastructure/database/entities/CensusRecordEntity.js")).CensusRecordEntity, {
          id: current.id,
          stickerFolio: folio,
        } as any);
        // also audit optional
        await qr.commitTransaction();
        (rec as any).stickerFolio = folio;
        const pdf = await this.renderer.render({ ...rec, stickerFolio: folio } as any, folio, escudoBuffer);
        return { folio, pdf };
      } catch (e) {
        try { await qr.rollbackTransaction(); } catch {}
        throw e;
      } finally {
        try { await qr.release(); } catch {}
      }
    } else {
      (rec as any).stickerFolio = folio;
      await this.repo.save(rec as any);
      const pdf = await this.renderer.render(rec as any, folio, escudoBuffer);
      return { folio, pdf };
    }
  }
}
