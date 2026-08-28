/**
 * Domain entity: StationAgent
 *
 * Represents the assignment of a mototaxi agent (census record) to a station.
 * An agent can only be assigned to one active station at a time.
 *
 * Business rules:
 * - An agent cannot be assigned to more than one active station simultaneously.
 * - Unassigning sets unassignedAt timestamp.
 * - Deactivating a station releases all its agents.
 */

export interface StationAgent {
  id: string;
  stationId: string;
  censusRecordId: string;
  assignedAt: Date;
  unassignedAt: Date | null;
}

/**
 * Factory to create a StationAgent with safe defaults.
 */
export function createStationAgent(
  overrides: Partial<StationAgent> & Pick<StationAgent, "id" | "stationId" | "censusRecordId">
): StationAgent {
  return {
    assignedAt: new Date(),
    unassignedAt: null,
    ...overrides,
  };
}
