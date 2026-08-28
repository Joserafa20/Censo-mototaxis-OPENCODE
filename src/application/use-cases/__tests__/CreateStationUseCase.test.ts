/**
 * Tests: CreateStationUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: name uniqueness, corregimiento validation, GPS coordinates, error cases.
 */

import { CreateStationUseCase, CreateStationInput } from "../CreateStationUseCase.js";
import type { IStationRepository } from "../../../domain/repositories/IStationRepository.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";
import {
  DuplicateStationNameError,
} from "../../../domain/errors/StationErrors.js";
import {
  CorregimientoNotFoundError,
  InactiveParentError,
} from "../../../domain/errors/GeographyErrors.js";

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

// ── Test suite ──────────────────────────────────────────────────────

describe("CreateStationUseCase", () => {
  let stationRepo: ReturnType<typeof makeStationRepo>;
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let useCase: CreateStationUseCase;

  const activeCorregimiento = createCorregimiento({
    id: "corr-1",
    municipalityId: "muni-1",
    name: "Cascajal",
  });

  const baseInput: CreateStationInput = {
    name: "Estación Terminal",
    corregimientoId: "corr-1",
  };

  beforeEach(() => {
    stationRepo = makeStationRepo();
    corregimientoRepo = makeCorregimientoRepo();
    useCase = new CreateStationUseCase(stationRepo, corregimientoRepo);

    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(activeCorregimiento);
  });

  // ── Corregimiento validation ──────────────────────────────────────

  it("should throw CorregimientoNotFoundError when corregimiento does not exist", async () => {
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CorregimientoNotFoundError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  it("should throw InactiveParentError when corregimiento is inactive", async () => {
    const inactiveCorregimiento = createCorregimiento({
      id: "corr-1",
      municipalityId: "muni-1",
      name: "Cascajal",
      isActive: false,
    });
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(inactiveCorregimiento);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InactiveParentError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  // ── Name uniqueness ──────────────────────────────────────────────

  it("should throw DuplicateStationNameError when name already exists in corregimiento", async () => {
    (stationRepo.findByNameAndCorregimiento as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "Estación Terminal",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(DuplicateStationNameError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful creation ──────────────────────────────────────────

  it("should create station with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("stationId");
    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Estación Terminal",
        corregimientoId: "corr-1",
        isActive: true,
      })
    );
  });

  it("should create station with GPS coordinates", async () => {
    const input: CreateStationInput = {
      ...baseInput,
      latitude: 10.93415,
      longitude: -74.79265,
    };

    const result = await useCase.execute(input);

    expect(result).toHaveProperty("stationId");
    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 10.93415,
        longitude: -74.79265,
      })
    );
  });

  it("should create station without GPS coordinates", async () => {
    await useCase.execute(baseInput);

    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: null,
        longitude: null,
      })
    );
  });

  it("should create station with neighborhoodId", async () => {
    const input: CreateStationInput = {
      ...baseInput,
      neighborhoodId: "nbh-1",
    };

    await useCase.execute(input);

    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        neighborhoodId: "nbh-1",
      })
    );
  });

  // ── Name trimming ────────────────────────────────────────────────

  it("should trim whitespace from name", async () => {
    const input: CreateStationInput = {
      ...baseInput,
      name: "  Estación Terminal  ",
    };

    await useCase.execute(input);

    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Estación Terminal",
      })
    );
  });
});
