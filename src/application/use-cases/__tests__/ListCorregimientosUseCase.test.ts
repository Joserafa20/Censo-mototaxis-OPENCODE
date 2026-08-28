/**
 * Tests: ListCorregimientosUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: pagination, filtering, neighborhood counts.
 */

import { ListCorregimientosUseCase, ListCorregimientosInput } from "../ListCorregimientosUseCase.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../../domain/repositories/INeighborhoodRepository.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeCorregimientoRepo(): ICorregimientoRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByNameAndMunicipality: jest.fn().mockResolvedValue(null),
    findByMunicipality: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    deactivateById: jest.fn().mockResolvedValue(undefined),
    reactivateById: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNeighborhoodRepo(): INeighborhoodRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByNameAndCorregimiento: jest.fn().mockResolvedValue(null),
    findByCorregimiento: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    deactivateByCorregimientoId: jest.fn().mockResolvedValue(undefined),
    reactivateById: jest.fn().mockResolvedValue(undefined),
    countByCorregimientoId: jest.fn().mockResolvedValue(0),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("ListCorregimientosUseCase", () => {
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let neighborhoodRepo: ReturnType<typeof makeNeighborhoodRepo>;
  let useCase: ListCorregimientosUseCase;

  const corregimientos = [
    createCorregimiento({ id: "corr-1", municipalityId: "muni-1", name: "Centro" }),
    createCorregimiento({ id: "corr-2", municipalityId: "muni-1", name: "El Playón" }),
    createCorregimiento({ id: "corr-3", municipalityId: "muni-1", name: "Santa Rita" }),
  ];

  beforeEach(() => {
    corregimientoRepo = makeCorregimientoRepo();
    neighborhoodRepo = makeNeighborhoodRepo();
    useCase = new ListCorregimientosUseCase(corregimientoRepo, neighborhoodRepo);

    (corregimientoRepo.findAll as jest.Mock).mockResolvedValue(corregimientos);
    (neighborhoodRepo.countByCorregimientoId as jest.Mock).mockResolvedValue(3);
  });

  // ── Pagination ───────────────────────────────────────────────────

  it("should return paginated results with defaults", async () => {
    const result = await useCase.execute();

    expect(result.corregimientos).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it("should respect page and pageSize parameters", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.corregimientos).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("should return second page correctly", async () => {
    const result = await useCase.execute({ page: 2, pageSize: 2 });

    expect(result.corregimientos).toHaveLength(1);
    expect(result.corregimientos[0].id).toBe("corr-3");
  });

  // ── Filtering ────────────────────────────────────────────────────

  it("should pass filters to repository", async () => {
    await useCase.execute({
      filters: { isActive: true, searchTerm: "Centro" },
    });

    expect(corregimientoRepo.findAll).toHaveBeenCalledWith({
      isActive: true,
      searchTerm: "Centro",
    });
  });

  // ── Neighborhood counts ──────────────────────────────────────────

  it("should include neighborhood count for each corregimiento", async () => {
    (neighborhoodRepo.countByCorregimientoId as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    const result = await useCase.execute();

    expect(result.corregimientos[0].neighborhoodCount).toBe(5);
    expect(result.corregimientos[1].neighborhoodCount).toBe(3);
    expect(result.corregimientos[2].neighborhoodCount).toBe(7);
  });

  it("should count neighborhoods for each corregimiento", async () => {
    await useCase.execute();

    expect(neighborhoodRepo.countByCorregimientoId).toHaveBeenCalledWith("corr-1");
    expect(neighborhoodRepo.countByCorregimientoId).toHaveBeenCalledWith("corr-2");
    expect(neighborhoodRepo.countByCorregimientoId).toHaveBeenCalledWith("corr-3");
  });

  // ── Empty results ────────────────────────────────────────────────

  it("should handle empty results", async () => {
    (corregimientoRepo.findAll as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.corregimientos).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
