/**
 * Tests: ChangeCensusPeriodStatusUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: period not found, invalid transitions, active period conflict,
 * successful status changes.
 */

import { ChangeCensusPeriodStatusUseCase, ChangeCensusPeriodStatusInput } from "../ChangeCensusPeriodStatusUseCase.js";
import type { ICensusPeriodRepository } from "../../../domain/repositories/ICensusPeriodRepository.js";
import type { CensusPeriod, CensusPeriodStatus } from "../../../domain/entities/CensusPeriod.js";
import {
  CensusPeriodNotFoundError,
  InvalidStatusTransitionError,
  ActivePeriodAlreadyExistsError,
} from "../../../domain/errors/CensusPeriodErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeInactivePeriod(): CensusPeriod {
  return {
    id: "cp-1",
    name: "Censo 2025",
    description: null,
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-12-31"),
    status: "INACTIVO",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makePeriodRepo(overrides?: { activeCount?: number }): ICensusPeriodRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
    countActive: jest.fn().mockResolvedValue(overrides?.activeCount ?? 0),
    hasOverlap: jest.fn().mockResolvedValue(false),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("ChangeCensusPeriodStatusUseCase", () => {
  let periodRepo: ReturnType<typeof makePeriodRepo>;
  let useCase: ChangeCensusPeriodStatusUseCase;

  beforeEach(() => {
    periodRepo = makePeriodRepo();
    useCase = new ChangeCensusPeriodStatusUseCase(periodRepo);
  });

  // ── Period not found ──────────────────────────────────────────────

  it("should throw CensusPeriodNotFoundError when period does not exist", async () => {
    await expect(
      useCase.execute({ periodId: "cp-999", newStatus: "ACTIVO" })
    ).rejects.toThrow(CensusPeriodNotFoundError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Invalid transitions ───────────────────────────────────────────

  it("should throw InvalidStatusTransitionError for FINALIZADO -> any", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue({
      ...makeInactivePeriod(),
      status: "FINALIZADO" as const,
    });

    await expect(
      useCase.execute({ periodId: "cp-1", newStatus: "ACTIVO" })
    ).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("should throw InvalidStatusTransitionError for ACTIVO -> ACTIVO", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue({
      ...makeInactivePeriod(),
      status: "ACTIVO" as const,
    });

    await expect(
      useCase.execute({ periodId: "cp-1", newStatus: "ACTIVO" })
    ).rejects.toThrow(InvalidStatusTransitionError);
  });

  // ── Active period conflict ────────────────────────────────────────

  it("should throw ActivePeriodAlreadyExistsError when activating and another is active", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue(makeInactivePeriod());
    periodRepo = makePeriodRepo({ activeCount: 1 });
    useCase = new ChangeCensusPeriodStatusUseCase(periodRepo);
    (periodRepo.findById as jest.Mock).mockResolvedValue(makeInactivePeriod());

    await expect(
      useCase.execute({ periodId: "cp-1", newStatus: "ACTIVO" })
    ).rejects.toThrow(ActivePeriodAlreadyExistsError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful transitions ────────────────────────────────────────

  it("should activate INACTIVO period when no other is active", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue(makeInactivePeriod());

    await useCase.execute({ periodId: "cp-1", newStatus: "ACTIVO" });

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVO",
      })
    );
  });

  it("should deactivate ACTIVO period to INACTIVO", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue({
      ...makeInactivePeriod(),
      status: "ACTIVO" as const,
    });

    await useCase.execute({ periodId: "cp-1", newStatus: "INACTIVO" });

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "INACTIVO",
      })
    );
  });

  it("should finalize INACTIVO period", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue(makeInactivePeriod());

    await useCase.execute({ periodId: "cp-1", newStatus: "FINALIZADO" });

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FINALIZADO",
      })
    );
  });

  it("should finalize ACTIVO period", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue({
      ...makeInactivePeriod(),
      status: "ACTIVO" as const,
    });

    await useCase.execute({ periodId: "cp-1", newStatus: "FINALIZADO" });

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FINALIZADO",
      })
    );
  });

  // ── Does not check active count when not activating ───────────────

  it("should not check active count when deactivating", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue({
      ...makeInactivePeriod(),
      status: "ACTIVO" as const,
    });

    await useCase.execute({ periodId: "cp-1", newStatus: "INACTIVO" });

    expect(periodRepo.countActive).not.toHaveBeenCalled();
  });
});
