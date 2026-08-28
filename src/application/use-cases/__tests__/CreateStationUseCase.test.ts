/**
 * Tests: CreateStationUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: name uniqueness, location validation, corregimiento validation, GPS coordinates, error cases.
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
    findByNameAndLocation: jest.fn().mockResolvedValue(null),
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

  const ruralInput: CreateStationInput = {
    name: "Estación Terminal",
    locationType: "rural",
    corregimientoId: "corr-1",
  };

  const urbanInput: CreateStationInput = {
    name: "Estación Centro",
    locationType: "urban",
  };

  beforeEach(() => {
    stationRepo = makeStationRepo();
    corregimientoRepo = makeCorregimientoRepo();
    useCase = new CreateStationUseCase(stationRepo, corregimientoRepo);

    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(activeCorregimiento);
  });

  // ── Location type validation ──────────────────────────────────────

  it("should throw error when locationType is missing", async () => {
    const input = { name: "Test" } as CreateStationInput;

    await expect(useCase.execute(input)).rejects.toThrow("locationType is required");
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  it("should throw error when locationType is invalid", async () => {
    const input = { ...ruralInput, locationType: "invalid" as any };

    await expect(useCase.execute(input)).rejects.toThrow();
  });

  // ── Rural station validation ──────────────────────────────────────

  it("should throw error when rural station has no corregimientoId", async () => {
    const input: CreateStationInput = {
      name: "Test",
      locationType: "rural",
    };

    await expect(useCase.execute(input)).rejects.toThrow("corregimientoId is required for rural stations");
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  it("should throw CorregimientoNotFoundError when corregimiento does not exist", async () => {
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(ruralInput)).rejects.toThrow(CorregimientoNotFoundError);
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

    await expect(useCase.execute(ruralInput)).rejects.toThrow(InactiveParentError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  // ── Urban station validation ──────────────────────────────────────

  it("should throw error when urban station has corregimientoId", async () => {
    const input: CreateStationInput = {
      name: "Test",
      locationType: "urban",
      corregimientoId: "corr-1",
    };

    await expect(useCase.execute(input)).rejects.toThrow("corregimientoId must be null for urban stations");
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  // ── Name uniqueness ──────────────────────────────────────────────

  it("should throw DuplicateStationNameError when name already exists in rural location", async () => {
    (stationRepo.findByNameAndLocation as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "Estación Terminal",
    });

    await expect(useCase.execute(ruralInput)).rejects.toThrow(DuplicateStationNameError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  it("should throw DuplicateStationNameError when name already exists in urban location", async () => {
    (stationRepo.findByNameAndLocation as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "Estación Centro",
    });

    await expect(useCase.execute(urbanInput)).rejects.toThrow(DuplicateStationNameError);
    expect(stationRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful creation ──────────────────────────────────────────

  it("should create rural station with correct fields", async () => {
    const result = await useCase.execute(ruralInput);

    expect(result).toHaveProperty("stationId");
    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Estación Terminal",
        locationType: "rural",
        corregimientoId: "corr-1",
        neighborhoodId: null,
        isActive: true,
      })
    );
  });

  it("should create urban station with correct fields", async () => {
    const result = await useCase.execute(urbanInput);

    expect(result).toHaveProperty("stationId");
    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Estación Centro",
        locationType: "urban",
        corregimientoId: null,
        neighborhoodId: null,
        isActive: true,
      })
    );
  });

  it("should create station with GPS coordinates", async () => {
    const input: CreateStationInput = {
      ...ruralInput,
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
    await useCase.execute(ruralInput);

    expect(stationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: null,
        longitude: null,
      })
    );
  });

  it("should create station with neighborhoodId", async () => {
    const input: CreateStationInput = {
      ...ruralInput,
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
      ...ruralInput,
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
