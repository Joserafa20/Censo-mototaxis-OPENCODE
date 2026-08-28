# Tasks: 007 — Reportes y Estadisticas

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750-950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Domain → PR2 Infra → PR3 App TDD → PR4 Presentation+Integration |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Domain | PR1 | `npx jest src/domain --testPathPattern=report` | N/A | domain/reports/* |
| 2 | Infra/cache/export | PR2 | `npx jest src/infrastructure --testPathPattern=report` | SQLite DB | infra/reports/* + migration |
| 3 | Application TDD | PR3 | `npx jest src/application --testPathPattern=report` | N/A mocked | application/use-cases/* |
| 4 | Presentation+wire | PR4 | `npx jest --testPathPattern=report.integration` | Supertest | presentation/* + app.ts |

## Phase 1: Domain

- [x] 1.1 Create `src/domain/value-objects/ReportFilters.ts` — validate UUIDs, enums, ISO dates, dateFrom<=dateTo
- [x] 1.2 Create `src/domain/entities/ReportSummary.ts` — DTO SPEC6
- [x] 1.3 Create `src/domain/value-objects/AgeRange.ts` — `calculateAgeRange()` → 5 buckets
- [x] 1.4 Create `src/domain/services/Anonymizer.ts` — maskCedula/phone/name (RN-008)
- [x] 1.5 Create `src/domain/errors/ReportErrors.ts` — 7 errors → 400/403
- [x] 1.6 Create `src/domain/repositories/IReportRepository.ts` — getSummary/getFilteredRecords/countFiltered
- [x] 1.7 Create `src/domain/constants/Corregimientos.ts` — 7 rurales

## Phase 2: Infra

- [x] 2.1 Create `src/infrastructure/repositories/TypeormReportRepository.ts` — 8 GROUP BY, scoping, zero-fill 7
- [x] 2.2 Create `src/infrastructure/cache/InMemoryReportCache.ts` — Map TTL60s hash(filters+role+userId)
- [x] 2.3 Create `src/infrastructure/export/CsvExporter.ts` — streaming + Ley1581 row
- [x] 2.4 Create `src/infrastructure/export/ExcelExporter.ts` — exceljs Datos+Aviso 10k cap
- [x] 2.5 Create `src/infrastructure/database/migrations/*-AddReportIndices.ts` — 6 indices

## Phase 3: Application (TDD)

- [x] 3.1 RED: `GetReportSummaryUseCase` — 401, 400 UUID/enum/date, 403 includeInactive, INVALID_* codes
- [x] 3.2 GREEN: `src/application/use-cases/GetReportSummaryUseCase.ts` — validate FKs, scope, cache 60s
- [x] 3.3 RED: `ExportReportUseCase` — 400 INVALID_FORMAT, EXPORT_LIMIT_EXCEEDED, PII masked vs full
- [x] 3.4 GREEN: `src/application/use-cases/ExportReportUseCase.ts` — 10k guard, Anonymizer, Csv/ExcelExporter
- [x] 3.5 RED+GREEN: scoping + cache/rate-limit — censista own-only, X-Cache HIT/MISS, 10 req/min

## Phase 4: Presentation

- [x] 4.1 Create `src/presentation/controllers/ReportController.ts` — getSummary/exportReport + headers
- [x] 4.2 Create `src/presentation/routes/report.routes.ts` — GET /reports/summary + /export, auth+role
- [x] 4.3 Modify `src/app.ts` — mount /api/v1/reports, wire deps, add exceljs

## Phase 5: Integration

- [x] 5.1 `GET /summary` admin — totals, 7 zero-fill, sort desc (seed 20)
- [x] 5.2 Filters — period/corregimiento/locationType/station/dateRange/operationType + 400 invalid
- [x] 5.3 `GET /export` — csv/xlsx Content-Type, Disposition, Ley1581, masked vs full PII
- [x] 5.4 E2E — censista A(5) vs B(10) isolation + pagination

## Phase 6: Verification

- [x] 6.1 `npx jest --coverage` — >=85% reports, all Gherkin automated
- [x] 6.2 `npx eslint src/` + no new tables (RNF-006)
- [x] 6.3 Perf — summary p95 <300ms/10k, export 10k no OOM
- [x] 6.4 Check RURAL_CORREGIMIENTOS vs DB; logs omit PII
