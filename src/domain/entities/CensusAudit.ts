/**
 * Domain entity: CensusAudit
 *
 * Represents an audit trail entry for census record changes.
 */

export type CensusAuditAction = "created" | "updated" | "deactivated";

export interface CensusAuditEntry {
  id: string;
  entityType: "census_record";
  entityId: string;
  action: CensusAuditAction;
  actorUserId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Factory to create a CensusAuditEntry with safe defaults.
 */
export function createCensusAuditEntry(
  overrides: Partial<CensusAuditEntry> &
    Pick<CensusAuditEntry, "entityId" | "action" | "actorUserId">
): CensusAuditEntry {
  return {
    id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType: "census_record",
    details: null,
    createdAt: new Date(),
    ...overrides,
  };
}
