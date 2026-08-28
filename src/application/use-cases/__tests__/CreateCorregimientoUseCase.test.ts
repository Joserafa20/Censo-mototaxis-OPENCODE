/**
 * Tests: CreateCorregimientoUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: name uniqueness, municipality validation, GPS coordinates,
 * audit logging, error cases.
 */

import { CreateCorregimientoUseCase, CreateCorregimientoInput } from "../CreateCorregimientoUseCase.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { IMunicipalityRepository } from "../../../domain/repositories/IMunicipalityRepository.js";
import type { IGeographyAuditRepository } from "../../../domain/repositories/IGeographyAuditRepository.js";
import { createMunicipality } from "../../../domain/entities/Municipality.js";
import {
  DuplicateGeographyNameError,
  InactiveParentError,
  MunicipalityNotFoundError,
} from "../../../domain/errors/GeographyErrors.js";

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

function makeMunicipalityRepo(): IMunicipalityRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findRoot: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
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

describe("CreateCorregimientoUseCase", () => {
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let municipalityRepo: ReturnType<typeof makeMunicipalityRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: CreateCorregimientoUseCase;

  const activeMunicipality = createMunicipality({
    id: "muni-1",
    name: "Sabanalarga",
    department: "Atlántico",
  });

  const baseInput: CreateCorregimientoInput = {
    municipalityId: "muni-1",
    name: "Centro",
    actorUserId: "admin-1",
  };

  beforeEach(() => {
    corregimientoRepo = makeCorregimientoRepo();
    municipalityRepo = makeMunicipalityRepo();
    auditRepo = makeAuditRepo();
    useCase = new CreateCorregimientoUseCase(corregimientoRepo, municipalityRepo, auditRepo);

    (municipalityRepo.findById as jest.Mock).mockResolvedValue(activeMunicipality);
  });

  // ── Municipality validation ──────────────────────────────────────

  it("should throw MunicipalityNotFoundError when municipality does not exist", async () => {
    (municipalityRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(MunicipalityNotFoundError);
    expect(corregimientoRepo.save).not.toHaveBeenCalled();
  });

  it("should throw InactiveParentError when municipality is inactive", async () => {
    const inactiveMunicipality = createMunicipality({
      id: "muni-1",
      name: "Sabanalarga",
      department: "Atlántico",
      isActive: false,
    });
    (municipalityRepo.findById as jest.Mock).mockResolvedValue(inactiveMunicipality);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InactiveParentError);
    expect(corregimientoRepo.save).not.toHaveBeenCalled();
  });

  // ── Name uniqueness ──────────────────────────────────────────────

  it("should throw DuplicateGeographyNameError when name already exists in municipality", async () => {
    (corregimientoRepo.findByNameAndMunicipality as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "Centro",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(DuplicateGeographyNameError);
    expect(corregimientoRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful creation ──────────────────────────────────────────

  it("should create corregimiento with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("corregimientoId");
    expect(corregimientoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        municipalityId: "muni-1",
        name: "Centro",
        isActive: true,
      })
    );
  });

  it("should create corregimiento with GPS coordinates", async () => {
    const input: CreateCorregimientoInput = {
      ...baseInput,
      latitude: 10.93415,
      longitude: -74.79265,
    };

    const result = await useCase.execute(input);

    expect(result).toHaveProperty("corregimientoId");
    expect(corregimientoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 10.93415,
        longitude: -74.79265,
      })
    );
  });

  it("should create corregimiento without GPS coordinates", async () => {
    const result = await useCase.execute(baseInput);

    expect(corregimientoRepo.save).toHaveBeenCalledWith(
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
        action: "corregimiento.created",
        entityType: "corregimiento",
        entityId: expect.any(String),
        actorUserId: "admin-1",
      })
    );
  });

  // ── Name trimming ────────────────────────────────────────────────

  it("should trim whitespace from name", async () => {
    const input: CreateCorregimientoInput = {
      ...baseInput,
      name: "  Centro  ",
    };

    await useCase.execute(input);

    expect(corregimientoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Centro",
      })
    );
  });
});
