/**
 * Use case: UpdateCensusPeriodUseCase
 *
 * Updates an existing census period (only INACTIVO periods):
 * 1. Validates period exists
 * 2. Validates period is INACTIVO
 * 3. Validates name uniqueness (if changed)
 * 4. Validates date range
 * 5. Validates no overlap (if dates changed)
 * 6. Persists changes
 */

import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import {
  CensusPeriodNotFoundError,
  CannotEditFinalizedPeriodError,
  CensusPeriodNameAlreadyExistsError,
  OverlapCensusPeriodError,
} from "../../domain/errors/CensusPeriodErrors.js";

export interface UpdateCensusPeriodInput {
  periodId: string;
  name?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date;
}

export class UpdateCensusPeriodUseCase {
  constructor(
    private readonly periodRepo: ICensusPeriodRepository
  ) {}

  async execute(input: UpdateCensusPeriodInput): Promise<void> {
    // 1. Validate period exists
    const period = await this.periodRepo.findById(input.periodId);
    if (!period) {
      throw new CensusPeriodNotFoundError();
    }

    // 2. Validate period is INACTIVO (only INACTIVO periods can be edited)
    if (period.status !== "INACTIVO") {
      throw new CannotEditFinalizedPeriodError(
        period.status === "FINALIZADO"
          ? "Cannot edit a finalized census period"
          : `Cannot edit a census period with status "${period.status}". Deactivate it first.`
      );
    }

    // 3. Validate name uniqueness (if changed)
    if (input.name !== undefined && input.name !== period.name) {
      const existingByName = await this.periodRepo.findByName(input.name);
      if (existingByName) {
        throw new CensusPeriodNameAlreadyExistsError(input.name);
      }
    }

    // 4. Validate no overlap (if dates changed)
    const startDate = input.startDate ? new Date(input.startDate) : period.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : period.endDate;

    if (endDate < startDate) {
      throw new OverlapCensusPeriodError("End date must be after or equal to start date");
    }

    const datesChanged =
      input.startDate !== undefined || input.endDate !== undefined;

    if (datesChanged) {
      const hasOverlap = await this.periodRepo.hasOverlap(startDate, endDate, input.periodId);
      if (hasOverlap) {
        throw new OverlapCensusPeriodError();
      }
    }

    // 5. Apply changes and persist
    const updated = {
      ...period,
      name: input.name !== undefined ? input.name : period.name,
      description: input.description !== undefined ? input.description : period.description,
      startDate,
      endDate,
      updatedAt: new Date(),
    };

    await this.periodRepo.save(updated);
  }
}
