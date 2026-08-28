/**
 * Tests: AssignAgentUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: station validation, duplicate assignment, error cases.
 */

import { AssignAgentUseCase, AssignAgentInput } from "../AssignAgentUseCase.js";
import type { IStationRepository } from "../../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../../domain/repositories/IStationAgentRepository.js";
import { createStation } from "../../../domain/entities/Station.js";
import {
  StationNotFoundError,
  InactiveStationError,
  AgentAlreadyAssignedError,
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

describe("AssignAgentUseCase", () => {
  let stationRepo: ReturnType<typeof makeStationRepo>;
  let stationAgentRepo: ReturnType<typeof makeStationAgentRepo>;
  let useCase: AssignAgentUseCase;

  const activeStation = createStation({
    id: "st-1",
    name: "Estación Terminal",
    corregimientoId: "corr-1",
  });

  const baseInput: AssignAgentInput = {
    stationId: "st-1",
    censusRecordId: "census-1",
  };

  beforeEach(() => {
    stationRepo = makeStationRepo();
    stationAgentRepo = makeStationAgentRepo();
    useCase = new AssignAgentUseCase(stationRepo, stationAgentRepo);

    (stationRepo.findById as jest.Mock).mockResolvedValue(activeStation);
  });

  // ── Station validation ───────────────────────────────────────────

  it("should throw StationNotFoundError when station does not exist", async () => {
    (stationRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(StationNotFoundError);
    expect(stationAgentRepo.save).not.toHaveBeenCalled();
  });

  it("should throw InactiveStationError when station is inactive", async () => {
    const inactiveStation = createStation({
      id: "st-1",
      name: "Estación Terminal",
      corregimientoId: "corr-1",
      isActive: false,
    });
    (stationRepo.findById as jest.Mock).mockResolvedValue(inactiveStation);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InactiveStationError);
    expect(stationAgentRepo.save).not.toHaveBeenCalled();
  });

  // ── Duplicate assignment ─────────────────────────────────────────

  it("should throw AgentAlreadyAssignedError when agent already has an active assignment", async () => {
    (stationAgentRepo.findActiveByCensusRecordId as jest.Mock).mockResolvedValue({
      id: "existing-assignment",
      stationId: "st-2",
      censusRecordId: "census-1",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(AgentAlreadyAssignedError);
    expect(stationAgentRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful assignment ────────────────────────────────────────

  it("should create assignment with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("assignmentId");
    expect(stationAgentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        stationId: "st-1",
        censusRecordId: "census-1",
      })
    );
  });

  it("should create assignment with unassignedAt as null", async () => {
    await useCase.execute(baseInput);

    expect(stationAgentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        unassignedAt: null,
      })
    );
  });
});
