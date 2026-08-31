import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusAuditRepository } from "../../domain/repositories/ICensusAuditRepository.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import { createCensusRecord } from "../../domain/entities/CensusRecord.js";
import { MototaxiCedula } from "../../domain/value-objects/MototaxiCedula.js";
import { MotorcyclePlate } from "../../domain/value-objects/MotorcyclePlate.js";
import { Coordinates } from "../../domain/value-objects/Coordinates.js";
import {
  DuplicateCedulaError,
  DuplicatePlateError,
  PeriodNotActiveError,
  InactiveCorregimientoError,
  InactiveNeighborhoodError,
  StationRequiredError,
  StationNotAllowedForIndependentError,
  InactiveStationError,
} from "../../domain/errors/CensusErrors.js";
import { InvalidCoordinatesError } from "../../domain/errors/GeographyErrors.js";
import { isValidConsent, getConsentErrorCode } from "../../domain/value-objects/Consent.js";
import { InvalidConsentError, InvalidSignatureError } from "../../domain/errors/CensusErrors.js";

export interface CreateCensusRecordInput {
  periodId: string;
  corregimientoId: string;
  neighborhoodId?: string | null;
  stationId?: string | null;
  operationType: "station" | "independent";
  mototaxiCedula: string;
  mototaxiFirstName: string;
  mototaxiLastName: string;
  mototaxiPhone?: string | null;
  mototaxiAddress?: string | null;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleColor: string;
  motorcycleYear?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  createdByUserId: string;
  consentGiven: boolean;
  consentSignature: string;
  consentDate?: unknown;
}

export interface CreateCensusRecordOutput {
  recordId: string;
}

export class CreateCensusRecordUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly censusPeriodRepo: ICensusPeriodRepository,
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly neighborhoodRepo: INeighborhoodRepository,
    private readonly stationRepo: IStationRepository,
    private readonly auditRepo: ICensusAuditRepository
  ) {}

  async execute(input: CreateCensusRecordInput): Promise<CreateCensusRecordOutput> {
    // Habeas flag
    const habeasEnabled = process.env.HABEAS_ENABLED !== "false";
    if (habeasEnabled) {
      const code = getConsentErrorCode(input.consentGiven, input.consentSignature);
      if (code) {
        if (code === "INVALID_CONSENT") throw new InvalidConsentError();
        const msgs: Record<string,string> = {
          INVALID_SIGNATURE: "La firma no puede estar vacía",
          INVALID_SIGNATURE_TOO_SHORT: "La firma es muy corta (mínimo 3)",
          INVALID_SIGNATURE_TOO_LONG: "La firma es muy larga (máximo 200)",
        };
        throw new InvalidSignatureError(code, msgs[code] ?? "Firma inválida");
      }
    }
    // Validate value objects
    const cedulaVO = MototaxiCedula.create(input.mototaxiCedula);
    const plateVO = MotorcyclePlate.create(input.motorcyclePlate);

    // Validate operation type coherence
    if (input.operationType === "station" && !input.stationId) {
      throw new StationRequiredError();
    }
    if (input.operationType === "independent" && input.stationId) {
      throw new StationNotAllowedForIndependentError();
    }
    if (input.operationType !== "station" && input.operationType !== "independent") {
      throw new Error("operationType must be 'station' or 'independent'");
    }

    // Validate GPS if provided
    let latitude: number | null = input.latitude ?? null;
    let longitude: number | null = input.longitude ?? null;
    if (latitude !== null || longitude !== null) {
      if (latitude === null || longitude === null) {
        throw new InvalidCoordinatesError("Both latitude and longitude must be provided together");
      }
      try {
        const coords = Coordinates.create(latitude, longitude);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (e) {
        if (e instanceof InvalidCoordinatesError) throw e;
        throw new InvalidCoordinatesError((e as Error).message);
      }
    }

    // Validate period active
    const period = await this.censusPeriodRepo.findById(input.periodId);
    if (!period) throw new PeriodNotActiveError("No hay período de censo activo");
    // Assume status ACTIVO is active; adapt to actual enum values
    if ((period.status as string) !== "ACTIVO" && (period.status as string) !== "active") {
      throw new PeriodNotActiveError();
    }

    // Validate uniqueness
    const existingCedula = await this.censusRecordRepo.findByCedula(cedulaVO.value);
    if (existingCedula) throw new DuplicateCedulaError(cedulaVO.value);

    const existingPlate = await this.censusRecordRepo.findByPlate(plateVO.value);
    if (existingPlate) throw new DuplicatePlateError(plateVO.value);

    // Validate corregimiento active
    const corregimiento = await this.corregimientoRepo.findById(input.corregimientoId);
    if (!corregimiento) throw new InactiveCorregimientoError("Corregimiento no encontrado");
    if (!corregimiento.isActive) throw new InactiveCorregimientoError();

    // Validate neighborhood if provided
    if (input.neighborhoodId) {
      const neighborhood = await this.neighborhoodRepo.findById(input.neighborhoodId);
      if (!neighborhood) throw new InactiveNeighborhoodError("Barrio no encontrado");
      if (!neighborhood.isActive) throw new InactiveNeighborhoodError();
    }

    // Validate station if applicable
    if (input.operationType === "station" && input.stationId) {
      const station = await this.stationRepo.findById(input.stationId);
      if (!station) throw new InactiveStationError("Estación no encontrada");
      if (!station.isActive) throw new InactiveStationError();
    }

    // Create domain entity
    const recordId = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = createCensusRecord({
      id: recordId,
      periodId: input.periodId,
      corregimientoId: input.corregimientoId,
      neighborhoodId: input.neighborhoodId ?? null,
      stationId: input.operationType === "station" ? (input.stationId ?? null) : null,
      operationType: input.operationType,
      mototaxiCedula: cedulaVO.value,
      mototaxiFirstName: input.mototaxiFirstName.trim(),
      mototaxiLastName: input.mototaxiLastName.trim(),
      mototaxiPhone: input.mototaxiPhone ?? null,
      mototaxiAddress: input.mototaxiAddress ?? null,
      motorcyclePlate: plateVO.value,
      motorcycleBrand: input.motorcycleBrand.trim(),
      motorcycleModel: input.motorcycleModel.trim(),
      motorcycleColor: input.motorcycleColor.trim(),
      motorcycleYear: input.motorcycleYear ?? null,
      latitude,
      longitude,
      createdByUserId: input.createdByUserId,
      consentGiven: habeasEnabled ? true : Boolean(input.consentGiven),
      consentSignature: habeasEnabled ? String(input.consentSignature).trim() : String(input.consentSignature ?? "").trim(),
      consentDate: habeasEnabled ? new Date() : null,
      evidencePhotos: [],
    });

    await this.censusRecordRepo.save(record);

    await this.auditRepo.log({
      entityType: "census_record",
      entityId: recordId,
      action: "created",
      actorUserId: input.createdByUserId,
      details: { cedula: cedulaVO.value, plate: plateVO.value },
    });

    return { recordId };
  }
}
