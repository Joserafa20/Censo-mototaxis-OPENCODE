/**
 * Use case: DeactivateStationUseCase
 *
 * Deactivates a station and releases all assigned agents:
 * 1. Validates station exists
 * 2. Validates station is active
 * 3. Unassigns all active agents from the station
 * 4. Deactivates the station
 *
 * Agents become "independent" after deactivation (unassignedAt is set).
 */

import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../domain/repositories/IStationAgentRepository.js";
import { StationNotFoundError } from "../../domain/errors/StationErrors.js";

export interface DeactivateStationInput {
  stationId: string;
}

export class DeactivateStationUseCase {
  constructor(
    private readonly stationRepo: IStationRepository,
    private readonly stationAgentRepo: IStationAgentRepository
  ) {}

  async execute(input: DeactivateStationInput): Promise<void> {
    // 1. Validate station exists
    const station = await this.stationRepo.findById(input.stationId);
    if (!station) {
      throw new StationNotFoundError(input.stationId);
    }

    // 2. Validate station is active
    if (!station.isActive) {
      // Already inactive — no-op
      return;
    }

    // 3. Unassign all active agents (they become independent)
    await this.stationAgentRepo.unassignAllByStationId(input.stationId);

    // 4. Deactivate the station
    await this.stationRepo.deactivateById(input.stationId);
  }
}
