/**
 * Domain entity: Corregimiento
 *
 * Represents a corregimiento within a municipality.
 * A corregimiento contains multiple neighborhoods.
 *
 * Business rules:
 * - Name must be unique within the municipality.
 * - Can be deactivated (cascades to neighborhoods).
 * - Can be reactivated.
 */

export interface Corregimiento {
  id: string;
  municipalityId: string;
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
 * Factory to create a Corregimiento with safe defaults.
 */
export function createCorregimiento(
  overrides: Partial<Corregimiento> & Pick<Corregimiento, "id" | "municipalityId" | "name">
): Corregimiento {
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
