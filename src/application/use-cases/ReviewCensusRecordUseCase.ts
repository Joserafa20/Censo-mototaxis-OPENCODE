import { randomUUID } from "crypto";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { IValidationRepository } from "../../domain/repositories/IValidationRepository.js";
import { InvalidTransitionError, PeriodClosedError } from "../../domain/errors/ValidationErrors.js";

export class ReviewCensusRecordUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly censusPeriodRepo: ICensusPeriodRepository,
    private readonly validationRepo: IValidationRepository
  ) {}
  async execute(params: { recordId: string; actorUserId: string; actorRole: string }): Promise<{ id: string; status: string; previousStatus: string }> {
    const record = await this.censusRecordRepo.findById(params.recordId);
    if (!record) { const e:any=new Error(`Record ${params.recordId} not found`); e.statusCode=404; e.code="RECORD_NOT_FOUND"; throw e; }
    if (params.actorRole !== "admin") { const e:any=new Error("Forbidden"); e.statusCode=403; e.code="FORBIDDEN"; throw e; }
    const period = await this.censusPeriodRepo.findById(record.periodId);
    if (period && (period.status === "CERRADO" || period.status === "FINALIZADO")) throw new PeriodClosedError();
    if (record.status !== "COMPLETADO") throw new InvalidTransitionError(`Cannot review from ${record.status}`);
    const prev = record.status;
    const next = "EN_REVISION";
    await this.censusRecordRepo.updateStatus(record.id, next as any, { validatedBy: params.actorUserId, validatedAt: new Date() });
    await this.validationRepo.save({
      id: randomUUID(), censusRecordId: record.id, periodId: record.periodId,
      fromStatus: prev as any, toStatus: next as any, actorUserId: params.actorUserId, actorRole: params.actorRole, reason: null, metadata: null, createdAt: new Date()
    });
    return { id: record.id, status: next, previousStatus: prev as string };
  }
}
