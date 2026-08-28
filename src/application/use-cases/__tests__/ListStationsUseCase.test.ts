/**
 * Tests: ListStationsUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: pagination, filtering, agent counts, empty results.
 */

import { ListStationsUseCase, ListStationsInput } from "../ListStationsUseCase.js";
import type { IStationRepository } from "../../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../../domain/repositories/IStationAgentRepository.js";
import { createStation } from "../../../domain/entities/Station.js";

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

describe("ListStationsUseCase", () => {
  let stationRepo: ReturnType<typeof makeStationRepo>;
  let stationAgentRepo: ReturnType<typeof makeStationAgentRepo>;
  let useCase: ListStationsUseCase;

  const stations = [
    createStation({ id: "st-1", name: "Estación Terminal", locationType: "rural", corregimientoId: "corr-1" }),
    createStation({ id: "st-2", name: "Estación Centro", locationType: "urban" }),
    createStation({ id: "st-3", name: "Estación Norte", locationType: "rural", corregimientoId: "corr-1" }),
  ];

  beforeEach(() => {
    stationRepo = makeStationRepo();
    stationAgentRepo = makeStationAgentRepo();
    useCase = new ListStationsUseCase(stationRepo, stationAgentRepo);

    (stationRepo.findAll as jest.Mock).mockResolvedValue(stations);
    (stationAgentRepo.countActiveByStationId as jest.Mock).mockResolvedValue(0);
  });

  // ── Pagination ───────────────────────────────────────────────────

  it("should return paginated results with defaults", async () => {
    const result = await useCase.execute();

    expect(result.stations).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it("should respect page and pageSize parameters", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.stations).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("should return second page correctly", async () => {
    const result = await useCase.execute({ page: 2, pageSize: 2 });

    expect(result.stations).toHaveLength(1);
    expect(result.stations[0].id).toBe("st-3");
  });

  // ── Filtering ────────────────────────────────────────────────────

  it("should pass filters to repository", async () => {
    await useCase.execute({
      filters: { isActive: true, searchTerm: "Terminal" },
    });

    expect(stationRepo.findAll).toHaveBeenCalledWith({
      isActive: true,
      searchTerm: "Terminal",
    });
  });

  it("should filter by locationType", async () => {
    await useCase.execute({
      filters: { locationType: "urban" },
    });

    expect(stationRepo.findAll).toHaveBeenCalledWith({
      locationType: "urban",
    });
  });

  // ── Agent counts ─────────────────────────────────────────────────

  it("should include agent count for each station", async () => {
    (stationAgentRepo.countActiveByStationId as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    const result = await useCase.execute();

    expect(result.stations[0].agentCount).toBe(5);
    expect(result.stations[1].agentCount).toBe(3);
    expect(result.stations[2].agentCount).toBe(7);
  });

  it("should count agents for each station", async () => {
    await useCase.execute();

    expect(stationAgentRepo.countActiveByStationId).toHaveBeenCalledWith("st-1");
    expect(stationAgentRepo.countActiveByStationId).toHaveBeenCalledWith("st-2");
    expect(stationAgentRepo.countActiveByStationId).toHaveBeenCalledWith("st-3");
  });

  // ── Empty results ────────────────────────────────────────────────

  it("should handle empty results", async () => {
    (stationRepo.findAll as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.stations).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
