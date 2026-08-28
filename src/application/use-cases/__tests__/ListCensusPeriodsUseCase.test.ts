/**
 * Tests: ListCensusPeriodsUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: default pagination, filters, page size limits.
 */

import { ListCensusPeriodsUseCase, ListCensusPeriodsInput } from "../ListCensusPeriodsUseCase.js";
import type { ICensusPeriodRepository } from "../../../domain/repositories/ICensusPeriodRepository.js";
import type { CensusPeriod } from "../../../domain/entities/CensusPeriod.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeMockPeriods(count: number): CensusPeriod[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `cp-${i + 1}`,
    name: `Censo ${2020 + i}`,
    description: null,
    startDate: new Date(`${2020 + i}-01-01`),
    endDate: new Date(`${2020 + i}-12-31`),
    status: "INACTIVO" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function makePeriodRepo(): ICensusPeriodRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue(makeMockPeriods(2)),
    countAll: jest.fn().mockResolvedValue(2),
    countActive: jest.fn().mockResolvedValue(0),
    hasOverlap: jest.fn().mockResolvedValue(false),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("ListCensusPeriodsUseCase", () => {
  let periodRepo: ReturnType<typeof makePeriodRepo>;
  let useCase: ListCensusPeriodsUseCase;

  beforeEach(() => {
    periodRepo = makePeriodRepo();
    useCase = new ListCensusPeriodsUseCase(periodRepo);
  });

  // ── Default pagination ────────────────────────────────────────────

  it("should use default page and pageSize", async () => {
    const result = await useCase.execute({});

    expect(result).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      })
    );
    expect(result.periods).toHaveLength(2);
  });

  // ── Custom pagination ─────────────────────────────────────────────

  it("should respect custom page and pageSize", async () => {
    (periodRepo.countAll as jest.Mock).mockResolvedValue(50);

    const result = await useCase.execute({ page: 2, pageSize: 10 });

    expect(result).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
        total: 50,
        totalPages: 5,
      })
    );
  });

  // ── Page size limits ──────────────────────────────────────────────

  it("should cap pageSize at 100", async () => {
    const result = await useCase.execute({ pageSize: 200 });

    expect(result.pageSize).toBe(100);
  });

  it("should default to page 1 for invalid page", async () => {
    const result = await useCase.execute({ page: 0 });

    expect(result.page).toBe(1);
  });

  // ── Filters ───────────────────────────────────────────────────────

  it("should pass filters to repository", async () => {
    await useCase.execute({
      filters: { status: "ACTIVO", searchTerm: "test" },
    });

    expect(periodRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { status: "ACTIVO", searchTerm: "test" },
      })
    );
    expect(periodRepo.countAll).toHaveBeenCalledWith({
      status: "ACTIVO",
      searchTerm: "test",
    });
  });

  // ── Total pages calculation ───────────────────────────────────────

  it("should calculate totalPages correctly for zero results", async () => {
    (periodRepo.findAll as jest.Mock).mockResolvedValue([]);
    (periodRepo.countAll as jest.Mock).mockResolvedValue(0);

    const result = await useCase.execute({});

    expect(result.totalPages).toBe(0);
  });
});
