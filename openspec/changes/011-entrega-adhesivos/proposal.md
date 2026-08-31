# Proposal: 011 — Entrega Adhesivos

## Intent

Adhesivo verificable solo APROBADAS (folio uuid + QR sin PII), hardening y docs.

## Scope

### In Scope
- `GET /census-records/:id/sticker` → PDF 1-up (folio uuid, placa, fecha, logo, QR `https://censo.sabanalarga.gov.co/verify/:folio`)
- `POST /stickers/batch` {ids[]} → PDF A4 6-up crop-marks, solo APROBADAS cap 100
- `GET /verify/:folio` → DTO sin PII, valida `audit_logs`, 404 si no existe
- Seguridad: `helmet`, `rate-limit` (verify 30/min batch 10/min), `zod`, sanitización xss/NoSQL
- QA ≥85% + tests sticker/verify/rate-limit/Zod
- Docs: README, `docs/deployment.md`, `docs/backup.md`

### Out of Scope
- Refolio, revocación QR, firma digital, S3/CDN, email, app nativa, OCR

## Capabilities

### New Capabilities
- `adhesive-generation`: PDF 1-up y 6-up, gating APROBADA, folio uuid v4
- `adhesive-verification`: QR + verify público sin PII, audit hit
- `security-hardening`: helmet, rate-limit, Zod, sanitización
- `delivery-docs`: README, despliegue, backup/restore, QA gate

### Modified Capabilities
- `census-records` (006): APROBADA genera folio; otros → 409 STICKER_NOT_ELIGIBLE
- `audit-trail` (010): registra `STICKER_BATCH_GENERATED`, `VERIFY_HIT`

## Approach

- `pdfkit` sobre `PdfExporter` 010: `StickerRenderer` 1-up, `BatchSheetRenderer` 6-up; `qrcode` PNG; logo `assets/logo-alcaldia.png`
- Col `sticker_folio` uuid unique; Zod `z.string().uuid()`
- `helmet()` global, `rateLimit` por ruta, `validate(schema)`, `xss` + strip `$`/`{}`
- `jest --coverage` 85; factories APROBADA/RECHAZADA

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/entities/CensusRecord.ts` | Modified | `stickerFolio` |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modified | col unique + migración |
| `src/infrastructure/export/Sticker*` | New | 1-up y 6-up |
| `src/presentation/routes/sticker.routes.ts` | New | GET sticker, POST batch |
| `src/presentation/routes/verify.routes.ts` | New | GET /verify/:folio |
| `src/presentation/middlewares/validate.ts` | New | Zod |
| `src/presentation/server.ts` | Modified | helmet + rateLimit |
| `src/application/use-cases/*Sticker*.ts` | New | Generate/Batch/Verify |
| `docs/*`, `README.md`, `jest.config.js` | New/Mod | docs + 85% |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OOM lote 100 | Med | streaming + cap 100→400 |
| QR guess | Low | uuid 122-bit + verify DB |
| PII leak /verify | High | DTO sin PII + snapshot test |
| Rate-limit FP | Med | por IP + 429 Retry-After |
| Logo faltante | Low | fallback texto + check boot |

## Rollback Plan

Flags `STICKER_ENABLED`/`VERIFY_ENABLED` →404. Down solo si `sticker_folio` null. Helmet/rate-limit por env.

## Dependencies

- 006, 010; `qrcode`, `helmet`, `express-rate-limit`, `zod`, `xss`

## Success Criteria

- [ ] APROBADA → PDF folio/placa/fecha/logo/QR; otro →409
- [ ] Batch 6 → A4 6-up; >100 →400
- [ ] verify válido 200 sin PII + audit; inválido 404
- [ ] Helmet OK; 31/min →429; Zod inválido →400
- [ ] Coverage ≥85%
- [ ] README + deployment + backup OK en deploy limpio
