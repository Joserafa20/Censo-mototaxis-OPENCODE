/**
 * Tests: GetGeographyTreeUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: tree structure, filtering inactive items, empty results.
 */

import { GetGeographyTreeUseCase, GetGeographyTreeInput } from "../GetGeographyTreeUseCase.js";
import type { IMunicipalityRepository } from "../../../domain/repositories/IMunicipalityRepository.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../../domain/repositories/INeighborhoodRepository.js";
import { createMunicipality } from "../../../domain/entities/Municipality.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";
import { createNeighborhood } from "../../../domain/entities/Neighborhood.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeMunicipalityRepo(): IMunicipalityRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findRoot: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

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

describe("GetGeographyTreeUseCase", () => {
  let municipalityRepo: ReturnType<typeof makeMunicipalityRepo>;
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let neighborhoodRepo: ReturnType<typeof makeNeighborhoodRepo>;
  let useCase: GetGeographyTreeUseCase;

  beforeEach(() => {
    municipalityRepo = makeMunicipalityRepo();
    corregimientoRepo = makeCorregimientoRepo();
    neighborhoodRepo = makeNeighborhoodRepo();
    useCase = new GetGeographyTreeUseCase(municipalityRepo, corregimientoRepo, neighborhoodRepo);
  });

  // ── Empty results ────────────────────────────────────────────────

  it("should return null municipality when no root municipality exists", async () => {
    (municipalityRepo.findRoot as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result.municipality).toBeNull();
  });

  // ── Full tree ────────────────────────────────────────────────────

  it("should return complete geographic hierarchy", async () => {
    const municipality = createMunicipality({
      id: "muni-1",
      name: "Sabanalarga",
      department: "Atlántico",
    });

    const corregimientos = [
      createCorregimiento({ id: "corr-1", municipalityId: "muni-1", name: "Centro" }),
      createCorregimiento({ id: "corr-2", municipalityId: "muni-1", name: "El Playón" }),
    ];

    const neighborhoods = [
      createNeighborhood({ id: "nbh-1", corregimientoId: "corr-1", name: "La Esperanza" }),
      createNeighborhood({ id: "nbh-2", corregimientoId: "corr-1", name: "San José" }),
      createNeighborhood({ id: "nbh-3", corregimientoId: "corr-2", name: "Las Palmas" }),
    ];

    (municipalityRepo.findRoot as jest.Mock).mockResolvedValue(municipality);
    (corregimientoRepo.findByMunicipality as jest.Mock).mockResolvedValue(corregimientos);
    (neighborhoodRepo.findAll as jest.Mock).mockResolvedValue(neighborhoods);

    const result = await useCase.execute();

    expect(result.municipality).not.toBeNull();
    expect(result.municipality!.id).toBe("muni-1");
    expect(result.municipality!.corregimientos).toHaveLength(2);

    // First corregimiento should have 2 neighborhoods
    expect(result.municipality!.corregimientos[0].neighborhoods).toHaveLength(2);
    expect(result.municipality!.corregimientos[0].neighborhoods[0].id).toBe("nbh-1");
    expect(result.municipality!.corregimientos[0].neighborhoods[1].id).toBe("nbh-2");

    // Second corregimiento should have 1 neighborhood
    expect(result.municipality!.corregimientos[1].neighborhoods).toHaveLength(1);
    expect(result.municipality!.corregimientos[1].neighborhoods[0].id).toBe("nbh-3");
  });

  // ── Filtering inactive items ─────────────────────────────────────

  it("should exclude inactive corregimientos by default", async () => {
    const municipality = createMunicipality({
      id: "muni-1",
      name: "Sabanalarga",
      department: "Atlántico",
    });

    const corregimientos = [
      createCorregimiento({ id: "corr-1", municipalityId: "muni-1", name: "Centro" }),
      createCorregimiento({
        id: "corr-2",
        municipalityId: "muni-1",
        name: "El Playón",
        isActive: false,
      }),
    ];

    (municipalityRepo.findRoot as jest.Mock).mockResolvedValue(municipality);
    (corregimientoRepo.findByMunicipality as jest.Mock).mockResolvedValue(corregimientos);
    (neighborhoodRepo.findAll as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.municipality!.corregimientos).toHaveLength(1);
    expect(result.municipality!.corregimientos[0].id).toBe("corr-1");
  });

  it("should include inactive corregimientos when includeInactive is true", async () => {
    const municipality = createMunicipality({
      id: "muni-1",
      name: "Sabanalarga",
      department: "Atlántico",
    });

    const corregimientos = [
      createCorregimiento({ id: "corr-1", municipalityId: "muni-1", name: "Centro" }),
      createCorregimiento({
        id: "corr-2",
        municipalityId: "muni-1",
        name: "El Playón",
        isActive: false,
      }),
    ];

    (municipalityRepo.findRoot as jest.Mock).mockResolvedValue(municipality);
    (corregimientoRepo.findByMunicipality as jest.Mock).mockResolvedValue(corregimientos);
    (neighborhoodRepo.findAll as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute({ includeInactive: true });

    expect(result.municipality!.corregimientos).toHaveLength(2);
  });

  it("should exclude inactive neighborhoods by default", async () => {
    const municipality = createMunicipality({
      id: "muni-1",
      name: "Sabanalarga",
      department: "Atlántico",
    });

    const corregimientos = [
      createCorregimiento({ id: "corr-1", municipalityId: "muni-1", name: "Centro" }),
    ];

    const neighborhoods = [
      createNeighborhood({ id: "nbh-1", corregimientoId: "corr-1", name: "La Esperanza" }),
      createNeighborhood({
        id: "nbh-2",
        corregimientoId: "corr-1",
        name: "San José",
        isActive: false,
      }),
    ];

    (municipalityRepo.findRoot as jest.Mock).mockResolvedValue(municipality);
    (corregimientoRepo.findByMunicipality as jest.Mock).mockResolvedValue(corregimientos);
    (neighborhoodRepo.findAll as jest.Mock).mockResolvedValue(neighborhoods);

    const result = await useCase.execute();

    expect(result.municipality!.corregimientos[0].neighborhoods).toHaveLength(1);
    expect(result.municipality!.corregimientos[0].neighborhoods[0].id).toBe("nbh-1");
  });
});
