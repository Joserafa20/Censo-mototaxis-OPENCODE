import type { Request, Response, NextFunction } from "express";
import { GetReportSummaryUseCase } from "../../application/use-cases/GetReportSummaryUseCase.js";
import { ExportReportUseCase } from "../../application/use-cases/ExportReportUseCase.js";

export class ReportController {
  constructor(
    private getSummaryUseCase: GetReportSummaryUseCase,
    private exportUseCase: ExportReportUseCase,
  ) {}

  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user as { userId: string; role: string };
      const scope = { userId: user.userId, role: user.role as "admin" | "censista" };
      const input = {
        periodId: req.query.periodId as string | undefined,
        locationType: req.query.locationType as string | undefined,
        corregimientoId: req.query.corregimientoId as string | undefined,
        stationId: req.query.stationId as string | undefined,
        operationType: req.query.operationType as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        includeInactive: req.query.includeInactive as string | undefined,
      };
      const { summary, cacheHit } = await this.getSummaryUseCase.execute(input, scope);
      res.setHeader("X-Cache", cacheHit ? "HIT" : "MISS");
      res.setHeader("Cache-Control", "private, max-age=60");
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  };

  exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user as { userId: string; role: string };
      const scope = { userId: user.userId, role: user.role as "admin" | "censista" };
      const input = {
        format: (req.query.format as string) ?? "",
        periodId: req.query.periodId as string | undefined,
        locationType: req.query.locationType as string | undefined,
        corregimientoId: req.query.corregimientoId as string | undefined,
        stationId: req.query.stationId as string | undefined,
        operationType: req.query.operationType as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        includeInactive: req.query.includeInactive as string | undefined,
      };
      const result = await this.exportUseCase.execute(input, scope, user.userId);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Total-Count", String(result.total));
      if (Buffer.isBuffer(result.content)) {
        res.status(200).end(result.content);
      } else {
        res.status(200).send(result.content);
      }
    } catch (err) {
      next(err);
    }
  };
}
