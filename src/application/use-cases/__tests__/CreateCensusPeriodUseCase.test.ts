/**
 * Tests: CreateCensusPeriodUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: name uniqueness, date validation, overlap detection,
 * successful creation.
 */

import { CreateCensusPeriodUseCase, CreateCensusPeriodInput } from "../CreateCensusPeriodUseCase.js";
import type { ICensusPeriodRepository } from "../../../domain/repositories/ICensusPeriodRepository.js";
import {
  CensusPeriodNameAlreadyExistsError,
  OverlapCensusPeriodError,
} from "../../../domain/errors/CensusPeriodErrors.js";

// ── Mock factories ──────────────────────────────────────────────────

function makePeriodRepo(): ICensusPeriodRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
    countActive: jest.fn().mockResolvedValue(0),
    hasOverlap: jest.fn().mockResolvedValue(false),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("CreateCensusPeriodUseCase", () => {
  let periodRepo: ReturnType<typeof makePeriodRepo>;
  let useCase: CreateCensusPeriodUseCase;

  const baseInput: CreateCensusPeriodInput = {
    name: "Censo 2025",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-12-31"),
  };

  beforeEach(() => {
    periodRepo = makePeriodRepo();
    useCase = new CreateCensusPeriodUseCase(periodRepo);
  });

  // ── Name uniqueness ───────────────────────────────────────────────

  it("should throw CensusPeriodNameAlreadyExistsError when name is already taken", async () => {
    (periodRepo.findByName as jest.Mock).mockResolvedValue({
      id: "existing",
      name: "Censo 2025",
      status: "INACTIVO",
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(CensusPeriodNameAlreadyExistsError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Overlap detection ─────────────────────────────────────────────

  it("should throw OverlapCensusPeriodError when dates overlap with existing period", async () => {
    (periodRepo.hasOverlap as jest.Mock).mockResolvedValue(true);

    await expect(useCase.execute(baseInput)).rejects.toThrow(OverlapCensusPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Date validation ───────────────────────────────────────────────

  it("should throw OverlapCensusPeriodError when endDate is before startDate", async () => {
    const input: CreateCensusPeriodInput = {
      name: "Invalid Period",
      startDate: new Date("2025-12-31"),
      endDate: new Date("2025-06-01"),
    };

    await expect(useCase.execute(input)).rejects.toThrow(OverlapCensusPeriodError);
    expect(periodRepo.save).not.toHaveBeenCalled();
  });

  // ── Successful creation ───────────────────────────────────────────

  it("should create period with correct fields", async () => {
    const result = await useCase.execute(baseInput);

    expect(result).toHaveProperty("periodId");
    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Censo 2025",
        description: null,
        status: "INACTIVO",
      })
    );
  });

  it("should create period with description when provided", async () => {
    const input: CreateCensusPeriodInput = {
      ...baseInput,
      description: "Censo de mototaxis del año 2025",
    };

    await useCase.execute(input);

    expect(periodRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Censo 2025",
        description: "Censo de mototaxis del año 2025",
      })
    );
  });

  // ── Overlap check called correctly ────────────────────────────────

  it("should check overlap with correct date range", async () => {
    await useCase.execute(baseInput);

    expect(periodRepo.hasOverlap).toHaveBeenCalledWith(
      new Date("2025-06-01"),
      new Date("2025-12-31")
    );
  });

  // ── No overlap allows creation ────────────────────────────────────

  it("should save when no overlap exists", async () => {
    (periodRepo.hasOverlap as jest.Mock).mockResolvedValue(false);

    await useCase.execute(baseInput);

    expect(periodRepo.save).toHaveBeenCalledTimes(1);
  });
});
