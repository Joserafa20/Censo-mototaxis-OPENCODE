# SPEC 011 — Entrega Adhesivos

## 1. Objetivo

Entregar el adhesivo circular verificable del Censo de Mototaxis de Sabanalarga como entregable certificable en PDF. Solo registros en estado `APROBADA` pueden generar adhesivo con folio único `uuid v4`, código QR verificable sin PII y trazabilidad en `audit_logs`. El sistema DEBE proveer generación individual (1-up), por lote (6-up A4) y verificación pública con hardening de seguridad y documentación operativa para despliegue limpio.

---

## 2. Contexto y Justificación

El estado `APROBADA` (008) es la única fuente de verdad para circulación autorizada. Sin adhesivo verificable, el tránsito no puede validar en vía si una moto está censada y aprobada por la Alcaldía. La Ley 1581 exige que la verificación pública NO exponga PII. El módulo 010 dejó `PdfExporter` y `audit_logs` listos; el 011 reutiliza ambos y añade `sticker_folio` como identificador no secuencial (122-bit uuid) para evitar enumeración. `helmet` + `rate-limit` + `Zod` cierran superficie de abuso en endpoints públicos.

---

## 3. Alcance

### In Scope
- Columna `sticker_folio` en `census_records` — `uuid v4` único, solo seteable cuando `status = APROBADA`.
- `GET /census-records/:id/sticker` → PDF 1-up con folio, placa, fecha, logo Alcaldía y QR `https://censo.sabanalarga.gov.co/verify/:folio` (streaming `pdfkit`).
- `POST /stickers/batch` `{ids: uuid[]}` → PDF A4 6-up (2 cols × 3 filas) con crop-marks, solo APROBADAS, cap 100.
- `GET /verify/:folio` público sin auth → DTO sin PII, valida contra `audit_logs`/`census_records`, 404 si no existe.
- Hardening: `helmet` global, `rate-limit` (verify 30/min, batch 10/min), validación `Zod` (`z.string().uuid()`), sanitización `xss` + strip `$`/`{}` contra NoSQL injection.
- Auditoría: `STICKER_GENERATED`, `STICKER_BATCH_GENERATED`, `VERIFY_HIT` en `audit_logs`.
- Docs: `README.md`, `docs/deployment.md`, `docs/backup.md` y QA gate coverage ≥ 85%.
- Flags `STICKER_ENABLED` / `VERIFY_ENABLED` para rollback → 404.

### Out of Scope
- Refolio / reemisión por pérdida, revocación de QR, firma digital / sello criptográfico.
- Almacenamiento S3/CDN, envío por email, app nativa.
- OCR de documentos, foto en adhesivo, datos biométricos.
- Anulación física del adhesivo o impresión térmica directa.
- Versionado de plantilla de adhesivo (solo plantilla circular v1).

---

## 4. Actores y Permisos

| Actor | Permisos Sticker | Permisos Verify | Permisos Batch |
|-------|------------------|-----------------|----------------|
| **Administrador** (`admin`) | `GET /census-records/:id/sticker` sobre **cualquier** registro en `APROBADA`. Genera folio si es `null` (upsert idempotente). | Puede consultar `GET /verify/:folio` (igual que público). | `POST /stickers/batch` con cualquier `ids[]` en `APROBADA` (cap 100). |
| **Censista dueño** (`censista` + `created_by_user_id = actorId`) | `GET /census-records/:id/sticker` solo sobre **sus** registros en `APROBADA` propios. 403 si intenta ajeno. | Igual que público. | `POST /stickers/batch` solo si **todos** los `ids` son propios; si alguno ajeno → 403. |
| **Censista no dueño** | 403 en `GET /census-records/:id/sticker` ajeno. | Puede consultar verify público. | 403 si algún `id` no es propio. |
| **No autenticado** | 401 en `GET /sticker` y `POST /batch`. | **200 o 404** en `GET /verify/:folio` **sin auth** (endpoint público). `helmet` + `rate-limit` aplican igual. | 401 en `POST /batch`. |
| **Sistema** | Valida `status`, genera `sticker_folio` uuid, renderiza PDF 1-up con `StickerRenderer`, emite `audit_logs`, aplica `helmet`/`rate-limit`/`Zod`. | Valida `folio` uuid, busca `census_records` + `audit_logs`, retorna DTO sin PII, registra `VERIFY_HIT`. | Valida `ids` uuid + cap 100, filtra solo `APROBADA`, renderiza 6-up `BatchSheetRenderer` streaming. |

**Matriz de autorización técnica:**
- `GET /census-records/:id/sticker`: `authMiddleware` → `roleMiddleware(admin|censista)` → `Zod(params {id: uuid})` → cargar registro → `if status !== APROBADA → 409 STICKER_NOT_ELIGIBLE` → `if censista && record.created_by_user_id !== actorId → 403` → generar folio si `null` (transacción) → `StickerRenderer` streaming.
- `POST /stickers/batch`: `authMiddleware` → `roleMiddleware` → `validate(batchSchema {ids: uuid[].min(1).max(100).unique()})` → `if ids.length > 100 → 400 BATCH_LIMIT_EXCEEDED` → cargar registros → `if alguno status !== APROBADA → 409 STICKER_NOT_ELIGIBLE` → scoping por dueño si censista → `BatchSheetRenderer` 6-up streaming.
- `GET /verify/:folio`: **sin `authMiddleware`** → `Zod(params {folio: uuid})` → `rateLimit(30/min por IP)` → `findByFolio` → `if null → 404` → retorna DTO sin PII + registra `VERIFY_HIT` en `audit_logs` (no bloqueante).

---

## 5. Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE generar `sticker_folio` `uuid v4` único al primer `GET /sticker` de un registro en `APROBADA` si `sticker_folio IS NULL`, y reutilizar el mismo folio en llamadas posteriores (idempotente) | Alta |
| RF-002 | El sistema DEBE exponer `GET /census-records/:id/sticker` autenticado que retorne PDF 1-up con folio, placa (`motorcycle_plate`), fecha (`approved_at` o `updated_at`), logo `assets/logo-alcaldia.png` (fallback texto si falta) y QR PNG `https://censo.sabanalarga.gov.co/verify/:folio` | Alta |
| RF-003 | El sistema DEBE responder 409 `STICKER_NOT_ELIGIBLE` en `GET /sticker` si `status !== APROBADA` (incluye PENDIENTE, EN_PROCESO, COMPLETADO, EN_REVISION, RECHAZADO, CERRADO) | Alta |
| RF-004 | El sistema DEBE exponer `POST /stickers/batch` autenticado con body `{ids: string[]}` validado por `Zod` (`z.array(z.string().uuid()).min(1).max(100).refine(unique)`) que retorne PDF A4 6-up (2×3, crop-marks) | Alta |
| RF-005 | Si `ids.length > 100` el sistema DEBE responder 400 `BATCH_LIMIT_EXCEEDED` sin generar PDF | Alta |
| RF-006 | `POST /stickers/batch` DEBE validar que **todos** los `ids` existen; si alguno no existe → 404 con `missingIds[]`; si alguno no es `APROBADA` → 409 `STICKER_NOT_ELIGIBLE` con `ineligibleIds[]` | Alta |
| RF-007 | El sistema DEBE exponer `GET /verify/:folio` **público sin auth** que valide `folio` como `uuid` (Zod) y retorne 200 con DTO sin PII si existe, o 404 si no existe | Alta |
| RF-008 | El DTO de `GET /verify/:folio` DEBE contener solo `{folio, placa, estado: "APROBADA", fechaAprobacion, verificadoEn}` — MUST NOT exponer `cedula`, `nombre`, `telefono`, `direccion`, `barrio`, `foto` | Alta |
| RF-009 | Cada `GET /verify/:folio` exitoso o fallido DEBE registrar `VERIFY_HIT` en `audit_logs` con `folio`, `ip`, `timestamp` (no bloquea respuesta) | Media |
| RF-010 | Cada generación individual o por lote DEBE registrar `STICKER_GENERATED` / `STICKER_BATCH_GENERATED` en `audit_logs` con `actorId`, `actorRole`, `folio(s)`, `ip` | Alta |
| RF-011 | El sistema DEBE aplicar `helmet()` global (headers `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`) y `rate-limit` por ruta (verify 30/min por IP, batch 10/min por IP+usuario) con 429 `Retry-After` | Alta |
| RF-012 | El sistema DEBE validar todos los `params`/`body` con `Zod` vía middleware `validate(schema)` y sanitizar con `xss` + strip de `$` y `{}` contra NoSQL injection; fallo → 400 `VALIDATION_ERROR` con `details[]` | Alta |
| RF-013 | La generación PDF (1-up y 6-up) DEBE usar streaming (`doc.pipe(res)`) sin buffer completo en memoria; `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="adhesivo-{folio}.pdf"` (1-up) o `filename="adhesivos-lote-{timestamp}.pdf"` (batch) | Alta |
| RF-014 | El sistema DEBE documentar despliegue y backup en `docs/deployment.md` y `docs/backup.md` y actualizar `README.md` con endpoints, flags y verificación | Media |
| RF-015 | Si flags `STICKER_ENABLED=false` o `VERIFY_ENABLED=false` el endpoint respectivo DEBE responder 404 `FEATURE_DISABLED` | Media |

---

## 6. Requisitos No Funcionales

| ID | Requisito | Categoría | Umbral |
|----|-----------|-----------|--------|
| RNF-001 | `GET /sticker` 1-up DEBE responder en < 800 ms (p95) sin incluir descarga | Rendimiento | < 800 ms |
| RNF-002 | `POST /stickers/batch` con 100 registros DEBE responder en < 3 s (p95) y NO superar 150 MB heap (streaming) | Rendimiento | < 3 s / streaming |
| RNF-003 | `GET /verify/:folio` DEBE responder en < 150 ms (p95) con índice sobre `sticker_folio` | Rendimiento | < 150 ms |
| RNF-004 | `sticker_folio` uuid 122-bit DEBE ser impredecible; NO secuencial, NO reutilizable; fuerza bruta inviable | Seguridad | uuid v4 |
| RNF-005 | `GET /verify/:folio` NO DEBE filtrar PII bajo ninguna condición; test snapshot DTO obligatorio | Seguridad | Snapshot test |
| RNF-006 | Cobertura del módulo (sticker/verify/rate-limit/Zod) DEBE ser ≥ 85% (`jest --coverage`) | Calidad | ≥ 85% |
| RNF-007 | `helmet` headers DEBEN estar presentes en toda respuesta HTTP; test de integración obligatorio | Seguridad | Headers presentes |
| RNF-008 | `rate-limit` DEBE retornar 429 con header `Retry-After` al exceder umbral; conteo por IP aislado | Fiabilidad | 429 + Retry-After |

---

## 7. Modelo de Datos Afectado

### Tabla: `census_records` — extensión

| Campo | Tipo | Descripción | Restricción |
|-------|------|-------------|-------------|
| `sticker_folio` | `VARCHAR(36) NULL` | Folio del adhesivo `uuid v4` | `UNIQUE`, `NULL` permitido hasta aprobación; solo seteable si `status = APROBADA` |
| `sticker_generated_at` | `TIMESTAMP NULL` | Momento de primera generación | `NULL` permitido |
| `sticker_generated_by` | `UUID NULL FK → users.id` | Actor que generó por primera vez | `NULL` permitido |

**Migración:** `1724990000000-AddStickerFolioToCensusRecords.ts`
```sql
ALTER TABLE census_records ADD COLUMN sticker_folio VARCHAR(36) NULL;
ALTER TABLE census_records ADD COLUMN sticker_generated_at TIMESTAMP NULL;
ALTER TABLE census_records ADD COLUMN sticker_generated_by UUID NULL REFERENCES users(id);
CREATE UNIQUE INDEX IDX_census_records_sticker_folio ON census_records(sticker_folio) WHERE sticker_folio IS NOT NULL;
CREATE INDEX IDX_census_records_status_folio ON census_records(status, sticker_folio);
```
**Regla de unicidad:** `sticker_folio` `UNIQUE` parcial (`WHERE NOT NULL`) — `null` no colisiona; `uuid` nunca duplicado. Intento de duplicar → error DB `UNIQUE constraint failed`.

### Entidad dominio

```ts
// src/domain/entities/CensusRecord.ts — campo añadido
stickerFolio: string | null; // uuid v4 | null
stickerGeneratedAt: Date | null;
stickerGeneratedBy: string | null;
```

### Tabla: `audit_logs` — eventos nuevos (010)

| `action` | Descripción |
|----------|-------------|
| `STICKER_GENERATED` | `GET /sticker` exitoso — `entityId = census_record.id`, `after = {folio, placa}` |
| `STICKER_BATCH_GENERATED` | `POST /batch` exitoso — `entityId = batchId uuid`, `after = {folios[], count}` |
| `VERIFY_HIT` | `GET /verify/:folio` — `entityId = folio`, `before = null`, `after = {result: hit|miss}` |

### Secuencia folio

```
APROBADA (sticker_folio = NULL)
  → GET /sticker (primera vez)
    → BEGIN IMMEDIATE
    → SELECT sticker_folio FOR UPDATE
    → IF null → SET sticker_folio = randomUUID(), sticker_generated_at = now(), sticker_generated_by = actorId
    → COMMIT + audit STICKER_GENERATED
  → GET /sticker (n veces) → reutiliza mismo folio
```

---

## 8. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | Solo `APROBADA` puede generar adhesivo. Cualquier otro estado DEBE retornar 409 `STICKER_NOT_ELIGIBLE` con body `{code, requiredStatus:"APROBADA", currentStatus}`. |
| RN-002 | `sticker_folio` DEBE ser `uuid v4` generado por `crypto.randomUUID()`; MUST NOT ser secuencial, numérico ni derivado de `id`/`placa`/`cedula`. |
| RN-003 | `sticker_folio` es inmutable: una vez seteado NUNCA cambia (no refolio en este SPEC). Segunda generación retorna mismo folio. |
| RN-004 | `GET /verify/:folio` con `folio` no `uuid` → 400 `VALIDATION_ERROR`; `folio` uuid válido pero inexistente → 404 `FOLIO_NOT_FOUND`. |
| RN-005 | `GET /verify/:folio` es público (sin `Authorization`); MUST NOT requerir JWT, rol ni sesión. |
| RN-006 | DTO de verify MUST NOT contener PII: prohibidos `cedula`, `nombre`, `telefono`, `email`, `direccion`, `barrio`, `foto`, `userId`. Snapshot test falla si aparece campo extra. |
| RN-007 | `POST /stickers/batch` con `ids` duplicados → 400 `DUPLICATE_IDS`; `ids` vacío → 400 `VALIDATION_ERROR`; `ids` con formato no uuid → 400 `VALIDATION_ERROR` por Zod. |
| RN-008 | `POST /stickers/batch` respeta cap 100 estricto: `>100` → 400 `BATCH_LIMIT_EXCEEDED` sin generar archivo parcial. `=100` → 200 con 17 páginas (6+6+…+4). `=0` nunca llega (Zod `min(1)`). |
| RN-009 | Batch es atómico en validación: si un solo `id` no es `APROBADA` o no existe, **ningún** adhesivo del lote se genera (409 o 404). |
| RN-010 | Scoping batch para censista: si `role=censista`, todos los `ids` DEBEN pertenecer a `created_by_user_id = actorId`; uno ajeno → 403 `FORBIDDEN_BATCH_ITEM`. Admin omite este check. |
| RN-011 | `helmet` headers obligatorios en toda respuesta (incluye `GET /verify`): `X-DNS-Prefetch-Control`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` si HTTPS. |
| RN-012 | `rate-limit` verify: ventana 60s, max 30 por IP; batch: ventana 60s, max 10 por `IP+userId`. Excedido → 429 con `Retry-After: <segundos>` y `code: RATE_LIMIT_EXCEEDED`. |
| RN-013 | Sanitización: todo `body`/`query`/`params` pasa por `xss` y strip de caracteres `$` y `{}`/`}` antes de Zod; payload malicioso no llega a DB. |
| RN-014 | Logo: `assets/logo-alcaldia.png` si existe se incrusta en PDF; si falta, se renderiza texto `Alcaldía de Sabanalarga` sin fallar. Check de existencia al boot con warn en log. |
| RN-015 | Flags: `STICKER_ENABLED=false` → `GET /sticker` y `POST /batch` retornan 404 `FEATURE_DISABLED`; `VERIFY_ENABLED=false` → `GET /verify` 404. Default `true`. |

---

## 9. Flujos y Diagramas de Estado

### Flujo 1-up

```text
GET /census-records/:id/sticker
 -> helmet headers
 -> authMiddleware 401 si no JWT (excepto verify)
 -> roleMiddleware admin|censista
 -> Zod params {id: uuid} 400 si inválido
 -> rateLimit batch 10/min 429 si excede
 -> load record by id
   -> 404 si no existe
   -> 403 si censista no es dueño
   -> 409 STICKER_NOT_ELIGIBLE si status !== APROBADA
   -> 404 FEATURE_DISABLED si STICKER_ENABLED=false
 -> tx: if sticker_folio null → randomUUID() + update + audit STICKER_GENERATED
 -> StickerRenderer 1-up: folio, placa, fecha, logo, QR(verify URL) → doc.pipe(res)
 <- 200 application/pdf attachment
```

### Flujo batch 6-up

```text
POST /stickers/batch {ids: uuid[]}
 -> helmet + auth + role
 -> validate(batchSchema) 400 si no uuid/min1/max100/unique
 -> rateLimit batch 10/min
 -> if ids.length >100 → 400 BATCH_LIMIT_EXCEEDED
 -> load records WHERE id IN (ids)
   -> if count < ids.length → 404 con missingIds
   -> if any status !== APROBADA → 409 con ineligibleIds
   -> if censista y alguno not owner → 403
 -> tx: generar folio para los null (batch update) + audit STICKER_BATCH_GENERATED
 -> BatchSheetRenderer A4 6-up (2 cols × 3 filas, crop-marks, gap 10mm) streaming
 <- 200 application/pdf attachment
```

### Flujo verify público

```text
GET /verify/:folio
 -> helmet
 -> Zod params {folio: uuid} 400 si no uuid
 -> rateLimit verify 30/min por IP 429 si excede
 -> if VERIFY_ENABLED=false → 404 FEATURE_DISABLED
 -> findByFolio(folio)
   -> null → audit VERIFY_HIT miss + 404 FOLIO_NOT_FOUND
   -> found → audit VERIFY_HIT hit + 200 {folio, placa, estado:"APROBADA", fechaAprobacion, verificadoEn: now()}
```

### Estado de sticker_folio

```text
NULL (pre-APROBADA o APROBADA sin generar)
  → GET /sticker primera vez → uuid v4 + persistido → FOLIADO
FOLIADO → GET /sticker n veces → mismo folio (idempotente)
FOLIADO → GET /verify/:folio → 200 DTO sin PII
NULL → GET /verify/:folio aleatorio → 404
```

---

## 10. Casos Límite y Errores

| Caso | Comportamiento |
|------|----------------|
| `GET /sticker` sin JWT | 401 `UNAUTHORIZED` |
| `GET /sticker` censista sobre registro ajeno | 403 `FORBIDDEN` |
| `GET /sticker` con `id` no uuid | 400 `VALIDATION_ERROR` (Zod) |
| `GET /sticker` registro no existe | 404 `RECORD_NOT_FOUND` |
| `GET /sticker` registro en `PENDIENTE`/`EN_PROCESO`/`COMPLETADO`/`EN_REVISION`/`RECHAZADO` | 409 `STICKER_NOT_ELIGIBLE` |
| `GET /sticker` con `STICKER_ENABLED=false` | 404 `FEATURE_DISABLED` |
| `GET /sticker` doble concurrente sobre mismo APROBADA null folio | Uno genera folio, otro reutiliza (transacción `BEGIN IMMEDIATE` + `FOR UPDATE`) |
| `POST /batch` sin JWT | 401 |
| `POST /batch` con `ids` no array o vacío | 400 `VALIDATION_ERROR` |
| `POST /batch` con `ids` duplicados | 400 `DUPLICATE_IDS` |
| `POST /batch` con `ids.length = 101` | 400 `BATCH_LIMIT_EXCEEDED` |
| `POST /batch` con `ids` que incluye no uuid | 400 `VALIDATION_ERROR` |
| `POST /batch` con `ids` incluye registro inexistente | 404 con `missingIds[]` |
| `POST /batch` con `ids` incluye no APROBADA | 409 `STICKER_NOT_ELIGIBLE` con `ineligibleIds[]` |
| `POST /batch` censista con `id` ajeno en lote | 403 `FORBIDDEN_BATCH_ITEM` |
| `POST /batch` con `STICKER_ENABLED=false` | 404 `FEATURE_DISABLED` |
| `GET /verify/:folio` con folio no uuid (`abc`) | 400 `VALIDATION_ERROR` |
| `GET /verify/:folio` uuid válido inexistente | 404 `FOLIO_NOT_FOUND` + audit miss |
| `GET /verify/:folio` con `VERIFY_ENABLED=false` | 404 `FEATURE_DISABLED` |
| `GET /verify/:folio` 31ª req en 60s misma IP | 429 `RATE_LIMIT_EXCEEDED` con `Retry-After` |
| `POST /batch` 11ª req en 60s mismo usuario | 429 con `Retry-After` |
| Payload con `{"$gt":""}` o `<script>` | Sanitizado + Zod; no llega a DB; 400 si rompe schema |
| Logo faltante `assets/logo-alcaldia.png` | PDF con texto fallback, warn en log, 200 igual |
| `GET /verify` expone PII (regresión) | Snapshot test falla; build bloqueado |

---

## 11. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Entrega Adhesivos

  Background:
    Given existe período ACTIVO y registro R1 en APROBADA con placa "ABC123"
    And existe admin A1 y censista C1 dueño de R1 y censista C2 no dueño

  Scenario: APROBADA genera PDF 1-up con folio y QR
    Given R1 está en APROBADA con sticker_folio null
    When A1 envía GET /census-records/R1/sticker con JWT admin
    Then recibe 200 con Content-Type application/pdf y Content-Disposition attachment
    And el PDF contiene folio uuid v4, placa "ABC123", fecha, logo y QR https://censo.sabanalarga.gov.co/verify/:folio
    And R1 ahora tiene sticker_folio seteado y audit STICKER_GENERATED

  Scenario: Segunda generación reutiliza mismo folio
    Given R1 ya tiene sticker_folio "550e8400-e29b-41d4-a716-446655440000"
    When A1 envía GET /census-records/R1/sticker nuevamente
    Then recibe 200 con el mismo folio
    And no se genera folio nuevo

  Scenario: No APROBADA retorna 409
    Given R1 está en EN_REVISION
    When A1 envía GET /census-records/R1/sticker
    Then recibe 409 con code STICKER_NOT_ELIGIBLE y currentStatus EN_REVISION

  Scenario: Censista dueño puede generar su adhesivo
    Given R1 fue creado por C1 y está en APROBADA
    When C1 envía GET /census-records/R1/sticker
    Then recibe 200 con PDF válido

  Scenario: Censista no dueño recibe 403
    When C2 envía GET /census-records/R1/sticker
    Then recibe 403

  Scenario: Sin auth retorna 401 en sticker
    When se envía GET /census-records/R1/sticker sin Authorization
    Then recibe 401

  Scenario: Batch 6-up A4 con 6 APROBADAS
    Given existen 6 registros APROBADOS con ids [R1..R6]
    When A1 envía POST /stickers/batch con {ids:[R1..R6]}
    Then recibe 200 con PDF A4 6-up (2 cols × 3 filas) con crop-marks
    And cada celda contiene su folio, placa y QR

  Scenario: Batch cap 100
    Given se envían 101 ids
    When A1 envía POST /stickers/batch con 101 ids
    Then recibe 400 con code BATCH_LIMIT_EXCEEDED

  Scenario: Batch con un no APROBADA falla atómico
    Given 2 ids APROBADOS y 1 en RECHAZADO
    When A1 envía POST /stickers/batch con los 3 ids
    Then recibe 409 con ineligibleIds que incluye el RECHAZADO
    And ningún folio nuevo se genera

  Scenario: Batch censista con id ajeno falla 403
    Given C1 es dueño de R1 pero no de R2
    When C1 envía POST /stickers/batch con [R1,R2]
    Then recibe 403 con code FORBIDDEN_BATCH_ITEM

  Scenario: Verify público sin auth retorna DTO sin PII
    Given R1 tiene folio "550e8400-e29b-41d4-a716-446655440000"
    When se envía GET /verify/550e8400-e29b-41d4-a716-446655440000 sin Authorization
    Then recibe 200 con {folio, placa, estado:"APROBADA", fechaAprobacion, verificadoEn}
    And no contiene cedula, nombre ni telefono

  Scenario: Verify folio inexistente retorna 404
    When se envía GET /verify/00000000-0000-4000-a000-000000000000
    Then recibe 404 con code FOLIO_NOT_FOUND

  Scenario: Verify folio no uuid retorna 400
    When se envía GET /verify/abc-no-uuid
    Then recibe 400 con code VALIDATION_ERROR

  Scenario: Helmet headers presentes
    When se envía GET /verify/:folio válido
    Then la respuesta incluye X-Content-Type-Options: nosniff y X-Frame-Options: SAMEORIGIN

  Scenario: Rate-limit verify 30/min
    Given se enviaron 30 GET /verify/:folio desde misma IP en 60s
    When se envía el 31º GET /verify/:folio
    Then recibe 429 con code RATE_LIMIT_EXCEEDED y header Retry-After

  Scenario: Rate-limit batch 10/min
    Given se enviaron 10 POST /stickers/batch desde mismo usuario en 60s
    When se envía el 11º POST /stickers/batch
    Then recibe 429 con Retry-After

  Scenario: Zod rechaza body batch inválido
    When se envía POST /stickers/batch con {ids:"no-array"} o {ids:[]}
    Then recibe 400 con details de Zod

  Scenario: Sanitización bloquea NoSQL/XSS
    When se envía POST /stickers/batch con body que contiene {"$gt":""} o "<script>"
    Then el payload es sanitizado y la validación Zod falla con 400 sin llegar a DB

  Scenario: Flags deshabilitados retornan 404
    Given STICKER_ENABLED=false
    When se envía GET /census-records/R1/sticker
    Then recibe 404 con code FEATURE_DISABLED
    Given VERIFY_ENABLED=false
    When se envía GET /verify/:folio
    Then recibe 404 FEATURE_DISABLED
```

---

## 12. Estrategia de Pruebas

### Pruebas Unitarias
- `stickerFolio` generation: `randomUUID()` uuid v4, único, idempotente si ya existe.
- `StickerRenderer` 1-up: folio/placa/fecha/logo/QR con `pdfkit` mock y `qrcode` stub.
- `BatchSheetRenderer` 6-up: layout 2×3, crop-marks, paginado (6→1 pág, 7→2 págs, 100→17 págs).
- `Zod` schemas: `paramsSchema {id: uuid}`, `batchSchema {ids: uuid[].min1.max100.unique}`, `folioSchema {folio: uuid}`.
- `sanitize` middleware: strip `$`/`${}`/`{}` y `xss` limpio.
- `audit` helpers: `STICKER_GENERATED`/`VERIFY_HIT` payload.

### Pruebas de Integración
- `GET /sticker` happy 200 PDF `%PDF` header, folio persistido, 409 si no APROBADA, 403 si censista ajeno, 401 sin auth, 404 FEATURE_DISABLED.
- `POST /batch` happy 6-up PDF válido, 400 >100, 409 ineligible, 404 missing, 403 censista ajeno, 429 rate-limit.
- `GET /verify/:folio` público 200 sin PII (snapshot DTO), 404 miss, 400 no uuid, 429 rate-limit, `helmet` headers en respuesta.
- `helmet` + `rate-limit` por ruta: conteo aislado verify vs batch, `Retry-After` presente.
- `Zod` + sanitización: payload malicioso 400 sin tocar DB.
- Concurrencia: dos `GET /sticker` simultáneos sobre mismo APROBADA null → un solo folio (tx `BEGIN IMMEDIATE`).
- Persistencia: índice único `sticker_folio` parcial, sin duplicados.

### Pruebas End-to-End (E2E)
- Flujo admin: aprobar registro → `GET /sticker` → descargar PDF → escanear QR → `GET /verify/:folio` público → ver DTO sin PII → lote 6 → imprimir A4.
- Flujo censista dueño vs no dueño: verificar 403 en ajeno.
- Deploy limpio: `README` + `docs/deployment.md` + `docs/backup.md` siguen pasos y app arranca con `STICKER_ENABLED=true`.

### Criterio de Cobertura
- Cobertura mínima 85% en `src/domain/entities/CensusRecord.ts`, `src/application/use-cases/*Sticker*`, `*Verify*`, `src/infrastructure/export/Sticker*`, `src/presentation/routes/sticker.routes.ts`, `verify.routes.ts`, `middlewares/validate.ts`, `helmet`/`rateLimit` config.
- Todos los 19 escenarios Gherkin DEBEN tener al menos una prueba automatizada (unit o integración).
- Tests obligatorios: PII leak snapshot, folio único índice, rate-limit 429, Zod 400, helmet headers, cap 100, 409 gating.

---

## 13. Dependencias y Rollback

- Depende de 006 (`census_records` + `status`), 008 (estados PENDIENTE…APROBADA, solo APROBADA elegible) y 010 (`PdfExporter`, `audit_logs` append-only, `CACHE_VERSION` no aplica).
- Deps npm: `qrcode`, `helmet`, `express-rate-limit`, `zod`, `xss` (ya `pdfkit` por 010).
- Flags `STICKER_ENABLED` / `VERIFY_ENABLED` (default `true` en prod tras QA) → 404 si `false`. Down de migración solo si `sticker_folio` null en todos los registros (chequeo `SELECT COUNT(*) WHERE sticker_folio IS NOT NULL = 0`).
- Riesgos: OOM lote 100 mitigado por streaming+cap; QR enumerable mitigado por uuid 122-bit + DB check; PII leak mitigado por DTO snapshot; rate-limit FP mitigado por ventana por IP; logo faltante mitigado por fallback texto.

---

## 14. Referencias

- Stack: Node.js + TypeScript + Express + TypeORM + SQLite, React Vite Tailwind, pdfkit, qrcode.
- Módulos previos: 006 Census Records, 008 Validation (APROBADA), 010 Cierre Integral (PdfExporter, audit_logs).
- Ley 1581 de 2012 — verify sin PII.
- Proposal: `openspec/changes/011-entrega-adhesivos/proposal.md`.
