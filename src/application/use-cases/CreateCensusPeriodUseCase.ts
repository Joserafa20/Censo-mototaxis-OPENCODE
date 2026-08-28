/**
 * Use case: CreateCensusPeriodUseCase
 *
 * Creates a new census period:
 * 1. Validates name uniqueness
 * 2. Validates date range (endDate >= startDate)
 * 3. Validates no overlap with existing non-finalized periods
 * 4. Persists the period
 */

import type { CensusPeriod } from "../../domain/entities/CensusPeriod.js";
import { createCensusPeriod } from "../../domain/entities/CensusPeriod.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import {
  CensusPeriodNameAlreadyExistsError,
  OverlapCensusPeriodError,
} from "../../domain/errors/CensusPeriodErrors.js";

export interface CreateCensusPeriodInput {
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
}

export interface CreateCensusPeriodOutput {
  periodId: string;
}

export class CreateCensusPeriodUseCase {
  constructor(
    private readonly periodRepo: ICensusPeriodRepository
  ) {}

  async execute(input: CreateCensusPeriodInput): Promise<CreateCensusPeriodOutput> {
    // 1. Validate name uniqueness
    const existingByName = await this.periodRepo.findByName(input.name);
    if (existingByName) {
      throw new CensusPeriodNameAlreadyExistsError(input.name);
    }

    // 2. Validate date range
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new OverlapCensusPeriodError("End date must be after or equal to start date");
    }

    // 3. Validate no overlap with existing non-finalized periods
    const hasOverlap = await this.periodRepo.hasOverlap(startDate, endDate);
    if (hasOverlap) {
      throw new OverlapCensusPeriodError();
    }

    // 4. Create and persist
    const periodId = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const period = createCensusPeriod({
      id: periodId,
      name: input.name,
      description: input.description ?? null,
      startDate,
      endDate,
    });

    await this.periodRepo.save(period);

    return { periodId };
  }
}
