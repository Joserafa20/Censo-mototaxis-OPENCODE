# Censo Mototaxis - Sabanalarga

API + Frontend para censo de mototaxis. Incluye entrega de adhesivos verificables.

## Adhesivos (011)

- `GET /api/v1/census-records/:id/sticker` (auth admin/censista, scoping dueño) → PDF 1-up folio uuid, placa, fecha, logo, QR `https://censo.sabanalarga.gov.co/verify/:folio`. Solo APROBADO/APROBADA else 409 STICKER_NOT_ELIGIBLE. Folio lazy uuid idempotente con FOR UPDATE.
- `POST /api/v1/stickers/batch` {ids: uuid[]} → PDF A4 6-up con crop marks, cap 100 else 400, solo APROBADAS atómico.
- `GET /verify/:folio` y `GET /api/v1/verify/:folio` público → {folio, plate, status, validatedAt, holderInitials, isValid} sin PII. 404 si no existe. Rate limit 30/min, batch 10/min. Helmet global, Zod validate, xss sanitización.

## Frontend

- `/dashboard/stickers` lista APROBADAS, preview individual y lote 6-up.
- `/verify/:folio` página pública sin PII.

## ENV

- VERIFY_BASE_URL (default https://censo.sabanalarga.gov.co/verify)
- EVIDENCE_STORAGE_PATH, DB_TYPE, etc.

## Deploy

Ver `docs/deployment.md` y `docs/backup.md`.
