/**
 * Domain entity: Neighborhood
 *
 * Represents a neighborhood within a corregimiento.
 *
 * Business rules:
 * - Name must be unique within the corregimiento.
 * - Can be deactivated individually.
 * - Can be reactivated (requires active parent corregimiento).
 */

export interface Neighborhood {
  id: string;
  corregimientoId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory to create a Neighborhood with safe defaults.
 */
export function createNeighborhood(
  overrides: Partial<Neighborhood> & Pick<Neighborhood, "id" | "corregimientoId" | "name">
): Neighborhood {
  return {
    latitude: null,
    longitude: null,
    isActive: true,
    deactivatedAt: null,
    deactivatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
