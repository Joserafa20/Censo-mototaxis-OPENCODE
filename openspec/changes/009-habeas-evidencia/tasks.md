# Tasks: 009 — Habeas Data Consent & Evidential Photos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 680–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Domain → PR2 Infra → PR3 App TDD → PR4 Presentation |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Domain VOs+entity+errors | PR1 | `npm run test -- src/domain` | N/A | Revert `src/domain/**` |
| 2 | Infra entity+migration+storage | PR2 | `npm run test -- src/infrastructure` | `migration:run` | Drop 4 cols |
| 3 | App TDD guards+AddEvidence | PR3 | `npm run test -- src/application` | `curl POST /census-records` | Revert `src/application/**` |
| 4 | Presentation+Integration+Verify | PR4 | `npm run test:integration && npm run coverage` | `supertest evidence+reports` | Revert `src/presentation/**` |

## Phase 1: Domain

- [x] 1.1 `Consent.ts` — `isValidConsent` 3..200
- [x] 1.2 `EvidencePhoto.ts` — `ALLOWED_MIMES`, `isValidEvidenceMime/Size`, `validateEvidenceCount`
- [x] 1.3 `CensusRecord.ts` — add 4 fields + defaults
- [x] 1.4 `CensusErrors.ts` — 422/413 errors
- [x] 1.5 `ICensusRecordRepository.ts` — `updateEvidencePhotos()`

## Phase 2: Infra

- [x] 2.1 `CensusRecordEntity.ts` — 4 cols + JSON transformer
- [x] 2.2 `*AddHabeasColumns.ts` — ADD COLUMN x4, down recreate
- [x] 2.3 `FileEvidenceStorage.ts` — UUID+ext `EVIDENCE_STORAGE_PATH`
- [x] 2.4 `TypeOrmCensusRecordRepository.ts` — mapper + `updateEvidencePhotos`

## Phase 3: App TDD

- [x] 3.1 RED `Consent.spec.ts` — false, "", AB, 201c, 200 OK
- [x] 3.2 GREEN `Consent.ts`
- [x] 3.3 RED `EvidencePhoto.spec.ts` — gif/pdf/svg 422, webp OK, 5MB+1 413, >5 422
- [x] 3.4 GREEN `EvidencePhoto.ts`
- [x] 3.5 RED `CreateCensusRecordUseCase.spec.ts` — 422 CONSENT/SIGNATURE, ignore date
- [x] 3.6 GREEN `CreateCensusRecordUseCase.ts` — guard + `NOW()` + `HABEAS_ENABLED`
- [x] 3.7 RED `AddEvidencePhotoUseCase.spec.ts` — 403, 422 MIME, 413, 422 limit, atomic
- [x] 3.8 GREEN `AddEvidencePhotoUseCase.ts` — ownership+MIME/size/count+append
- [x] 3.9 `SubmitCensusRecordUseCase.ts` — re-validate consent

## Phase 4: Presentation

- [x] 4.1 `CensusController.ts` — `createRecord` + `addEvidence`
- [x] 4.2 `census-records.routes.ts` — `POST /:id/evidence` multer 5MB fileFilter
- [x] 4.3 `errorHandler.ts` — map 422/413 `{code,details}`
- [x] 4.4 007 projection — exclude `consentSignature`/`evidencePhotos`

## Phase 5: Integration

- [x] 5.1 Wire `EVIDENCE_STORAGE_PATH` + `express.static /evidence`
- [x] 5.2 `POST /census-records` — no consent 422, valid 201 + DB assert
- [x] 5.3 `POST /:id/evidence` — jpeg 200, gif 422 atomic, 6MB 413, 6th 422, 403
- [x] 5.4 `GET /:id` 4 fields; `GET /reports/summary` excludes PII; pre-009 null OK

## Phase 6: Verification

- [x] 6.1 Coverage ≥85% VO+UseCases — `npm run coverage`
- [x] 6.2 All 14 Gherkin SPEC §10 automated
- [x] 6.3 NFR <100ms, 5MB <2s, append-only
- [x] 6.4 Retention: no job deletes consent/photos; `HABEAS_ENABLED=false` bypass
