/**
 * Domain entity: Municipality
 *
 * Represents the root level of the geographic hierarchy.
 * A municipality contains multiple corregimientos.
 *
 * In this census system, there is only one municipality: "Sabanalarga, Atlántico".
 * It is created by seed, not by API.
 */

export interface Municipality {
  id: string;
  name: string;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory to create a Municipality with safe defaults.
 */
export function createMunicipality(
  overrides: Partial<Municipality> & Pick<Municipality, "id" | "name" | "department">
): Municipality {
  return {
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
