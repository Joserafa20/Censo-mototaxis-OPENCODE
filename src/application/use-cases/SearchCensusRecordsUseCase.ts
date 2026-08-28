import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";

export interface SearchCensusRecordsInput {
  searchTerm: string;
  actorUserId: string;
  actorRole: string;
}

export interface SearchCensusRecordsOutput {
  records: CensusRecord[];
}

export class SearchCensusRecordsUseCase {
  constructor(private readonly censusRecordRepo: ICensusRecordRepository) {}

  async execute(input: SearchCensusRecordsInput): Promise<SearchCensusRecordsOutput> {
    const term = input.searchTerm?.trim();
    if (!term) return { records: [] };

    const filters: any = { searchTerm: term };
    if (input.actorRole !== "admin") {
      filters.createdByUserId = input.actorUserId;
    }

    const records = await this.censusRecordRepo.findAll({ filters });
    return { records };
  }
}
