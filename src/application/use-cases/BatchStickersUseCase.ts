import { randomUUID } from "crypto";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import { BatchLimitExceededError, StickerNotEligibleError } from "../../domain/errors/index.js";
import { BatchSheetRenderer } from "../../infrastructure/export/BatchSheetRenderer.js";

export class BatchStickersUseCase {
  constructor(private readonly repo: ICensusRecordRepository, private readonly renderer: BatchSheetRenderer, private readonly dataSource?: any) {}
  async execute(params: { ids: string[]; actorUserId: string; actorRole: string }): Promise<{ pdf: Buffer; folios: string[] }> {
    if (!params.ids?.length) { const e: any = new Error("ids required"); e.statusCode = 400; throw e; }
    if (params.ids.length > 100) throw new BatchLimitExceededError(100);
    const unique = [...new Set(params.ids)];
    if (this.dataSource) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const records = await this.repo.findByIdsForUpdate(unique, qr.manager);
        if (records.length !== unique.length) { const e: any = new Error("Algunos registros no encontrados"); e.statusCode = 404; throw e; }
        for (const r of records) {
          if (r.status !== "APROBADO" && r.status !== "APROBADA") throw new StickerNotEligibleError(`Registro ${r.id} no APROBADO`);
          if (params.actorRole !== "admin" && r.createdByUserId !== params.actorUserId) { const e: any = new Error("No tiene permisos"); e.statusCode = 403; throw e; }
        }
        for (const r of records) {
          if (!(r as any).stickerFolio) {
            (r as any).stickerFolio = randomUUID();
            await qr.manager.update((await import("../../infrastructure/database/entities/CensusRecordEntity.js")).CensusRecordEntity, r.id, { stickerFolio: (r as any).stickerFolio } as any);
          }
        }
        await qr.commitTransaction();
        const pdf = await this.renderer.render(records as any);
        return { pdf, folios: records.map((r: any) => r.stickerFolio) };
      } catch (e) { try { await qr.rollbackTransaction(); } catch {} throw e; } finally { try { await qr.release(); } catch {} }
    } else {
      const records: any[] = [];
      for (const id of unique) {
        const r: any = await this.repo.findById(id);
        if (!r) { const e: any = new Error("Algunos registros no encontrados"); e.statusCode = 404; throw e; }
        if (r.status !== "APROBADO" && r.status !== "APROBADA") throw new StickerNotEligibleError(`Registro ${r.id} no APROBADO`);
        if (params.actorRole !== "admin" && r.createdByUserId !== params.actorUserId) { const e: any = new Error("No tiene permisos"); e.statusCode = 403; throw e; }
        if (!r.stickerFolio) { r.stickerFolio = randomUUID(); await this.repo.save(r); }
        records.push(r);
      }
      const pdf = await this.renderer.render(records);
      return { pdf, folios: records.map(r => r.stickerFolio) };
    }
  }
}
