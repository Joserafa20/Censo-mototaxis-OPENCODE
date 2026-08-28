/**
 * Domain entity: Station
 *
 * Represents a physical mototaxi station.
 * Stations can be located in:
 * - Rural area: within a corregimiento (Cascajal, Colombia, etc.)
 * - Urban area: within the casco urbano of Sabanalarga
 *
 * Business rules:
 * - Name must be unique within the corregimiento (rural) or urban area.
 * - Can be deactivated (logical delete, never physical).
 * - Deactivating releases assigned agents (they become independent).
 */

export type StationLocationType = "urban" | "rural";

export interface Station {
  id: string;
  name: string;
  locationType: StationLocationType;
  corregimientoId: string | null;   // Required if rural, null if urban
  neighborhoodId: string | null;    // Optional barrio within corregimiento or urban area
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory to create a Station with safe defaults.
 */
export function createStation(
  overrides: Partial<Station> & Pick<Station, "id" | "name" | "locationType">
): Station {
  return {
    corregimientoId: null,
    neighborhoodId: null,
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
