import type { Request, Response, NextFunction } from "express";
import type { VerifyStickerUseCase } from "../../application/use-cases/VerifyStickerUseCase.js";
export class VerifyController {
  constructor(private readonly verify: VerifyStickerUseCase) {}
  verifyFolio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const folio = String(req.params.folio);
      const result = await this.verify.execute(folio);
      res.json(result);
    } catch (e) { next(e); }
  };
}
