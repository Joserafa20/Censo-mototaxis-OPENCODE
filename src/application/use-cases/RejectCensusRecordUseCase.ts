import { randomUUID } from "crypto";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { IValidationRepository } from "../../domain/repositories/IValidationRepository.js";
import { RejectReason } from "../../domain/value-objects/RejectReason.js";
import { InvalidTransitionError, PeriodClosedError } from "../../domain/errors/ValidationErrors.js";

export class RejectCensusRecordUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly censusPeriodRepo: ICensusPeriodRepository,
    private readonly validationRepo: IValidationRepository
  ) {}
  async execute(params: { recordId: string; actorUserId: string; actorRole: string; reason: string }): Promise<{ id: string; status: string; previousStatus: string }> {
    if (params.actorRole !== "admin") { const e:any=new Error("Forbidden"); e.statusCode=403; e.code="FORBIDDEN"; throw e; }
    const rr = RejectReason.create(params.reason);
    const record = await this.censusRecordRepo.findById(params.recordId);
    if (!record) { const e:any=new Error(`Record ${params.recordId} not found`); e.statusCode=404; throw e; }
    const period = await this.censusPeriodRepo.findById(record.periodId);
    if (period && (period.status === "CERRADO" || period.status === "FINALIZADO")) throw new PeriodClosedError();
    if (record.status !== "EN_REVISION") throw new InvalidTransitionError(`Cannot reject from ${record.status}`);
    const prev = record.status;
    // First transition to RECHAZADO
    await this.censusRecordRepo.updateStatus(record.id, "RECHAZADO" as any, { validationReason: rr.value, validatedBy: params.actorUserId, validatedAt: new Date() });
    await this.validationRepo.save({
      id: randomUUID(), censusRecordId: record.id, periodId: record.periodId,
      fromStatus: prev as any, toStatus: "RECHAZADO" as any, actorUserId: params.actorUserId, actorRole: params.actorRole, reason: rr.value, metadata: null, createdAt: new Date()
    });
    // Auto transition RECHAZADO -> EN_PROCESO
    await this.censusRecordRepo.updateStatus(record.id, "EN_PROCESO" as any, { validationReason: rr.value, validatedBy: params.actorUserId, validatedAt: new Date() });
    await this.validationRepo.save({
      id: randomUUID(), censusRecordId: record.id, periodId: record.periodId,
      fromStatus: "RECHAZADO" as any, toStatus: "EN_PROCESO" as any, actorUserId: params.actorUserId, actorRole: params.actorRole, reason: rr.value, metadata: null, createdAt: new Date()
    });
    return { id: record.id, status: "EN_PROCESO", previousStatus: prev as string };
  }
}
