# Tasks: 006 — Datos del Mototaxista

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Domain) → PR 2 (Infrastructure) → PR 3 (Application + Presentation) → PR 4 (Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Domain layer (entities, value objects, errors, ports) | PR 1 | `npx jest src/domain/` | N/A — pure types + functions, no runtime harness needed | domain/ files only, no other modules affected |
| 2 | Infrastructure layer (TypeORM entities, repository adapters) | PR 2 | `npx jest src/infrastructure/` | SQLite test DB | infrastructure/ files + data-source.ts entity registration |
| 3 | Application + Presentation (use cases, controller, routes) | PR 3 | `npx jest src/application/ && npx jest src/presentation/` | N/A — unit tests with mocks | application/ + presentation/ files only |
| 4 | Integration wiring + E2E tests | PR 4 | `npx jest --testPathPattern=integration` | Supertest against Express app | app.ts route wiring + integration test files |

---

## Phase 1: Domain (entidades, value objects, errores, puertos)

- [ ] 1.1 Create `src/domain/value-objects/MototaxiCedula.ts` — value object with format validation (digits only, 5–20 chars)
- [ ] 1.2 Create `src/domain/value-objects/MotorcyclePlate.ts` — value object with format validation (ABC123 or AB123C pattern)
- [ ] 1.3 Create `src/domain/value-objects/OperationType.ts` — type alias `"station" | "independent"` with helper `isValidOperationType()`
- [ ] 1.4 Create `src/domain/errors/CensusErrors.ts` — error classes: `DuplicateCedulaError`, `DuplicatePlateError`, `InactivePeriodError`, `InactiveGeographyError`, `StationRequiredError`, `StationNotAllowedError`, `InvalidCoordinatesError`
- [ ] 1.5 Create `src/domain/entities/CensusRecord.ts` — interface + `createCensusRecord()` factory + `CensusRecordStatus` type + `VALID_STATUS_TRANSITIONS` map
- [ ] 1.6 Create `src/domain/repositories/ICensusRecordRepository.ts` — port with `findById`, `findByCedula`, `findByPlate`, `findAll`, `save`, `deactivateById`, `countActiveByStationId`, `countActiveByPeriodId`
- [ ] 1.7 Create `src/domain/repositories/ICensusAuditRepository.ts` — port with `log(entityId, action, actorUserId, details)`
- [ ] 1.8 Update barrel exports: `src/domain/entities/index.ts`, `src/domain/repositories/index.ts`, `src/domain/errors/index.ts`

## Phase 2: Infrastructure (TypeORM entities, repositorios)

- [ ] 2.1 Create `src/infrastructure/database/entities/CensusRecordEntity.ts` — TypeORM entity with UNIQUE constraints on `mototaxi_cedula` and `motorcycle_plate`, CHECK constraint for operation_type ↔ station_id coherence
- [ ] 2.2 Create `src/infrastructure/database/entities/CensusAuditEntity.ts` — TypeORM entity for audit table
- [ ] 2.3 Create `src/infrastructure/repositories/TypeormCensusRecordRepository.ts` — implements `ICensusRecordRepository` with TypeORM query builder; indexes on cédula, plate, status, period_id
- [ ] 2.4 Create `src/infrastructure/repositories/TypeormCensusAuditRepository.ts` — implements `ICensusAuditRepository`
- [ ] 2.5 Update `src/infrastructure/database/data-source.ts` — add `CensusRecordEntity` and `CensusAuditEntity` to entities array
- [ ] 2.6 Update barrel exports: `src/infrastructure/database/entities/index.ts`, `src/infrastructure/repositories/index.ts`

## Phase 3: Application (casos de uso con TDD)

- [ ] 3.1 RED: Write failing tests for `CreateCensusRecordUseCase` — duplicate cédula (409), duplicate plate (409), inactive period (400), station required without assignment (400), station assigned to independent (400), successful creation (201)
- [ ] 3.2 GREEN: Implement `CreateCensusRecordUseCase` — validate period active, validate uniqueness via repos, validate geography active, validate operation type coherence, validate GPS coordinates, call domain factory, persist, audit
- [ ] 3.3 RED: Write failing tests for `ListCensusRecordsUseCase` — admin sees all records, censista sees only own records, pagination works, filters by status/period/corregimiento
- [ ] 3.4 GREEN: Implement `ListCensusRecordsUseCase` — apply filters, enforce user scope (admin vs censista), pagination support
- [ ] 3.5 RED: Write failing tests for `SearchCensusRecordsUseCase` — search by cédula returns match, search by plate returns match, empty search returns empty array
- [ ] 3.6 GREEN: Implement `SearchCensusRecordsUseCase` — delegate to repository search, return results
- [ ] 3.7 RED: Write failing tests for `DeactivateCensusRecordUseCase` — deactivate existing record with reason, audit logged, attempt to deactivate inactive record fails
- [ ] 3.8 GREEN: Implement `DeactivateCensusRecordUseCase` — validate record exists and is active, update status to inactive, set reason, audit

## Phase 4: Presentation (controller, rutas)

- [ ] 4.1 Create `src/presentation/controllers/CensusController.ts` — HTTP adapter with methods: `createRecord`, `listRecords`, `searchRecords`, `getRecordById`, `deactivateRecord`; extract user context from auth middleware
- [ ] 4.2 Create `src/presentation/routes/census-records.routes.ts` — Express routes: `POST /`, `GET /`, `GET /search`, `GET /:id`, `PATCH /:id/deactivate`; apply auth middleware, role-based guards (Admin: all, Censista: own)
- [ ] 4.3 Update `src/app.ts` — wire `censusRecordsRouter` under `/api/v1/census-records`

## Phase 5: Integration (conectar todo, tests de integración)

- [ ] 5.1 Create integration test: full CRUD flow — create → list → search → deactivate against SQLite test DB
- [ ] 5.2 Create integration test: UNIQUE constraint enforcement — expect TypeORM unique violation on duplicate cédula and plate
- [ ] 5.3 Create integration test: audit logging — verify `census_audit` records created on create and deactivate
- [ ] 5.4 Create integration test: role-based access — censista sees only own records, admin sees all
- [ ] 5.5 Verify all barrel exports resolve correctly — no circular dependencies

## Phase 6: Verification (tests completos, lint)

- [ ] 6.1 Run full test suite: `npx jest` — all unit + integration tests pass
- [ ] 6.2 Verify coverage ≥ 85% for new files
- [ ] 6.3 Run linter: `npx eslint src/` — no errors in new files
- [ ] 6.4 Verify all Gherkin scenarios from SPEC have automated test equivalents
- [ ] 6.5 Smoke test: start app, POST a census record via curl, verify 201 response
