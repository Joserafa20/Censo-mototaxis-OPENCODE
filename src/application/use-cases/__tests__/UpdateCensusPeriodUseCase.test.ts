/**
 * Tests: UpdateCensusPeriodUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: period not found, non-INACTIVO status, name uniqueness,
 * date validation, overlap detection, successful update.
 */

import { UpdateCensusPeriodUseCase, UpdateCensusPeriodInput } from "../UpdateCensusPeriodUseCase.js";
import type { ICensusPeriodRepository } from "../../../domain/repositories/ICensusPeriodRepository.js";
import type { CensusPeriod } from "../../../domain/entities/CensusPeriod.js";
import {
  CensusPeriodNotFoundError,
  CannotEditFinalizedPeriodError,
  CensusPeriodNameAlreadyExistsError,
  OverlapCensusPeriodError,
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

function makePeriodRepo(existingPeriod: CensusPeriod | null = null): ICensusPeriodRepository {
  return {
    findById: jest.fn().mockResolvedValue(existingPeriod),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
    countActive: jest.fn().mockResolvedValue(0),
    hasOverlap: jest.fn().mockResolvedValue(false),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("UpdateCensusPeriodUseCase", () => {
  let periodRepo: ReturnType<typeof makePeriodRepo>;
  let useCase: UpdateCensusPeriodUseCase;

  const baseInput: UpdateCensusPeriodInput = {
    periodId: "cp-1",
    name: "Censo 2025 Updated",
  };

  beforeEach(() => {
    periodRepo = makePeriodRepo(makeInactivePeriod());
    useCase = new UpdateCensusPeriodUseCase(periodRepo);
  });

  // ── Period not found ──────────────────────────────────────────────

  it("should throw CensusPeriodNotFoundError when period does not exist", async () => {
    (periodRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CensusPeriodNotFoundError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Cannot edit non-INACTIVO periods ──────────────────────────────

  it("should throw CannotEditFinalizedPeriodError when period is ACTIVO", async () => {
    const activePeriod = { ...makeInactivePeriod(), status: "ACTIVO" as const };
    (periodRepo.findById as jest.Mock).mockResolvedValue(activePeriod);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CannotEditFinalizedPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  it("should throw CannotEditFinalizedPeriodError when period is FINALIZADO", async () => {
    const finalizedPeriod = { ...makeInactivePeriod(), status: "FINALIZADO" as const };
    (periodRepo.findById as jest.Mock).mockResolvedValue(finalizedPeriod);

    await expect(useCase.execute(baseInput)).rejects.toThrow(CannotEditFinalizedPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Name uniqueness ───────────────────────────────────────────────

  it("should throw CensusPeriodNameAlreadyExistsError when new name is taken", async () => {
    (periodRepo.findByName as jest.Mock).mockResolvedValue({
      id: "cp-other",
      name: "Censo 2025 Updated",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(CensusPeriodNameAlreadyExistsError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Date validation ───────────────────────────────────────────────

  it("should throw OverlapCensusPeriodError when endDate is before startDate", async () => {
    const input: UpdateCensusPeriodInput = {
      periodId: "cp-1",
      startDate: new Date("2025-12-31"),
      endDate: new Date("2025-06-01"),
    };

    await expect(useCase.execute(input)).rejects.toThrow(OverlapCensusPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Overlap detection ─────────────────────────────────────────────

  it("should throw OverlapCensusPeriodError when new dates overlap", async () => {
    (periodRepo.hasOverlap as jest.Mock).mockResolvedValue(true);

    const input: UpdateCensusPeriodInput = {
      periodId: "cp-1",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-11-30"),
    };

    await expect(useCase.execute(input)).rejects.toThrow(OverlapCensusPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful update ─────────────────────────────────────────────

  it("should update period fields and save", async () => {
    await useCase.execute(baseInput);

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Censo 2025 Updated",
      })
    );
  });

  it("should update description when provided", async () => {
    const input: UpdateCensusPeriodInput = {
      periodId: "cp-1",
      description: "Updated description",
    };

    await useCase.execute(input);

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Updated description",
      })
    );
  });

  // ── Same name is allowed ──────────────────────────────────────────

  it("should allow keeping the same name", async () => {
    const input: UpdateCensusPeriodInput = {
      periodId: "cp-1",
      name: "Censo 2025", // same as existing
    };

    await useCase.execute(input);

    expect(periodRepo.findByName).not.toHaveBeenCalled();
    expect(periodRepo.save).toHaveBeenCalled();
  });
});
