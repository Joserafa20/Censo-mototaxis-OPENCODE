/**
 * Repository port: ICensusAuditRepository
 *
 * Persistence interface for CensusAudit entries.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { CensusAuditAction } from "../entities/CensusAudit.js";

export interface ICensusAuditRepository {
  log(entry: {
    entityType: "census_record";
    entityId: string;
    action: CensusAuditAction;
    actorUserId: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}
