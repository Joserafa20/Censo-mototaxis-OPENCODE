/**
 * Tests: UnassignAgentUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: station validation, assignment validation, error cases.
 */

import { UnassignAgentUseCase, UnassignAgentInput } from "../UnassignAgentUseCase.js";
import type { IStationRepository } from "../../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../../domain/repositories/IStationAgentRepository.js";
import { createStation } from "../../../domain/entities/Station.js";
import {
  StationNotFoundError,
  AgentNotAssignedError,
} from "../../../domain/errors/StationErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeStationRepo(): IStationRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByNameAndCorregimiento: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    deactivateById: jest.fn().mockResolvedValue(undefined),
    countActiveByCorregimientoId: jest.fn().mockResolvedValue(0),
  };
}

function makeStationAgentRepo(): IStationAgentRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findActiveByCensusRecordId: jest.fn().mockResolvedValue(null),
    findActiveByStationId: jest.fn().mockResolvedValue([]),
    findAllByStationId: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    unassignById: jest.fn().mockResolvedValue(undefined),
    unassignAllByStationId: jest.fn().mockResolvedValue(undefined),
    countActiveByStationId: jest.fn().mockResolvedValue(0),
    hasActiveAssignment: jest.fn().mockResolvedValue(false),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("UnassignAgentUseCase", () => {
  let stationRepo: ReturnType<typeof makeStationRepo>;
  let stationAgentRepo: ReturnType<typeof makeStationAgentRepo>;
  let useCase: UnassignAgentUseCase;

  const activeStation = createStation({
    id: "st-1",
    name: "Estación Terminal",
    corregimientoId: "corr-1",
  });

  const baseInput: UnassignAgentInput = {
    stationId: "st-1",
    censusRecordId: "census-1",
  };

  beforeEach(() => {
    stationRepo = makeStationRepo();
    stationAgentRepo = makeStationAgentRepo();
    useCase = new UnassignAgentUseCase(stationRepo, stationAgentRepo);

    (stationRepo.findById as jest.Mock).mockResolvedValue(activeStation);
  });

  // ── Station validation ───────────────────────────────────────────

  it("should throw StationNotFoundError when station does not exist", async () => {
    (stationRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(StationNotFoundError);
    expect(stationAgentRepo.unassignById).not.toHaveBeenCalled();
  });

  // ── Assignment validation ────────────────────────────────────────

  it("should throw AgentNotAssignedError when agent has no active assignment", async () => {
    (stationAgentRepo.findActiveByCensusRecordId as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(AgentNotAssignedError);
    expect(stationAgentRepo.unassignById).not.toHaveBeenCalled();
  });

  it("should throw AgentNotAssignedError when agent is assigned to a different station", async () => {
    (stationAgentRepo.findActiveByCensusRecordId as jest.Mock).mockResolvedValue({
      id: "assignment-1",
      stationId: "st-2",
      censusRecordId: "census-1",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(AgentNotAssignedError);
    expect(stationAgentRepo.unassignById).not.toHaveBeenCalled();
  });

  // ── Successful unassignment ──────────────────────────────────────

  it("should unassign the agent from the station", async () => {
    (stationAgentRepo.findActiveByCensusRecordId as jest.Mock).mockResolvedValue({
      id: "assignment-1",
      stationId: "st-1",
      censusRecordId: "census-1",
    });

    await useCase.execute(baseInput);

    expect(stationAgentRepo.unassignById).toHaveBeenCalledWith("assignment-1");
  });
});
