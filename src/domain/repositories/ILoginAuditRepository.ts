/**
 * Repository port: ILoginAuditRepository
 *
 * Persistence interface for LoginAudit entities.
 * Append-only — creates audit entries, never modifies them.
 */

import type { LoginAudit } from "../entities/LoginAudit.js";

export interface ILoginAuditRepository {
  create(entry: Omit<LoginAudit, "id" | "createdAt"> & { id?: string }): Promise<LoginAudit>;
}
