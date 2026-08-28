/**
 * Repository port: IStationAgentRepository
 *
 * Persistence interface for StationAgent entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { StationAgent } from "../entities/StationAgent.js";

export interface IStationAgentRepository {
  findById(id: string): Promise<StationAgent | null>;
  findActiveByCensusRecordId(censusRecordId: string): Promise<StationAgent | null>;
  findActiveByStationId(stationId: string): Promise<StationAgent[]>;
  findAllByStationId(stationId: string): Promise<StationAgent[]>;
  save(agent: StationAgent): Promise<void>;
  unassignById(id: string): Promise<void>;
  unassignAllByStationId(stationId: string): Promise<void>;
  countActiveByStationId(stationId: string): Promise<number>;
  hasActiveAssignment(censusRecordId: string): Promise<boolean>;
}
