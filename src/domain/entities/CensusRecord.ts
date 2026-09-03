/**
 * Domain entity: CensusRecord
 *
 * Represents a census record that binds a mototaxi driver's personal data,
 * motorcycle data, and geographic location to a census period.
 *
 * Business rules:
 * - Cédula must be unique globally.
 * - Motorcycle plate must be unique globally.
 * - Must be linked to an active census period at creation time.
 * - Corregimiento and neighborhood must be active.
 * - If operation_type is "station", a station must be assigned.
 * - If operation_type is "independent", no station should be assigned.
 * - Records are never physically deleted (logical deactivation only).
 * - Inactive records cannot be reactivated (create a new one).
 * - GPS coordinates are optional but must be in valid range.
 */

export type CensusRecordStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "PENDIENTE"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "EN_REVISION"
  | "APROBADO"
  | "APROBADA"
  | "RECHAZADO";
export type OperationType = "station" | "independent";

export const VALID_STATUS_TRANSITIONS: Record<CensusRecordStatus, CensusRecordStatus[]> = {
  active: ["inactive", "suspended"],
  suspended: ["active", "inactive"],
  inactive: [],
  PENDIENTE: ["EN_PROCESO"],
  EN_PROCESO: ["COMPLETADO"],
  COMPLETADO: ["EN_REVISION"],
  EN_REVISION: ["APROBADO", "RECHAZADO"],
  APROBADO: [],
  APROBADA: [],
  RECHAZADO: ["EN_PROCESO"],
};

export type VehicleType = "MOTO_FAMILIAR" | "MOTOTAXI" | "MOTOCARRO";
export type OwnershipType = "PROPIA" | "PAGA_TARIFA";
export type OperationMode = "ESTACION" | "CIRCULANTE";
export type Horario = "DIURNO" | "NOCTURNO";

export interface CensusRecord {
  id: string;
  periodId: string;
  corregimientoId: string;
  neighborhoodId: string | null;
  stationId: string | null;
  operationType: OperationType;
  vehicleType: VehicleType;
  ownershipType: OwnershipType | null;
  operationMode: OperationMode | null;
  tarifaValor: number | null;
  documentosAlDia: boolean | null;
  horario: Horario | null;
  actividadMotocarro: string | null;
  mototaxiCedula: string;
  mototaxiFirstName: string;
  mototaxiLastName: string;
  mototaxiPhone: string | null;
  mototaxiAddress: string | null;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleColor: string;
  motorcycleYear: number | null;
  latitude: number | null;
  longitude: number | null;
  status: CensusRecordStatus;
  inactiveReason: string | null;
  validationReason: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  createdByUserId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  consentGiven: boolean;
  consentSignature: string;
  consentDate: Date | null;
  evidencePhotos: string[];
  stickerFolio: string | null;
}

/**
 * Factory to create a CensusRecord with safe defaults.
 */
export function createCensusRecord(
  overrides: Partial<CensusRecord> &
    Pick<
      CensusRecord,
      | "id"
      | "periodId"
      | "corregimientoId"
      | "operationType"
      | "mototaxiCedula"
      | "mototaxiFirstName"
      | "mototaxiLastName"
      | "motorcyclePlate"
      | "motorcycleBrand"
      | "motorcycleModel"
      | "motorcycleColor"
      | "createdByUserId"
    >
): CensusRecord {
  return {
    neighborhoodId: null,
    stationId: null,
    vehicleType: "MOTOTAXI" as VehicleType,
    ownershipType: null,
    operationMode: null,
    tarifaValor: null,
    documentosAlDia: null,
    horario: null,
    actividadMotocarro: null,
    mototaxiPhone: null,
    mototaxiAddress: null,
    motorcycleYear: null,
    latitude: null,
    longitude: null,
    status: "active",
    inactiveReason: null,
    validationReason: null,
    validatedBy: null,
    validatedAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    consentGiven: false,
    consentSignature: "",
    consentDate: null,
    evidencePhotos: [],
    stickerFolio: null,
    ...overrides,
  };
}
