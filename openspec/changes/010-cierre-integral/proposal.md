# Proposal: 010 — Cierre Integral (Excel + Auditoría + Offline PWA)

## Intent

Cierre operativo: XLSX/PDF entregable, trazabilidad Ley 1581 y campo sin señal. Sin esto no hay auditoría ni uso offline.

## Scope

### In Scope
- XLSX real `exceljs`: multi-hoja (Datos+Resumen+Aviso), estilos/filtros/freeze, streaming, cap 10k
- PDF certificado `pdfkit`: agregados + metadatos (periodo/operador/fecha/hash), folio uuid, header/footer, paginado
- Audit append-only: `audit_logs(id,entityType,entityId,action,actorId,actorRole,timestamp,before,after,ip)` solo INSERT; `GET /audit/:type/:id` timeline
- PWA offline: manifest + SW Workbox + IndexedDB (`idb`) + `sync_queue` + indicador offline + sync reconexión con reintento exp. + last-write-wins por `updatedAt`

### Out of Scope
- Push notifications, biometría/firma criptográfica, OCR, S3/CDN, reportes por email, OT/CRDT, backfill auditoría

## Capabilities

### New Capabilities
- `certified-export`: XLSX (exceljs) y PDF (pdfkit) streaming con Ley 1581
- `audit-trail`: log append-only who/when/what + timeline por entidad
- `offline-pwa`: SW + IndexedDB + cola sync + indicador + last-write-wins

### Modified Capabilities
- `reports` (007): Export delega a Excel/PdfExporter reales
- `census-records` (006): mutaciones emiten evento auditado

## Approach

- Export: `IExporter`→`ExcelExporter`/`PdfExporter` streaming, reutiliza `ReportFilters`+scoping+`Anonymizer` 007
- Audit: `AuditLog`+repo append-only + `AuditInterceptor` before/after/actor; índice (entityType,entityId,timestamp)
- PWA: `vite-plugin-pwa` Workbox, `CacheFirst` assets, `NetworkFirst` API→IndexedDB, `SyncQueue` drena en `online` (409→last-write-wins), `OfflineBadge`
- Deps: `exceljs`, `pdfkit`, `workbox-window`, `idb`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/export/*` | New/Mod | ExcelExporter, PdfExporter, ExportStyles |
| `src/domain/entities/AuditLog.ts` | New | Entidad append-only |
| `src/infrastructure/database/entities/AuditLogEntity.ts` | New | Tabla + migración |
| `src/application/use-cases/*` | Modified | Interceptor audit |
| `src/presentation/routes/audit.routes.ts` | New | GET /audit/:type/:id |
| `frontend/src/pwa/*` | New | SW, manifest, IndexedDB, SyncQueue |
| `frontend/src/components/OfflineBadge.tsx` | New | Indicador |
| `frontend/vite.config.ts` | Modified | vite-plugin-pwa |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| XLSX OOM 10k | Med | Streaming + cap 10k→400 |
| PDF sin folio/hash | Med | uuid + SHA256 payload |
| Audit mutable | Low | Repo sin update/delete + test |
| Sync duplica | High | clientId idempotency-key |
| SW data obsoleta | Med | CACHE_VERSION + NetworkFirst API |

## Rollback Plan

Flags `EXPORT_V2`/`AUDIT_ENABLED`/`PWA_ENABLED`. Rollback: export→CSV 007, audit→tabla sin lectura (down solo sin datos), PWA→`unregister()`+clear IndexedDB, app online-only.

## Dependencies

- 007 ReportFilters/Anonymizer/IReportRepository; 006 CensusRecord; exceljs, pdfkit, vite-plugin-pwa, idb

## Success Criteria

- [ ] `GET /reports/export?format=xlsx` XLSX válido 3 hojas; `?format=pdf` PDF con folio/hash
- [ ] POST/PATCH/DELETE genera fila audit who/when/what; GET /audit/:type/:id timeline ordenado
- [ ] UPDATE/DELETE audit_logs falla
- [ ] Lighthouse PWA ≥90; carga offline con catálogos; OfflineBadge visible
- [ ] Crear offline→reconexión→sync 201; conflicto→last-write-wins
- [ ] >10k →400 EXPORT_LIMIT_EXCEEDED; scoping por rol en XLSX/PDF
