import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import { PeriodHasPendingRecordsError, PeriodAlreadyClosedError } from "../../domain/errors/ValidationErrors.js";

export class CloseCensusPeriodUseCase {
  constructor(
    private readonly censusPeriodRepo: ICensusPeriodRepository,
    private readonly censusRecordRepo: ICensusRecordRepository
  ) {}
  async execute(params: { periodId: string; adminId: string; adminRole: string }): Promise<{ id: string; status: string }> {
    if (params.adminRole !== "admin") { const e:any=new Error("Forbidden"); e.statusCode=403; e.code="FORBIDDEN"; throw e; }
    const period = await this.censusPeriodRepo.findById(params.periodId);
    if (!period) { const e:any=new Error(`Period ${params.periodId} not found`); e.statusCode=404; throw e; }
    if (period.status === "CERRADO" || period.status === "FINALIZADO") throw new PeriodAlreadyClosedError();
    const pending = await this.censusRecordRepo.countByStatus(params.periodId, ["PENDIENTE" as any]);
    const inProg = await this.censusRecordRepo.countByStatus(params.periodId, ["EN_PROCESO" as any, "active" as any, "pending" as any]);
    // Also need to consider legacy statuses that map to pending/in_progress
    // count PENDIENTE + EN_PROCESO + active + pending
    const totalPending = pending + inProg;
    // For spec we separate pending vs inProgress
    if (totalPending > 0) {
      // Need counts split
      const pendingCount = await this.censusRecordRepo.countByStatus(params.periodId, ["PENDIENTE" as any, "pending" as any, "suspended" as any]);
      const inProgressCount = await this.censusRecordRepo.countByStatus(params.periodId, ["EN_PROCESO" as any, "active" as any]);
      if (pendingCount + inProgressCount > 0) throw new PeriodHasPendingRecordsError(pendingCount, inProgressCount);
    }
    const closed = await this.censusPeriodRepo.close!(params.periodId, params.adminId);
    return { id: closed.id, status: closed.status };
  }
}
