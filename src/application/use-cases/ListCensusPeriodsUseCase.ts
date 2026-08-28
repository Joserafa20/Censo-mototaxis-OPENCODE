/**
 * Use case: ListCensusPeriodsUseCase
 *
 * Lists census periods with optional filters and pagination.
 */

import type { CensusPeriod, CensusPeriodStatus } from "../../domain/entities/CensusPeriod.js";
import type { ICensusPeriodRepository } from "../../domain/repositories/ICensusPeriodRepository.js";

export interface ListCensusPeriodsInput {
  filters?: {
    status?: CensusPeriodStatus;
    searchTerm?: string;
  };
  page?: number;
  pageSize?: number;
}

export interface ListCensusPeriodsOutput {
  periods: CensusPeriod[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ListCensusPeriodsUseCase {
  constructor(
    private readonly periodRepo: ICensusPeriodRepository
  ) {}

  async execute(input: ListCensusPeriodsInput): Promise<ListCensusPeriodsOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 20;
    const offset = (page - 1) * pageSize;

    const [periods, total] = await Promise.all([
      this.periodRepo.findAll({
        filters: input.filters,
        limit: pageSize,
        offset,
      }),
      this.periodRepo.countAll(input.filters),
    ]);

    return {
      periods,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
