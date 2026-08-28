/**
 * Use case: ListStationsUseCase
 *
 * Lists stations with optional filters and pagination.
 * Returns stations with their active agent count.
 */

import type { Station } from "../../domain/entities/Station.js";
import type {
  IStationRepository,
  StationListFilters,
} from "../../domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "../../domain/repositories/IStationAgentRepository.js";

export interface ListStationsInput {
  filters?: StationListFilters;
  page?: number;
  pageSize?: number;
}

export interface ListStationsOutput {
  stations: (Station & { agentCount: number })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ListStationsUseCase {
  constructor(
    private readonly stationRepo: IStationRepository,
    private readonly stationAgentRepo: IStationAgentRepository
  ) {}

  async execute(input: ListStationsInput = {}): Promise<ListStationsOutput> {
    const { filters, page = 1, pageSize = 20 } = input;

    // 1. Get all matching stations
    const allStations = await this.stationRepo.findAll(filters);

    // 2. Get agent counts for each station
    const stationsWithCounts = await Promise.all(
      allStations.map(async (station) => {
        const agentCount = await this.stationAgentRepo.countActiveByStationId(
          station.id
        );
        return { ...station, agentCount };
      })
    );

    // 3. Apply pagination
    const total = stationsWithCounts.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedStations = stationsWithCounts.slice(offset, offset + pageSize);

    return {
      stations: paginatedStations,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
