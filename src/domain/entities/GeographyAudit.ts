/**
 * Domain entity: GeographyAudit
 *
 * Records administrative actions on geographic entities.
 * Tracks who performed what action and when.
 */

export type GeographyEntityType = "municipality" | "corregimiento" | "neighborhood";

export type GeographyAction =
  | "corregimiento.created"
  | "corregimiento.deactivated"
  | "neighborhood.created"
  | "neighborhood.deactivated"
  | "neighborhood.reactivated";

export interface GeographyAuditEntry {
  id: string;
  entityType: GeographyEntityType;
  entityId: string;
  actorUserId: string;
  action: GeographyAction;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * Factory to create a GeographyAuditEntry with safe defaults.
 */
export function createGeographyAuditEntry(
  overrides: Partial<GeographyAuditEntry> &
    Pick<GeographyAuditEntry, "id" | "entityType" | "entityId" | "actorUserId" | "action">
): GeographyAuditEntry {
  return {
    details: null,
    ipAddress: null,
    createdAt: new Date(),
    ...overrides,
  };
}
