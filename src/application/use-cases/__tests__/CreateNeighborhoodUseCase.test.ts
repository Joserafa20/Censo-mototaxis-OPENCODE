/**
 * Tests: CreateNeighborhoodUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: name uniqueness, corregimiento validation, GPS coordinates,
 * audit logging, error cases.
 */

import { CreateNeighborhoodUseCase, CreateNeighborhoodInput } from "../CreateNeighborhoodUseCase.js";
import type { INeighborhoodRepository } from "../../../domain/repositories/INeighborhoodRepository.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { IGeographyAuditRepository } from "../../../domain/repositories/IGeographyAuditRepository.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";
import {
  DuplicateGeographyNameError,
  InactiveParentError,
  CorregimientoNotFoundError,
} from "../../../domain/errors/GeographyErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

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

function makeAuditRepo(): IGeographyAuditRepository {
  return {
    create: jest.fn().mockImplementation((entry) =>
      Promise.resolve({
        id: entry.id ?? "audit-1",
        ...entry,
        createdAt: new Date(),
      })
    ),
    findByEntity: jest.fn().mockResolvedValue([]),
    findByAction: jest.fn().mockResolvedValue([]),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("CreateNeighborhoodUseCase", () => {
  let neighborhoodRepo: ReturnType<typeof makeNeighborhoodRepo>;
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: CreateNeighborhoodUseCase;

  const activeCorregimiento = createCorregimiento({
    id: "corr-1",
    municipalityId: "muni-1",
    name: "Centro",
  });

  const baseInput: CreateNeighborhoodInput = {
    corregimientoId: "corr-1",
    name: "La Esperanza",
    actorUserId: "admin-1",
  };

  beforeEach(() => {
    neighborhoodRepo = makeNeighborhoodRepo();
    corregimientoRepo = makeCorregimientoRepo();
    auditRepo = makeAuditRepo();
    useCase = new CreateNeighborhoodUseCase(neighborhoodRepo, corregimientoRepo, auditRepo);

    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(activeCorregimiento);
  });

  // ── Corregimiento validation ─────────────────────────────────────

  it("should throw CorregimientoNotFoundError when corregimiento does not exist", async () => {
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CorregimientoNotFoundError);
    expect(neighborhoodRepo.save).not.toHaveBeenCalled();
  });

  it("should throw InactiveParentError when corregimiento is inactive", async () => {
    const inactiveCorregimiento = createCorregimiento({
      id: "corr-1",
      municipalityId: "muni-1",
      name: "Centro",
      isActive: false,
    });
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(inactiveCorregimiento);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InactiveParentError);
    expect(neighborhoodRepo.save).not.toHaveBeenCalled();
  });

  // ── Name uniqueness ──────────────────────────────────────────────

  it("should throw DuplicateGeographyNameError when name already exists in corregimiento", async () => {
    (neighborhoodRepo.findByNameAndCorregimiento as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "La Esperanza",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(DuplicateGeographyNameError);
    expect(neighborhoodRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful creation ──────────────────────────────────────────

  it("should create neighborhood with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("neighborhoodId");
    expect(neighborhoodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        corregimientoId: "corr-1",
        name: "La Esperanza",
        isActive: true,
      })
    );
  });

  it("should create neighborhood with GPS coordinates", async () => {
    const input: CreateNeighborhoodInput = {
      ...baseInput,
      latitude: 10.93415,
      longitude: -74.79265,
    };

    const result = await useCase.execute(input);

    expect(result).toHaveProperty("neighborhoodId");
    expect(neighborhoodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 10.93415,
        longitude: -74.79265,
      })
    );
  });

  it("should create neighborhood without GPS coordinates", async () => {
    const result = await useCase.execute(baseInput);

    expect(neighborhoodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: null,
        longitude: null,
      })
    );
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful creation", async () => {
    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "neighborhood.created",
        entityType: "neighborhood",
        entityId: expect.any(String),
        actorUserId: "admin-1",
      })
    );
  });

  // ── Name trimming ────────────────────────────────────────────────

  it("should trim whitespace from name", async () => {
    const input: CreateNeighborhoodInput = {
      ...baseInput,
      name: "  La Esperanza  ",
    };

    await useCase.execute(input);

    expect(neighborhoodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "La Esperanza",
      })
    );
  });
});
