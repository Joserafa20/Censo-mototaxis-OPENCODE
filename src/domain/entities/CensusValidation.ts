import type { CensusValidationStatus } from "../value-objects/CensusStatus.js";

export interface CensusValidation {
  id: string;
  censusRecordId: string;
  periodId: string;
  fromStatus: CensusValidationStatus;
  toStatus: CensusValidationStatus;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export function createCensusValidation(overrides: Partial<CensusValidation> & Pick<CensusValidation, "id" | "censusRecordId" | "periodId" | "fromStatus" | "toStatus" | "actorUserId" | "actorRole">): CensusValidation {
  return {
    reason: null,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}
