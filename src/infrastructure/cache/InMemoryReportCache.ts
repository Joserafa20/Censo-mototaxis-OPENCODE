import { createHash } from "crypto";
import type { ReportFilters } from "../../domain/value-objects/ReportFilters.js";
import type { UserScope } from "../../domain/repositories/IReportRepository.js";
import type { ReportSummary } from "../../domain/entities/ReportSummary.js";

export interface IReportCache {
  get(filters: ReportFilters, scope: UserScope): ReportSummary | undefined;
  set(filters: ReportFilters, scope: UserScope, value: ReportSummary): void;
}

export class InMemoryReportCache implements IReportCache {
  private store = new Map<string, { value: ReportSummary; expiresAt: number }>();
  constructor(private ttlMs: number = 60_000) {}

  private key(filters: ReportFilters, scope: UserScope): string {
    const raw = JSON.stringify({ filters, role: scope.role, userId: scope.role === "censista" ? scope.userId : "admin" });
    return createHash("sha256").update(raw).digest("hex");
  }

  get(filters: ReportFilters, scope: UserScope): ReportSummary | undefined {
    const k = this.key(filters, scope);
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(k);
      return undefined;
    }
    return entry.value;
  }

  set(filters: ReportFilters, scope: UserScope, value: ReportSummary): void {
    const k = this.key(filters, scope);
    this.store.set(k, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
