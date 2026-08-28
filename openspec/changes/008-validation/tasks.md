# Tasks: 008 — Validación y Cierre de Censos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750-950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Domain→PR2 Infra→PR3 App TDD→PR4 Presentation→PR5 Integration |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Domain | PR1 | `npx jest src/domain --testPathPattern=CensusStatus` | N/A | `src/domain/**` |
| 2 | Infra | PR2 | `npx jest src/infrastructure --testPathPattern=Validation` | SQLite | `src/infrastructure/**` |
| 3 | App | PR3 | `npx jest src/application --testPathPattern=Submit` | N/A | `src/application/**` |
| 4 | Presentation | PR4 | `npx jest src/presentation` | Supertest | `src/presentation/**` |
| 5 | Integration | PR5 | `npx jest --testPathPattern=integration` | Supertest | `tests/**` |

## Phase 1: Domain

- [ ] 1.1 Create `src/domain/value-objects/CensusStatus.ts` — enum6+canTransition
- [ ] 1.2 Create `src/domain/value-objects/RejectReason.ts` — VO10-500
- [ ] 1.3 Create `src/domain/entities/CensusValidation.ts` — entity
- [ ] 1.4 Create `src/domain/repositories/IValidationRepository.ts` — ports
- [ ] 1.5 Create `src/domain/errors/ValidationErrors.ts` — 409/400/422
- [ ] 1.6 Modify `ICensusRecordRepository.ts` — countByStatus
- [ ] 1.7 Modify `ICensusPeriodRepository.ts` — close

## Phase 2: Infra

- [ ] 2.1 Modify `CensusRecordEntity.ts` — CHECK6+IDX
- [ ] 2.2 Modify `CensusPeriodEntity.ts` — ACTIVO/CERRADO+closedAt
- [ ] 2.3 Create `CensusValidationEntity.ts` — table+IDX
- [ ] 2.4 Create `CedulaValidator.ts` — regex+uniq
- [ ] 2.5 Create `PlateValidator.ts` — regex+uniq
- [ ] 2.6 Create `TypeormValidationRepository.ts` — adapter
- [ ] 2.7 Modify `TypeormCensusRecordRepository.ts` — count+FOR_UPDATE
- [ ] 2.8 Modify `TypeormCensusPeriodRepository.ts` — BEGIN_IMMEDIATE
- [ ] 2.9 Create `migrations/*-AddValidationWorkflow.ts` — migration

## Phase 3: Application TDD

- [ ] 3.1 RED Submit — 403/409/422+happy
- [ ] 3.2 GREEN `SubmitCensusRecordUseCase.ts`
- [ ] 3.3 RED Review+Approve — 403/409
- [ ] 3.4 GREEN `ReviewCensusRecordUseCase.ts`+`ApproveCensusRecordUseCase.ts`
- [ ] 3.5 RED Reject — 400+dual
- [ ] 3.6 GREEN `RejectCensusRecordUseCase.ts`
- [ ] 3.7 RED ClosePeriod — 409/403
- [ ] 3.8 GREEN `CloseCensusPeriodUseCase.ts`

## Phase 4: Presentation

- [ ] 4.1 Modify `CensusController.ts` — 4 handlers
- [ ] 4.2 Modify `CensusPeriodController.ts` — close
- [ ] 4.3 Modify `census-records.routes.ts` — PATCH+GET
- [ ] 4.4 Modify `census-periods.routes.ts` — POST close+rateLimit
- [ ] 4.5 Modify `src/app.ts` — wiring
- [ ] 4.6 RED Routing — 401/403/409/422

## Phase 5: Integration

- [ ] 5.1 `PATCH /submit` — happy200/422/403/foto200
- [ ] 5.2 `PATCH review|approve|reject` — flows+terminal+dual
- [ ] 5.3 `POST /close` — 200/409pending/closed+blocksPATCH
- [ ] 5.4 `GET` scoping+history asc 8-step
- [ ] 5.5 E2E cycle→007 only APROBADO
- [ ] 5.6 Concurrency double submit/close 200vs409

## Phase 6: Verification

- [ ] 6.1 `npx jest --coverage` >=85% + snapshot
- [ ] 6.2 `npx eslint`+`tsc --noEmit` 0 errors
- [ ] 6.3 Perf <200ms/<2s 10k
- [ ] 6.4 Gherkin SPEC§10 trace
- [ ] 6.5 Migration rollback check
