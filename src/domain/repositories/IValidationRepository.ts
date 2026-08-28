import type { CensusValidation } from "../entities/CensusValidation.js";

export interface IValidationRepository {
  save(validation: CensusValidation): Promise<void>;
  findByRecordId(censusRecordId: string): Promise<CensusValidation[]>;
  findByPeriodId(periodId: string): Promise<CensusValidation[]>;
}
