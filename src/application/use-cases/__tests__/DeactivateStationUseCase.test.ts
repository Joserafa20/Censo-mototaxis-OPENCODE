/**
 * Tests: DeactivateStationUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: deactivation, agent release, error cases.
 */

import { DeactivateStationUseCase, DeactivateStationInput } from "../DeactivateStationUseCase.js";
import type { IStationRepository } from "../../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../../domain/repositories/IStationAgentRepository.js";
import { createStation } from "../../../domain/entities/Station.js";
import { StationNotFoundError } from "../../../domain/errors/StationErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeStationRepo(): IStationRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByNameAndLocation: jest.fn().mockResolvedValue(null),
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

describe("DeactivateStationUseCase", () => {
  let stationRepo: ReturnType<typeof makeStationRepo>;
  let stationAgentRepo: ReturnType<typeof makeStationAgentRepo>;
  let useCase: DeactivateStationUseCase;

  const activeStation = createStation({
    id: "st-1",
    name: "Estación Terminal",
    locationType: "rural",
    corregimientoId: "corr-1",
  });

  const baseInput: DeactivateStationInput = {
    stationId: "st-1",
  };

  beforeEach(() => {
    stationRepo = makeStationRepo();
    stationAgentRepo = makeStationAgentRepo();
    useCase = new DeactivateStationUseCase(stationRepo, stationAgentRepo);

    (stationRepo.findById as jest.Mock).mockResolvedValue(activeStation);
  });

  // ── Station validation ───────────────────────────────────────────

  it("should throw StationNotFoundError when station does not exist", async () => {
    (stationRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(StationNotFoundError);
    expect(stationRepo.deactivateById).not.toHaveBeenCalled();
  });

  // ── Already inactive ─────────────────────────────────────────────

  it("should do nothing when station is already inactive", async () => {
    const inactiveStation = createStation({
      id: "st-1",
      name: "Estación Terminal",
      locationType: "rural",
      corregimientoId: "corr-1",
      isActive: false,
    });
    (stationRepo.findById as jest.Mock).mockResolvedValue(inactiveStation);

    await useCase.execute(baseInput);

    expect(stationRepo.deactivateById).not.toHaveBeenCalled();
    expect(stationAgentRepo.unassignAllByStationId).not.toHaveBeenCalled();
  });

  // ── Agent release ────────────────────────────────────────────────

  it("should unassign all active agents from the station", async () => {
    await useCase.execute(baseInput);

    expect(stationAgentRepo.unassignAllByStationId).toHaveBeenCalledWith("st-1");
  });

  // ── Successful deactivation ──────────────────────────────────────

  it("should deactivate the station", async () => {
    await useCase.execute(baseInput);

    expect(stationRepo.deactivateById).toHaveBeenCalledWith("st-1");
  });

  it("should unassign agents before deactivating the station", async () => {
    const callOrder: string[] = [];
    (stationAgentRepo.unassignAllByStationId as jest.Mock).mockImplementation(() => {
      callOrder.push("unassign");
      return Promise.resolve();
    });
    (stationRepo.deactivateById as jest.Mock).mockImplementation(() => {
      callOrder.push("deactivate");
      return Promise.resolve();
    });

    await useCase.execute(baseInput);

    expect(callOrder).toEqual(["unassign", "deactivate"]);
  });
});
