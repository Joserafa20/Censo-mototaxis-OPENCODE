import type { Request, Response, NextFunction } from "express";
import { GetAuditTimelineUseCase } from "../../application/use-cases/GetAuditTimelineUseCase.js";

export class AuditController {
  constructor(private getTimeline: GetAuditTimelineUseCase) {}

  getTimelineHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, id } = req.params as { type: string; id: string };
      const timeline = await this.getTimeline.execute(type, id);
      res.status(200).json({ entityType: type, entityId: id, count: timeline.length, timeline });
    } catch (err) {
      next(err);
    }
  };
}
