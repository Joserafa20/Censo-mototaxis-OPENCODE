/**
 * Domain entity: CensusPeriod
 *
 * Represents a census period with lifecycle management.
 * States: INACTIVO -> ACTIVO -> FINALIZADO
 *
 * Business rules:
 * - Only one period can be ACTIVO at any time.
 * - Only INACTIVO periods can be edited.
 * - INACTIVO -> ACTIVO, INACTIVO -> FINALIZADO, ACTIVO -> FINALIZADO are valid transitions.
 * - ACTIVO -> INACTIVO (deactivate) is also allowed.
 */

export type CensusPeriodStatus = "INACTIVO" | "ACTIVO" | "FINALIZADO";

export interface CensusPeriod {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: CensusPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Allowed status transitions.
 * Maps current status to the set of valid next statuses.
 */
const VALID_TRANSITIONS: Record<CensusPeriodStatus, CensusPeriodStatus[]> = {
  INACTIVO: ["ACTIVO", "FINALIZADO"],
  ACTIVO: ["FINALIZADO", "INACTIVO"],
  FINALIZADO: [],
};

/**
 * Checks whether a transition from `currentStatus` to `nextStatus` is allowed.
 */
export function canTransition(
  currentStatus: CensusPeriodStatus,
  nextStatus: CensusPeriodStatus
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Factory to create a CensusPeriod with safe defaults.
 */
export function createCensusPeriod(
  overrides: Partial<CensusPeriod> &
    Pick<CensusPeriod, "id" | "name" | "startDate" | "endDate">
): CensusPeriod {
  return {
    description: null,
    status: "INACTIVO",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
