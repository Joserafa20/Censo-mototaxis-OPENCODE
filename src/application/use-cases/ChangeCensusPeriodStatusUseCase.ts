/**
 * Use case: ChangeCensusPeriodStatusUseCase
 *
 * Changes the status of a census period:
 * - INACTIVO -> ACTIVO (validates no other period is active)
 * - ACTIVO -> INACTIVO (deactivate)
 * - INACTIVO -> FINALIZADO
 * - ACTIVO -> FINALIZADO
 */

import type { CensusPeriodStatus } from "../../domain/entities/CensusPeriod.js";
import { canTransition } from "../../domain/entities/CensusPeriod.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";
import {
  CensusPeriodNotFoundError,
  InvalidStatusTransitionError,
  ActivePeriodAlreadyExistsError,
} from "../../domain/errors/CensusPeriodErrors.js";

export interface ChangeCensusPeriodStatusInput {
  periodId: string;
  newStatus: CensusPeriodStatus;
}

export class ChangeCensusPeriodStatusUseCase {
  constructor(
    private readonly periodRepo: ICensusPeriodRepository
  ) {}

  async execute(input: ChangeCensusPeriodStatusInput): Promise<void> {
    // 1. Validate period exists
    const period = await this.periodRepo.findById(input.periodId);
    if (!period) {
      throw new CensusPeriodNotFoundError();
    }

    // 2. Validate transition is allowed
    if (!canTransition(period.status, input.newStatus)) {
      throw new InvalidStatusTransitionError(period.status, input.newStatus);
    }

    // 3. If activating, validate no other active period exists
    if (input.newStatus === "ACTIVO") {
      const activeCount = await this.periodRepo.countActive();
      if (activeCount > 0) {
        throw new ActivePeriodAlreadyExistsError();
      }
    }

    // 4. Update status
    const updated = {
      ...period,
      status: input.newStatus,
      updatedAt: new Date(),
    };

    await this.periodRepo.save(updated);
  }
}
