# Design: 007 — Reportes y Estadisticas

## Technical Approach

CQRS-read, no new tables (RNF-006). Shared filter/scoping pipeline. TypeORM QueryBuilder `COUNT`+`GROUP BY` with role scoping injected before `WHERE`. `ReportFilters` VO validates, `ReportSummary` DTO aggregates. `IReportRepository` isolates OLAP. In-memory TTL 60s + `express-rate-limit` satisfy RNF-003/004.

## Architecture Decisions

### Decision: `IReportRepository` dedicated read port

| Option | Tradeoff | Decision |
|---|---|---|
| Extend `ICensusRecordRepository` | Reuses port but mixes OLTP+OLAP, violates ISP | Rejected |
| New `IReportRepository` read port | Clean boundary, aggregates in one place | **Chosen** |

**Rationale**: Needs `GROUP BY`+joins+age buckets — distinct from `findAll/countAll`.

### Decision: QueryBuilder vs raw SQL / view

| Option | Tradeoff | Decision |
|---|---|---|
| Raw SQL / view | Fastest, DB-specific | Deferred (>50k) |
| TypeORM QueryBuilder | Portable, composable, sqlite-testable | **Chosen** |

**Rationale**: Matches `applyFilters` pattern; uses existing indices (RNF-005).

### Decision: Cache

| Option | Tradeoff | Decision |
|---|---|---|
| Redis | Distributed, adds ops | Rejected now |
| In-memory Map TTL 60s via `ICacheProvider` | Zero deps, key `hash(filters+role+userId)` | **Chosen** |

**Rationale**: RN-011 60s TTL; interface allows Redis swap.

### Decision: Export streaming & anonymization

| Option | Tradeoff | Decision |
|---|---|---|
| Anonymize in controller | Leaks domain rule | Rejected |
| `Anonymizer` in `ExportReportUseCase` | Testable, Ley 1581 | **Chosen** |
| Streaming CSV + buffered XLSX (`exceljs`, 10k cap) | Avoids OOM (RNF-002) | **Chosen** |

## Data Flow

```
GET /api/v1/reports/summary?periodId=&locationType=&...&dateFrom=&dateTo=
 -> authMiddleware(401) -> roleMiddleware(admin|censista)
 -> ReportController parses -> ReportFilters.validate()
 -> GetReportSummaryUseCase: validate FKs(400) -> apply scoping(censista: created_by_user_id=:id)
    -> IReportRepository.getSummary() // 8 parallel COUNT/GROUP BY
    -> zero-fill 7 corregimientos(RN-002), [] if gender/birthdate absent
    -> cache 60s
 <- 200 ReportSummary + X-Cache:HIT|MISS + Cache-Control:private,max-age=60

GET /api/v1/reports/export?format=csv|xlsx&...
 -> same validate+scope -> countFiltered() -> >10k => 400 EXPORT_LIMIT_EXCEEDED
 -> getFilteredRecords() -> Anonymizer(admin?full:masked) -> CsvExporter/ExcelExporter + Ley 1581 notice(RN-009)
 <- 200 Content-Type + Content-Disposition:attachment;filename="censo-mototaxis-YYYY-MM-DD.{csv|xlsx}" + X-Total-Count
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/value-objects/ReportFilters.ts` | Create | VO + validate() |
| `src/domain/entities/ReportSummary.ts` | Create | DTO with spec section 6 shape |
| `src/domain/services/Anonymizer.ts` | Create | `maskCedula/phone/name` (RN-008) |
| `src/domain/errors/ReportErrors.ts` | Create | 400-mapped report errors |
| `src/domain/repositories/IReportRepository.ts` | Create | Read port |
| `src/application/use-cases/GetReportSummaryUseCase.ts` | Create | Validate, scope, aggregate + cache |
| `src/application/use-cases/ExportReportUseCase.ts` | Create | Validate, 10k guard, anonymize, export |
| `src/infrastructure/repositories/TypeormReportRepository.ts` | Create | QueryBuilder aggregations |
| `src/infrastructure/export/CsvExporter.ts` | Create | Streaming CSV + Ley 1581 row |
| `src/infrastructure/export/ExcelExporter.ts` | Create | `exceljs` Datos+Aviso |
| `src/infrastructure/cache/InMemoryReportCache.ts` | Create | Map TTL 60s |
| `src/presentation/controllers/ReportController.ts` | Create | `getSummary`, `exportReport` |
| `src/presentation/routes/report.routes.ts` | Create | `GET /reports/summary` + `GET /reports/export` |
| `src/infrastructure/database/migrations/*-AddReportIndices.ts` | Create | Idempotent indices |
| `src/app.ts` | Modify | Wire and mount `/api/v1/reports` |

## Interfaces / Contracts

```typescript
export interface ReportFilters {
  periodId?: string; locationType?: "urban"|"rural";
  corregimientoId?: string; stationId?: string;
  operationType?: "station"|"independent";
  dateFrom?: string; dateTo?: string;
  includeInactive?: boolean; page?: number; limit?: number;
}
export interface UserScope { userId: string; role: "admin"|"censista" }
export interface ReportSummary {
  totalGlobal: number; totalByPeriod: { periodId:string; periodName:string; total:number }[];
  byLocationType: { urban:number; rural:number };
  byCorregimiento: { corregimientoId:string; name:string; locationType:string; total:number }[];
  byOperationType: { station:number; independent:number };
  byStation: { stationId:string; name:string; total:number }[];
  byMotoType: { brand:string; total:number }[];
  byGenero: { genero:string; total:number }[];
  byRangoEdad: { rango:string; total:number }[];
  evolucionPorPeriodo: { periodId:string; periodName:string; total:number }[];
  filtersApplied: ReportFilters; generatedAt: string;
}
export interface IReportRepository {
  getSummary(f: ReportFilters, s: UserScope): Promise<ReportSummary>;
  getFilteredRecords(f: ReportFilters, s: UserScope, p?: {page:number;limit:number}): Promise<CensusRecord[]>;
  countFiltered(f: ReportFilters, s: UserScope): Promise<number>;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `ReportFilters.validate`, `maskCedula/phone/name`, `AgeRange` | Jest table-driven |
| Unit | Use cases: scoping, 400 mappings, 10k guard, anonymization | Mock repos |
| Integration | `summary` all filters, censista scoping, `is_active` default, 7-correg zero-fill, `X-Cache` | sqlite test-data-source seed 20 |
| Integration | `export` csv headers+Ley1581, xlsx sheets, PII masked vs full, headers, limit | Supertest + parse |
| E2E | Admin 50 agg+export, censista own-only | Supertest `createApp()` |

Coverage >=85% in `src/**/report*/**`.

## Threat Matrix

| Boundary | Applicable | Reason | RED test |
|----------|------------|--------|----------|
| Routing | Applicable | New GET /reports routes, auth + query validation | 401, 400 UUID/enum/date, 403 |
| Shell/Subprocess/VCS/Exec/Process | N/A | No shell/process/VCS integration | — |

## Migration / Rollout

No migration required (no new tables). Idempotent index migration. New dep `exceljs`. Additive feature; rollback = unmount route.

## Open Questions

- [ ] `mototaxi_gender`/`mototaxi_birthdate` actual column names — graceful `[]` if absent?
- [ ] `locationType` canonical join: `census_records->corregimientos`?
- [ ] Cluster rate-limit needs Redis store — accept per-instance for MVP?
