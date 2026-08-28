import { randomUUID } from "crypto";
import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";
import type { IValidationRepository } from "../../domain/repositories/IValidationRepository.js";
import { ValidationFailedError, InvalidTransitionError, NotOwnerError, PeriodClosedError } from "../../domain/errors/ValidationErrors.js";

export class SubmitCensusRecordUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly censusPeriodRepo: ICensusPeriodRepository,
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly neighborhoodRepo: INeighborhoodRepository,
    private readonly validationRepo: IValidationRepository
  ) {}

  async execute(params: { recordId: string; actorUserId: string; actorRole: string }): Promise<{ id: string; status: string; previousStatus: string }> {
    const record = await this.censusRecordRepo.findById(params.recordId);
    if (!record) {
      const e: any = new Error(`Census record ${params.recordId} not found`);
      e.statusCode = 404; e.code = "RECORD_NOT_FOUND"; throw e;
    }
    if (record.createdByUserId !== params.actorUserId) {
      throw new NotOwnerError();
    }
    // Period closed check
    const period = await this.censusPeriodRepo.findById(record.periodId);
    if (!period) {
      throw new ValidationFailedError([{ field: "period_id", code: "PERIOD_NOT_ACTIVE" }]);
    }
    if (period.status === "CERRADO" || period.status === "FINALIZADO") {
      throw new PeriodClosedError();
    }
    // Must be PENDIENTE or EN_PROCESO or legacy active
    const current = record.status as string;
    const allowedFrom = ["PENDIENTE", "EN_PROCESO", "active", "pending", "in_progress"];
    if (!allowedFrom.includes(current)) {
      throw new InvalidTransitionError(`Cannot submit from status ${current}`);
    }

    // Validations automáticas
    const details: Array<{ field: string; code: string }> = [];

    // cédula formato colombiano 6-10 dígitos (spec strict) else 6-12 fallback
    const cedula = record.mototaxiCedula?.trim() ?? "";
    if (!/^\d{6,10}$/.test(cedula)) {
      details.push({ field: "mototaxi_cedula", code: "INVALID_CEDULA_FORMAT" });
    } else {
      // unicidad global (exclude self)
      const existing = await this.censusRecordRepo.findByCedula(cedula);
      if (existing && existing.id !== record.id) details.push({ field: "mototaxi_cedula", code: "CEDULA_ALREADY_EXISTS" });
    }

    // placa formato
    const plateRaw = record.motorcyclePlate?.trim().toUpperCase() ?? "";
    const plateNorm = plateRaw.replace("-", "");
    if (!/^[A-Z]{3}[0-9]{3}$/.test(plateNorm)) {
      details.push({ field: "motorcyclePlate", code: "INVALID_PLATE_FORMAT" });
    } else {
      // check uniqueness by normalized plate - check both raw and norm
      const existingPlate = await this.censusRecordRepo.findByPlate(plateRaw);
      const existingNorm = plateRaw !== plateNorm ? await this.censusRecordRepo.findByPlate(plateNorm) : null;
      const dup = (existingPlate && existingPlate.id !== record.id) || (existingNorm && existingNorm.id !== record.id);
      if (dup) details.push({ field: "motorcyclePlate", code: "PLATE_ALREADY_EXISTS" });
      // Also check by querying all? Keep simple
    }

    // período ACTIVO
    if (period.status !== "ACTIVO") {
      details.push({ field: "period_id", code: "PERIOD_NOT_ACTIVE" });
    }

    // geografía activa
    try {
      const corr = await this.corregimientoRepo.findById(record.corregimientoId);
      if (!corr || !(corr as any).isActive) details.push({ field: "corregimiento_id", code: "GEOGRAPHY_NOT_ACTIVE" });
      else if (record.neighborhoodId) {
        const nb = await this.neighborhoodRepo.findById(record.neighborhoodId);
        if (!nb || !(nb as any).isActive) details.push({ field: "neighborhood_id", code: "GEOGRAPHY_NOT_ACTIVE" });
      }
    } catch {
      details.push({ field: "corregimiento_id", code: "GEOGRAPHY_NOT_ACTIVE" });
    }

    if (details.length) throw new ValidationFailedError(details);

    const previousStatus = record.status;
    const nextStatus = "COMPLETADO";
    // Persist status
    await this.censusRecordRepo.updateStatus(record.id, nextStatus as any, { validatedBy: params.actorUserId, validatedAt: new Date() });

    // Audit
    await this.validationRepo.save({
      id: randomUUID(),
      censusRecordId: record.id,
      periodId: record.periodId,
      fromStatus: previousStatus as any,
      toStatus: nextStatus as any,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      reason: null,
      metadata: null,
      createdAt: new Date(),
    });

    return { id: record.id, status: nextStatus, previousStatus: previousStatus as string };
  }
}
