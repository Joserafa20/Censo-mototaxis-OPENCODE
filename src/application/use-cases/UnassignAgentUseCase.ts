/**
 * Use case: UnassignAgentUseCase
 *
 * Unassigns a mototaxi agent from a station:
 * 1. Validates station exists
 * 2. Validates the agent is currently assigned to this station
 * 3. Sets unassignedAt timestamp
 */

import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../domain/repositories/IStationAgentRepository.js";
import {
  StationNotFoundError,
  AgentNotAssignedError,
} from "../../domain/errors/StationErrors.js";

export interface UnassignAgentInput {
  stationId: string;
  censusRecordId: string;
}

export class UnassignAgentUseCase {
  constructor(
    private readonly stationRepo: IStationRepository,
    private readonly stationAgentRepo: IStationAgentRepository
  ) {}

  async execute(input: UnassignAgentInput): Promise<void> {
    // 1. Validate station exists
    const station = await this.stationRepo.findById(input.stationId);
    if (!station) {
      throw new StationNotFoundError(input.stationId);
    }

    // 2. Validate the agent is currently assigned to this station
    const assignment =
      await this.stationAgentRepo.findActiveByCensusRecordId(input.censusRecordId);

    if (!assignment || assignment.stationId !== input.stationId) {
      throw new AgentNotAssignedError(input.censusRecordId, input.stationId);
    }

    // 3. Unassign the agent
    await this.stationAgentRepo.unassignById(assignment.id);
  }
}
