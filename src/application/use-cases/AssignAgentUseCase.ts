/**
 * Use case: AssignAgentUseCase
 *
 * Assigns a mototaxi agent (census record) to a station:
 * 1. Validates station exists and is active
 * 2. Validates agent is not already assigned to another station
 * 3. Creates the assignment
 */

import { createStationAgent } from "../../domain/entities/StationAgent.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../domain/repositories/IStationAgentRepository.js";
import {
  StationNotFoundError,
  InactiveStationError,
  AgentAlreadyAssignedError,
} from "../../domain/errors/StationErrors.js";

export interface AssignAgentInput {
  stationId: string;
  censusRecordId: string;
}

export interface AssignAgentOutput {
  assignmentId: string;
}

export class AssignAgentUseCase {
  constructor(
    private readonly stationRepo: IStationRepository,
    private readonly stationAgentRepo: IStationAgentRepository
  ) {}

  async execute(input: AssignAgentInput): Promise<AssignAgentOutput> {
    // 1. Validate station exists
    const station = await this.stationRepo.findById(input.stationId);
    if (!station) {
      throw new StationNotFoundError(input.stationId);
    }

    // 2. Validate station is active
    if (!station.isActive) {
      throw new InactiveStationError(input.stationId);
    }

    // 3. Validate agent is not already assigned to another station
    const existingAssignment =
      await this.stationAgentRepo.findActiveByCensusRecordId(input.censusRecordId);
    if (existingAssignment) {
      throw new AgentAlreadyAssignedError(input.censusRecordId);
    }

    // 4. Create the assignment
    const assignmentId = `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const assignment = createStationAgent({
      id: assignmentId,
      stationId: input.stationId,
      censusRecordId: input.censusRecordId,
    });

    await this.stationAgentRepo.save(assignment);

    return { assignmentId };
  }
}
