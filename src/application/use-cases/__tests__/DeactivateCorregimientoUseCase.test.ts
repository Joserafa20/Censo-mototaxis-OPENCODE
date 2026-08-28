/**
 * Tests: DeactivateCorregimientoUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: cascading deactivation, audit logging, error cases.
 */

import { DeactivateCorregimientoUseCase, DeactivateCorregimientoInput } from "../DeactivateCorregimientoUseCase.js";
import type { ICorregimientoRepository } from "../../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../../domain/repositories/INeighborhoodRepository.js";
import type { IGeographyAuditRepository } from "../../../domain/repositories/IGeographyAuditRepository.js";
import { createCorregimiento } from "../../../domain/entities/Corregimiento.js";
import { createNeighborhood } from "../../../domain/entities/Neighborhood.js";
import { CorregimientoNotFoundError } from "../../../domain/errors/GeographyErrors.js";

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

describe("DeactivateCorregimientoUseCase", () => {
  let corregimientoRepo: ReturnType<typeof makeCorregimientoRepo>;
  let neighborhoodRepo: ReturnType<typeof makeNeighborhoodRepo>;
  let auditRepo: ReturnType<typeof makeAuditRepo>;
  let useCase: DeactivateCorregimientoUseCase;

  const activeCorregimiento = createCorregimiento({
    id: "corr-1",
    municipalityId: "muni-1",
    name: "Centro",
  });

  const baseInput: DeactivateCorregimientoInput = {
    corregimientoId: "corr-1",
    actorUserId: "admin-1",
  };

  beforeEach(() => {
    corregimientoRepo = makeCorregimientoRepo();
    neighborhoodRepo = makeNeighborhoodRepo();
    auditRepo = makeAuditRepo();
    useCase = new DeactivateCorregimientoUseCase(corregimientoRepo, neighborhoodRepo, auditRepo);

    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(activeCorregimiento);
  });

  // ── Corregimiento validation ─────────────────────────────────────

  it("should throw CorregimientoNotFoundError when corregimiento does not exist", async () => {
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CorregimientoNotFoundError);
    expect(corregimientoRepo.deactivateById).not.toHaveBeenCalled();
  });

  // ── Already inactive ─────────────────────────────────────────────

  it("should do nothing when corregimiento is already inactive", async () => {
    const inactiveCorregimiento = createCorregimiento({
      id: "corr-1",
      municipalityId: "muni-1",
      name: "Centro",
      isActive: false,
    });
    (corregimientoRepo.findById as jest.Mock).mockResolvedValue(inactiveCorregimiento);

    await useCase.execute(baseInput);

    expect(corregimientoRepo.deactivateById).not.toHaveBeenCalled();
    expect(neighborhoodRepo.deactivateByCorregimientoId).not.toHaveBeenCalled();
    expect(auditRepo.create).not.toHaveBeenCalled();
  });

  // ── Cascading deactivation ───────────────────────────────────────

  it("should deactivate all active neighborhoods in the corregimiento", async () => {
    const activeNeighborhoods = [
      createNeighborhood({ id: "nbh-1", corregimientoId: "corr-1", name: "Barrio 1" }),
      createNeighborhood({ id: "nbh-2", corregimientoId: "corr-1", name: "Barrio 2" }),
    ];
    (neighborhoodRepo.findByCorregimiento as jest.Mock).mockResolvedValue(activeNeighborhoods);

    await useCase.execute(baseInput);

    expect(neighborhoodRepo.deactivateByCorregimientoId).toHaveBeenCalledWith(
      "corr-1",
      "admin-1"
    );
  });

  it("should not deactivate neighborhoods when there are no active ones", async () => {
    const inactiveNeighborhoods = [
      createNeighborhood({
        id: "nbh-1",
        corregimientoId: "corr-1",
        name: "Barrio 1",
        isActive: false,
      }),
    ];
    (neighborhoodRepo.findByCorregimiento as jest.Mock).mockResolvedValue(inactiveNeighborhoods);

    await useCase.execute(baseInput);

    expect(neighborhoodRepo.deactivateByCorregimientoId).not.toHaveBeenCalled();
  });

  // ── Successful deactivation ──────────────────────────────────────

  it("should deactivate the corregimiento", async () => {
    await useCase.execute(baseInput);

    expect(corregimientoRepo.deactivateById).toHaveBeenCalledWith("corr-1", "admin-1");
  });

  // ── Audit logging ────────────────────────────────────────────────

  it("should register audit entry for corregimiento deactivation", async () => {
    await useCase.execute(baseInput);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "corregimiento.deactivated",
        entityType: "corregimiento",
        entityId: "corr-1",
        actorUserId: "admin-1",
      })
    );
  });

  it("should register audit entries for each neighborhood deactivation", async () => {
    const activeNeighborhoods = [
      createNeighborhood({ id: "nbh-1", corregimientoId: "corr-1", name: "Barrio 1" }),
      createNeighborhood({ id: "nbh-2", corregimientoId: "corr-1", name: "Barrio 2" }),
    ];
    (neighborhoodRepo.findByCorregimiento as jest.Mock).mockResolvedValue(activeNeighborhoods);

    await useCase.execute(baseInput);

    // 2 neighborhood deactivations + 1 corregimiento deactivation
    expect(auditRepo.create).toHaveBeenCalledTimes(3);

    // Check neighborhood audit entries
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "neighborhood.deactivated",
        entityType: "neighborhood",
        entityId: "nbh-1",
      })
    );
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "neighborhood.deactivated",
        entityType: "neighborhood",
        entityId: "nbh-2",
      })
    );
  });
});
