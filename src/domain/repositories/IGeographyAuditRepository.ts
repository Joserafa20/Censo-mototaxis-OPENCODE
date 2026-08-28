/**
 * Repository port: IGeographyAuditRepository
 *
 * Persistence interface for GeographyAudit entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type {
  GeographyAuditEntry,
  GeographyAction,
  GeographyEntityType,
} from "../entities/GeographyAudit.js";

export interface IGeographyAuditRepository {
  create(entry: Omit<GeographyAuditEntry, "createdAt">): Promise<GeographyAuditEntry>;
  findByEntity(entityType: GeographyEntityType, entityId: string): Promise<GeographyAuditEntry[]>;
  findByAction(action: GeographyAction): Promise<GeographyAuditEntry[]>;
}
