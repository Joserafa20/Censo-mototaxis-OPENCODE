import type { Request, Response, NextFunction } from "express";
import type { GenerateStickerUseCase } from "../../application/use-cases/GenerateStickerUseCase.js";
import type { BatchStickersUseCase } from "../../application/use-cases/BatchStickersUseCase.js";
export class StickerController {
  constructor(private readonly gen: GenerateStickerUseCase, private readonly batch: BatchStickersUseCase) {}
  getSticker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user!;
      const { folio, pdf } = await this.gen.execute({ recordId: id, actorUserId: actor.userId, actorRole: actor.role });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="sticker-${folio}.pdf"`);
      res.send(pdf);
    } catch (e) { next(e); }
  };
  batchStickers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user!;
      const ids: string[] = req.body.ids;
      const { pdf } = await this.batch.execute({ ids, actorUserId: actor.userId, actorRole: actor.role });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="stickers-batch.pdf"`);
      res.send(pdf);
    } catch (e) { next(e); }
  };
}
