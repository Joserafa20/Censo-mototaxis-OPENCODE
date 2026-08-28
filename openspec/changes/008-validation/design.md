# Design: 008 — Validación y Cierre de Censos

## Technical Approach

Extiende `census_records` de 3 a 6 estados (`PENDIENTE→EN_PROCESO→COMPLETADO→EN_REVISION→APROBADO/RECHAZADO→EN_PROCESO`) y congela `census_periods` vía `CERRADO`. Flujo: censista `submit` → admin `review/approve/reject` → admin `close`. Transacción `BEGIN IMMEDIATE` + `census_validations` append-only. Reusa `auth/roleMiddleware`, extiende repos/controladores. 007 filtra solo `APROBADO` en período `CERRADO`.

## Architecture Decisions

| Decision | Option | Tradeoff | Verdict |
|---|---|---|---|
| Enum | Reemplazo sin backfill / `validationStatus` separado | Rompe datos / duplica estado | Rejected |
|  | Extender `status` CHECK 6 valores + backfill `active→EN_PROCESO` | Single source, migración atómica | **Chosen** |
| Auditoría | Campos en record / reusar `census_audit` | Sobrescribe / genérico | Rejected |
|  | `census_validations` append-only + índices `record,period` | Trazabilidad RN-010/RNF-003, historial ordenado | **Chosen** |
| Cierre | En `ChangeStatusUseCase` | Mezcla concerns | Rejected |
|  | `CloseCensusPeriodUseCase` con `COUNT PENDIENTE/EN_PROCESO=0` + `closed_at/by` | Precondición atómica, rate-limit 5/min | **Chosen** |
| Validaciones submit | En controller | No testeable | Rejected |
|  | `Cedula/Plate/GeographyValidator` en `SubmitUseCase` | <200ms con UNIQUE, 422 `details[]` | **Chosen** |

Rationale clave: SPEC 6.1 CHECK, RN-006/007 bloqueo, RN-002 regex cédula `^\d{6,10}$` placa `^[A-Z]{3}-?[0-9]{3}$` normalizada, unicidad por índice.

## Data Flow

```
PATCH /census-records/:id/submit (censista)
 -> auth401/role -> SubmitUseCase: FOR UPDATE -> owner403 -> period CERRADO?409 -> EN_PROCESO?409 -> validators422 -> COMPLETADO + validations insert -> 200
PATCH /:id/{review,approve,reject} (admin)
 -> canTransition409 -> CERRADO?409 -> reject reason 10-500 400 -> dual insert RECHAZADO→EN_PROCESO -> 200
POST /census-periods/:id/close (admin)
 -> BEGIN IMMEDIATE -> COUNT PEND/EN_PROC>0?409 -> ya CERRADO?409 -> CERRADO+closed_at/by -> commit -> PATCH futuros 409 PERIOD_CLOSED
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/value-objects/CensusStatus.ts` | Create | Enum 6 + `canTransition(f,t,role,owner,period)` |
| `src/domain/value-objects/RejectReason.ts` | Create | VO 10-500 chars |
| `src/domain/entities/CensusValidation.ts` | Create | Entity `census_validations` |
| `src/domain/repositories/IValidationRepository.ts` | Create | `save, findByRecordId` |
| `src/domain/repositories/ICensusRecordRepository.ts` | Modify | `countByStatus(periodId,statuses)` |
| `src/domain/repositories/ICensusPeriodRepository.ts` | Modify | `close(id,adminId)` tx |
| `src/domain/errors/ValidationErrors.ts` | Create | 409/400/422 codes |
| `src/application/use-cases/SubmitCensusRecordUseCase.ts` | Create | Owner + validaciones |
| `src/application/use-cases/ReviewCensusRecordUseCase.ts` | Create | `COMPLETADO->EN_REVISION` |
| `src/application/use-cases/ApproveCensusRecordUseCase.ts` | Create | `EN_REVISION->APROBADO` terminal |
| `src/application/use-cases/RejectCensusRecordUseCase.ts` | Create | `RECHAZADO->EN_PROCESO` dual insert |
| `src/application/use-cases/CloseCensusPeriodUseCase.ts` | Create | Precondición + CERRADO |
| `src/infrastructure/database/entities/CensusValidationEntity.ts` | Create | Entity + IDX |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modify | CHECK 6, IDX `(status,periodId)` |
| `src/infrastructure/database/entities/CensusPeriodEntity.ts` | Modify | `ACTIVO/CERRADO` + `closedAt/closedBy` |
| `src/infrastructure/repositories/TypeormValidationRepository.ts` | Create | Adapter |
| `src/infrastructure/repositories/TypeormCensusRecordRepository.ts` | Modify | `countByStatus` + queryRunner |
| `src/infrastructure/repositories/TypeormCensusPeriodRepository.ts` | Modify | `close` BEGIN IMMEDIATE |
| `src/infrastructure/validators/CedulaValidator.ts` | Create | Regex+unicidad |
| `src/infrastructure/validators/PlateValidator.ts` | Create | Normalización+unicidad |
| `src/presentation/controllers/CensusController.ts` | Modify | `submit/review/approve/reject` |
| `src/presentation/controllers/CensusPeriodController.ts` | Modify | `close` |
| `src/presentation/routes/census-records.routes.ts` | Modify | `PATCH :id/submit|review|approve|reject` |
| `src/presentation/routes/census-periods.routes.ts` | Modify | `POST :id/close` rateLimit |
| `src/infrastructure/database/migrations/*-AddValidationWorkflow.ts` | Create | CHECK, tabla, backfill |
| `src/app.ts` | Modify | Wire use cases |

## Interfaces / Contracts

```typescript
export type CensusRecordStatus = "PENDIENTE"|"EN_PROCESO"|"COMPLETADO"|"EN_REVISION"|"APROBADO"|"RECHAZADO";
export type CensusPeriodStatus = "ACTIVO"|"CERRADO"; // FINALIZADO alias CERRADO
export function canTransition(f: CensusRecordStatus, t: CensusRecordStatus, role: string, owner: boolean, period: string): boolean;
export interface CensusValidation { id:string; censusRecordId:string; periodId:string; fromStatus:CensusRecordStatus; toStatus:CensusRecordStatus; actorUserId:string; actorRole:string; reason:string|null; metadata:any; createdAt:Date; }
export interface IValidationRepository { save(v:CensusValidation):Promise<void>; findByRecordId(id:string):Promise<CensusValidation[]>; }
export interface ICensusRecordRepository { countByStatus(p:string,s:CensusRecordStatus[]):Promise<number> }
export class SubmitCensusRecordUseCase { execute(p:{recordId:string; actorUserId:string}):Promise<{status:CensusRecordStatus}> }
export class CloseCensusPeriodUseCase { execute(p:{periodId:string; adminId:string}):Promise<{status:"CERRADO"}> }
// HTTP: 401/403/404/409 INVALID_TRANSITION|PERIOD_CLOSED|ALREADY_APPROVED|PERIOD_HAS_PENDING, 422 VALIDATION_FAILED, 400 REJECT_REASON_REQUIRED
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `canTransition` 6x6 + CERRADO bloquea, `Cedula/Plate/RejectReason` | Jest table, snapshot matriz |
| Unit | Use cases 403 owner/role, 409, 422, reject dual insert, close precondición | Mock repos |
| Integration | `PATCH submit/review/approve/reject` + `POST close` + `GET :id` validations asc + scoping | sqlite seed, Supertest |
| E2E | Ciclo completo + `close` bloquea + 007 solo APROBADO | Supertest createApp |
| Concurrency | Doble submit/close | Promise.all 200 vs 409 |

Cobertura >=85% `src/**/validation/**`. RNF-002 <200ms, RNF-006 <2s/10k en integración.

## Threat Matrix

| Boundary | Applicable | Reason |
|----------|------------|--------|
| Routing | Applicable | Nuevos PATCH/POST, tests 401/403/409/422 |
| Shell/Subprocess/VCS/Exec/Process | N/A | Sin shell/process/VCS |

## Migration / Rollout

Migración `AddValidationWorkflow`: recrear `census_records` con CHECK 6, crear `census_validations` + IDX, añadir `closed_at/by`, backfill. Deploy tolera ambos enums; rollback recrea CHECK anterior. Sin feature flag. 007 filtra `APROBADO` si `CERRADO`.

## Open Questions

- [ ] Mapeo `suspended` → `PENDIENTE` correcto?
- [ ] `FINALIZADO` alias `CERRADO` o migración renombre?
- [ ] `period_id` denormalizado en validations: ¿sync si cambia `periodId`? No mutable — N/A.
