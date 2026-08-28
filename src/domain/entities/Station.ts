/**
 * Domain entity: Station
 *
 * Represents a physical mototaxi station within a corregimiento.
 * Stations group multiple mototaxis operating from a fixed point.
 *
 * Business rules:
 * - Name must be unique within the corregimiento.
 * - Can be deactivated (logical delete, never physical).
 * - Deactivating releases assigned agents (they become independent).
 */

export interface Station {
  id: string;
  name: string;
  corregimientoId: string;
  neighborhoodId: string | null;
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
  overrides: Partial<Station> & Pick<Station, "id" | "name" | "corregimientoId">
): Station {
  return {
    neighborhoodId: null,
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
