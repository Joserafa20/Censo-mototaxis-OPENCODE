# Proposal: 009 — Habeas Data Consent & Evidential Photos

## Intent

Ley 1581 de 2012 compliance. Each `CensusRecord` must prove prior informed consent captured on tablet (checkbox + driver signature) and may carry optional evidential photos. Decisions: consent mandatory; photos optional with MIME check; retention permanent; no suppression workflow.

## Scope

### In Scope
- `consentGiven: boolean` MUST true, `consentSignature: string` non-empty, `consentDate: Date` server-set
- `evidencePhotos: string[]` URLs, 0..N, MIME `jpeg|png|webp`, size/count caps
- Domain + TypeORM extension of `census_records` + 422 on invalid consent/MIME
- Expose on record detail; exclude from 007 summary/export
- Permanent retention

### Out of Scope
- Revocation/suppression, time-based anonymization/deletion
- Crypto/biometric signature verification, S3, OCR, retroactive backfill

## Capabilities

### New Capabilities
- `habeas-consent`: consent capture/validation/storage (Ley 1581)
- `evidence-photos`: optional upload, MIME/size validation, URL persistence

### Modified Capabilities
- `census-records` (006): creation requires consent; adds optional photos

## Approach

- Model: `CensusRecord += { consentGiven, consentSignature, consentDate, evidencePhotos: string[] }`
- Domain: extend entity + factory, helpers `isValidConsent()`, `isValidEvidenceMime()`
- DB: additive migration `consent_given BOOLEAN`, `consent_signature TEXT`, `consent_date DATETIME`, `evidence_photos TEXT` (JSON)
- App: `Create/Update` enforce `consentGiven===true && signature!=""` else 422; MIME check before photo append
- API: `POST /census-records` requires consent; `POST /:id/evidence` multipart
- UI: checkbox + signature-pad + file input; flows: valid->201, invalid->422, photo->MIME->200

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/entities/CensusRecord.ts` | Modified | 4 fields |
| `src/domain/value-objects/*` | New | Consent/Evidence helpers |
| `src/domain/errors/CensusErrors.ts` | Modified | `InvalidConsentError`, `InvalidEvidencePhotoError` |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modified | 4 cols + migration |
| `src/application/use-cases/*` | Modified | Consent + MIME guards |
| `src/presentation/**` | Modified | Consent fields + upload route |
| `frontend/src/**` | Modified | Checkbox + signature + upload |
| `008 Validation` | None | Read-only surface in review |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Record without consent | High | Server 422 |
| Signature forgery | Med | `consentDate`+`createdByUserId`+audit |
| PII leak photos | Med | Exclude from 007 export |
| Storage bloat | Med | 5MB/file, max5, 413 |
| SQLite JSON | Low | App parse |

## Rollback Plan

Additive down drops columns. Flag `HABEAS_ENABLED` disables validation. No deletion.

## Dependencies

- 006 + 008 read-only, `multer`, signature-pad, `EVIDENCE_STORAGE_PATH`

## Success Criteria

- [ ] POST without `consentGiven:true` or empty signature -> 422
- [ ] Valid consent persists and returns on GET by id
- [ ] Non-image MIME -> 422; jpeg/png/webp -> OK
- [ ] `evidencePhotos` optional 0..N, excluded from 007 summary
- [ ] No deletion/anonymization job touches consent/photos
