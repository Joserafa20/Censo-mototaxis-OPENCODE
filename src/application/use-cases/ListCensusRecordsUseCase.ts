import type { ICensusRecordRepository, CensusRecordListFilters } from "../../domain/repositories/ICensusRecordRepository.js";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";

export interface ListCensusRecordsInput {
  filters?: CensusRecordListFilters;
  page?: number;
  pageSize?: number;
  actorUserId: string;
  actorRole: string;
}

export interface ListCensusRecordsOutput {
  records: CensusRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListCensusRecordsUseCase {
  constructor(private readonly censusRecordRepo: ICensusRecordRepository) {}

  async execute(input: ListCensusRecordsInput): Promise<ListCensusRecordsOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 20;
    const offset = (page - 1) * pageSize;

    // Enforce scope: censista sees only own records, admin sees all
    const filters: CensusRecordListFilters = { ...(input.filters ?? {}) };
    if (input.actorRole !== "admin") {
      filters.createdByUserId = input.actorUserId;
    }

    const [records, total] = await Promise.all([
      this.censusRecordRepo.findAll({ filters, limit: pageSize, offset }),
      this.censusRecordRepo.countAll(filters),
    ]);

    return { records, total, page, pageSize };
  }
}
