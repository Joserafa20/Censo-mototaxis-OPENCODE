# Design: 009 — Habeas Data Consent & Evidential Photos

## Technical Approach

Extensión aditiva sobre 006. Dominio valida consentimiento y MIME/tamaño; infra agrega 4 columnas + transformer JSON y storage local; aplicación enforce en `CreateCensusRecordUseCase` y nuevo `AddEvidencePhotoUseCase` (append-only atómico); presentación expone `POST /:id/evidence` multipart con `multer`. 007 excluye PII por proyección. Flag `HABEAS_ENABLED` para rollback.

## Architecture Decisions

| Decisión | Opciones | Tradeoff | Elección |
|----------|----------|----------|----------|
| Validación consentimiento | A) VO + guard UseCase B) Middleware | A testable, reusable en 008; B acopla HTTP | **A** `isValidConsent()` en VO, guard en UseCase |
| Persistencia `evidencePhotos` | A) `TEXT` JSON B) Tabla hija | A simple para 0..5; B overkill | **A** `TEXT NULL` + transformer |
| Storage fotos | A) Local `uploads/evidence` B) S3 | A sin infra; B fuera de alcance | **A** `FileEvidenceStorage`, UUID+ext, `EVIDENCE_STORAGE_PATH` |
| Upload | A) `multer` diskStorage B) memoryStorage | A controla size en disco; B consume RAM | **A** `multer` limits 5MB + fileFilter |
| Migración | A) `ALTER TABLE ADD COLUMN` B) recreate | A mantiene datos | **A** aditiva con defaults |

## Data Flow

```
POST /census-records {consentGiven, consentSignature}
 → auth/role → CensusController → CreateCensusRecordUseCase
   → isValidConsent?422 → consentDate=NOW() → MIME/size → save → 201

POST /:id/evidence multipart photos[]
 → auth+multer → CensusController.addEvidence → AddEvidencePhotoUseCase
   → ownership 403 → count≤5?422 → MIME?422 (atómico) → storage → append → 200

GET /:id → incluye 4 campos | GET /reports/summary → excluye PII
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/entities/CensusRecord.ts` | Modify | +`consentGiven/signature/date/evidencePhotos`; defaults en factory |
| `src/domain/value-objects/Consent.ts` | Create | `isValidConsent()`, rango 3..200 |
| `src/domain/value-objects/EvidencePhoto.ts` | Create | `ALLOWED_MIMES`, `isValidEvidenceMime/Size`, `validateEvidenceCount` |
| `src/domain/errors/CensusErrors.ts` | Modify | `InvalidConsent/Signature/Mime/Limit` (422), `PayloadTooLarge` (413) |
| `src/domain/repositories/ICensusRecordRepository.ts` | Modify | `+updateEvidencePhotos()` |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modify | 4 cols + transformer JSON |
| `src/infrastructure/database/migrations/*AddHabeasColumns.ts` | Create | `ADD COLUMN` x4; down recreate |
| `src/infrastructure/storage/FileEvidenceStorage.ts` | Create | `save/delete`, UUID+ext |
| `src/application/use-cases/CreateCensusRecordUseCase.ts` | Modify | Guard consent fail-fast, set `consentDate` |
| `src/application/use-cases/AddEvidencePhotoUseCase.ts` | Create | Ownership, MIME/size/count, storage atómico |
| `src/application/use-cases/SubmitCensusRecordUseCase.ts` | Modify | Re-valida consent en `EN_PROCESO→COMPLETADO` |
| `src/presentation/controllers/CensusController.ts` | Modify | `createRecord` + `addEvidence` |
| `src/presentation/routes/census-records.routes.ts` | Modify | `POST /:id/evidence` con `multer` |
| `src/presentation/middlewares/errorHandler.ts` | Modify | Mapea 422/413 `{code,details}` |
| `src/infrastructure/repositories/TypeOrmCensusRecordRepository.ts` | Modify | Mapper JSON + `updateEvidencePhotos` |

## Interfaces / Contracts

```typescript
interface CensusRecord { consentGiven:boolean; consentSignature:string; consentDate:Date|null; evidencePhotos:string[]; }
const ALLOWED_MIMES=["image/jpeg","image/png","image/webp"] as const;
function isValidConsent(given:unknown,sig:unknown):boolean;
function isValidEvidenceMime(mime:string):boolean;
function isValidEvidenceSize(bytes:number):boolean;
class InvalidConsentError extends Error { statusCode=422; code="INVALID_CONSENT" }
class PayloadTooLargeError extends Error { statusCode=413; code="PAYLOAD_TOO_LARGE" }
interface AddEvidenceInput { recordId:string; files:Express.Multer.File[]; actorUserId:string; actorRole:string; }
```

Transformer:
```typescript
@Column({type:"text", nullable:true, transformer:{from:v=>v?JSON.parse(v):[], to:v=>v?.length?JSON.stringify(v):null}})
evidencePhotos!: string;
```

API: `POST /census-records` →201|422; `POST /:id/evidence` multipart `photos` →200|422|413|403; `GET /:id` incluye 4 campos.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `isValidConsent`, `isValidEvidenceMime/Size`, `validateEvidenceCount` | Vitest table-driven, clock mock |
| Unit | UseCases con `HABEAS_ENABLED` on/off, ownership | Mocks repo + fake storage |
| Integration | POST sin consent→422, con consent→201+DB; evidence jpeg→200, gif→422, 6MB→413, 6ta→422, 403 | Supertest + SQLite + tmpdir |
| Integration | GET incluye campos, 007 excluye PII, pre-009 null tolerante | Assert mapper |
| E2E | censista crea con consent+2 fotos → admin GET → 007 sin PII | API e2e |

Cobertura ≥85% en VO y UseCases evidencia.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Upload validado por allowlist MIME y limit 5MB antes de persistir.

## Migration / Rollout

Migración aditiva `ADD COLUMN consent_given BOOLEAN DEFAULT 0`, `consent_signature TEXT DEFAULT ''`, `consent_date DATETIME NULL`, `evidence_photos TEXT NULL`. Crear `uploads/evidence/` (`EVIDENCE_STORAGE_PATH`). Rollback: down recreate + `HABEAS_ENABLED=false` desactiva validación. Pre-009 sin backfill, lectura tolerante. Retención permanente sin job borrado.

## Open Questions

- [ ] Firma textual vs base64 afecta límite 200 chars (asumido textual).
- [ ] Admin solo lectura en `POST /:id/evidence`; 403 si censista no-owner.
- [ ] Servir fotos vía `express.static` en `/evidence`.
```
