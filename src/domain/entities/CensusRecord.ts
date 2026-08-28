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

export type CensusRecordStatus = "active" | "inactive" | "suspended";
export type OperationType = "station" | "independent";

export interface CensusRecord {
  id: string;
  periodId: string;
  corregimientoId: string;
  neighborhoodId: string | null;
  stationId: string | null;
  operationType: OperationType;
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
  createdByUserId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    mototaxiPhone: null,
    mototaxiAddress: null,
    motorcycleYear: null,
    latitude: null,
    longitude: null,
    status: "active",
    inactiveReason: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
