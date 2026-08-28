/**
 * Tests: ReactivateNeighborhoodUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: parent validation, audit logging, error cases.
 */

import { ReactivateNeighborhoodUseCase, ReactivateNeighborhoodInput } from "../ReactivateNeighborhoodUseCase.js";
import type { INeighborhoodRepository } from "../../../domain/repositories/INeighborhoodRepository.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { IGeographyAuditRepository } from "../../../domain/repositories/IGeographyAuditRepository.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";
import { createNeighborhood } from "../../../domain/entities/Neighborhood.js";
import {
  NeighborhoodNotFoundError,
  CorregimientoNotFoundError,
  ReactivateRequiresActiveParentError,
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

describe("ReactivateNeighborhoodUseCase", () => {
  let neighborhoodRepo: ReturnType<typeof makeNeighborhoodRepo>;
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: ReactivateNeighborhoodUseCase;

  const inactiveNeighborhood = createNeighborhood({
    id: "nbh-1",
    corregimientoId: "corr-1",
    name: "La Esperanza",
    isActive: false,
  });

  const activeCorregimiento = createCorregimiento({
    id: "corr-1",
    municipalityId: "muni-1",
    name: "Centro",
  });

  const baseInput: ReactivateNeighborhoodInput = {
    neighborhoodId: "nbh-1",
    actorUserId: "admin-1",
  };

  beforeEach(() => {
    neighborhoodRepo = makeNeighborhoodRepo();
    corregimientoRepo = makeCorregimientoRepo();
    auditRepo = makeAuditRepo();
    useCase = new ReactivateNeighborhoodUseCase(neighborhoodRepo, corregimientoRepo, auditRepo);

    (neighborhoodRepo.findById as jest.Mock).mockResolvedValue(inactiveNeighborhood);
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(activeCorregimiento);
  });

  // ── Neighborhood validation ──────────────────────────────────────

  it("should throw NeighborhoodNotFoundError when neighborhood does not exist", async () => {
    (neighborhoodRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NeighborhoodNotFoundError);
    expect(neighborhoodRepo.reactivateById).not.toHaveBeenCalled();
  });

  // ── Already active ───────────────────────────────────────────────

  it("should do nothing when neighborhood is already active", async () => {
    const activeNeighborhood = createNeighborhood({
      id: "nbh-1",
      corregimientoId: "corr-1",
      name: "La Esperanza",
      isActive: true,
    });
    (neighborhoodRepo.findById as jest.Mock).mockResolvedValue(activeNeighborhood);

    await useCase.execute(baseInput);

    expect(neighborhoodRepo.reactivateById).not.toHaveBeenCalled();
    expect(auditRepo.create).not.toHaveBeenCalled();
  });

  // ── Parent validation ────────────────────────────────────────────

  it("should throw CorregimientoNotFoundError when parent corregimiento does not exist", async () => {
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CorregimientoNotFoundError);
    expect(neighborhoodRepo.reactivateById).not.toHaveBeenCalled();
  });

  it("should throw ReactivateRequiresActiveParentError when parent corregimiento is inactive", async () => {
    const inactiveCorregimiento = createCorregimiento({
      id: "corr-1",
      municipalityId: "muni-1",
      name: "Centro",
      isActive: false,
    });
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(inactiveCorregimiento);

    await expect(useCase.execute(baseInput)).rejects.toThrow(ReactivateRequiresActiveParentError);
    expect(neighborhoodRepo.reactivateById).not.toHaveBeenCalled();
  });

  // ── Successful reactivation ──────────────────────────────────────

  it("should reactivate the neighborhood", async () => {
    await useCase.execute(baseInput);

    expect(neighborhoodRepo.reactivateById).toHaveBeenCalledWith("nbh-1");
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry on successful reactivation", async () => {
    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "neighborhood.reactivated",
        entityType: "neighborhood",
        entityId: "nbh-1",
        actorUserId: "admin-1",
      })
    );
  });
});
