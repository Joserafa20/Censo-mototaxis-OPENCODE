# SPEC 009 — Habeas Data Consent & Evidential Photos

## 1. Objetivo

Garantizar cumplimiento de la Ley 1581 de 2012 incorporando a cada `CensusRecord` la prueba de consentimiento informado previo (checkbox + firma del conductor capturados en tablet) y un set opcional de fotos evidenciales con validación de formato y tamaño. Retención permanente sin flujo de supresión.

---

## 2. Contexto y Justificación

Sin este módulo no existe trazabilidad legal del consentimiento: un registro podría crearse sin autorización verificable. La solución hace obligatorio el consentimiento al crear/editar y permite fotos opcionales con validación estricta de MIME y tamaño, excluyéndolas de reportes agregados (007) para evitar fuga de PII. Decisiones: consentimiento obligatorio, fotos opcionales, MIME limitado a `jpeg/png/webp`, límite 5 MB por archivo y máximo 5 fotos, sin revocación ni borrado programado.

Stack: Node.js + TypeScript + Express + TypeORM + SQLite, React Vite Tailwind. Clean Architecture.

Dependencias:
- **006 Census Records**: provee `census_records` y flujo CRUD.
- **008 Validation**: superficie de lectura; el consentimiento se valida también en `submit` (`EN_PROCESO -> COMPLETADO`).
- Infra: `multer` para multipart, `EVIDENCE_STORAGE_PATH` para persistencia.

---

## 3. Alcance

### In Scope

- Campos `consentGiven: boolean` DEBE ser `true`, `consentSignature: string` no vacía 3–200 caracteres, `consentDate: Date` seteada por servidor al momento de creación/confirmación.
- Campo `evidencePhotos: string[]` URLs relativas, cardinalidad 0..5, persistido como JSON.
- Validación de MIME permitidos `image/jpeg`, `image/png`, `image/webp` (extensiones `jpg|jpeg|png|webp`) y tamaño máximo 5 MB por archivo. Rechazo con 422 si MIME inválido, 413 si excede tamaño.
- Extensión de dominio + TypeORM (`census_records` + migración aditiva) y errores `InvalidConsentError`, `InvalidEvidencePhotoError`.
- Reglas de API: `POST /census-records` exige consentimiento válido; `POST /census-records/:id/evidence` multipart para adjuntar fotos.
- Exposición en detalle de registro (`GET /census-records/:id`); exclusión explícita de `007` summary/export.
- Retención permanente: ningún job de borrado/anonimización toca `consent*` ni `evidencePhotos`.

### Out of Scope

- Revocación/supresión del consentimiento, anonimización o borrado temporal.
- Verificación criptográfica o biométrica de firma, OCR de firma, almacenamiento S3.
- Backfill retroactivo de registros pre-009 (quedan sin consentimiento; no se migran).
- Gestión de licencias/documentos legales fuera de foto evidencial genérica.

---

## 4. Actores y Permisos

| Actor | Rol sistema | Permisos en este módulo |
|-------|-------------|-------------------------|
| **Censista** | `censista` | Capturar `consentGiven` + `consentSignature` al crear/editar registro propio. Adjuntar fotos evidenciales a registros propios vía `POST /:id/evidence`. Consultar consentimiento y fotos de sus registros. |
| **Administrador** | `admin` | Consultar `consentGiven`, `consentSignature`, `consentDate` y `evidencePhotos` de cualquier registro (detalle). No captura consentimiento en nombre de otro. Audita trazabilidad (`consentDate` + `createdByUserId`). |
| **Sistema** | — | Setear `consentDate` en servidor, validar `isValidConsent()` y `isValidEvidenceMime()`, persistir `evidencePhotos` como JSON, rechazar con 422/413. |
| **No autenticado** | — | 401 en todos los endpoints de este módulo. |

> Principio: el censista captura bajo supervisión presencial; el admin solo visualiza/audita. Sin suplantación.

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE exigir `consentGiven === true` al crear (`POST /census-records`) y al actualizar consentimiento; si es `false` o ausente retorna 422 `INVALID_CONSENT` | Alta |
| RF-002 | El sistema DEBE exigir `consentSignature` string no vacía, trim >= 3 y <= 200 caracteres; vacía o fuera de rango retorna 422 `INVALID_SIGNATURE` | Alta |
| RF-003 | El sistema DEBE setear `consentDate` en servidor (`NOW()`) al persistir consentimiento válido; el cliente NO puede enviar este campo (se ignora si viene) | Alta |
| RF-004 | El sistema DEBE persistir `evidencePhotos` como array de URLs `string[]` con cardinalidad 0..5; 0 es válido (sin foto OK) | Alta |
| RF-005 | El sistema DEBE validar MIME de cada foto contra `image/jpeg`, `image/png`, `image/webp`; MIME no permitido retorna 422 `INVALID_EVIDENCE_MIME` | Alta |
| RF-006 | El sistema DEBE rechazar archivo > 5 MB con 413 `PAYLOAD_TOO_LARGE` y rechazar acumulación que exceda 5 fotos con 422 `EVIDENCE_LIMIT_EXCEEDED` | Alta |
| RF-007 | El sistema DEBE exponer `POST /census-records/:id/evidence` multipart (`field: photos`) solo para censista propietario o admin lector; valida MIME/tamaño antes de append | Alta |
| RF-008 | El sistema DEBE incluir `consentGiven`, `consentSignature`, `consentDate`, `evidencePhotos` en `GET /census-records/:id` y en respuesta de creación | Alta |
| RF-009 | El sistema DEBE excluir `consentSignature` y `evidencePhotos` del summary y export de 007 (reportes agregados) | Alta |
| RF-010 | El sistema DEBE retornar 422 con `code` y `details[]` para errores de consentimiento/MIME y 413 para tamaño excedido | Alta |
| RF-011 | El sistema DEBE mantener retención permanente: ningún proceso de borrado/anonimización elimina `consent*` ni `evidencePhotos` | Alta |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | Validación de consentimiento y MIME DEBE responder en < 100 ms (sin I/O externo) | Rendimiento |
| RNF-002 | Upload de foto 5 MB DEBE completarse en < 2 s en red local tablet-servidor | Rendimiento |
| RNF-003 | `consentDate` y `evidencePhotos` DEBEN ser inmutables salvo append controlado de fotos (append-only para fotos) | Confiabilidad |
| RNF-004 | Almacenamiento de fotos en filesystem local (`EVIDENCE_STORAGE_PATH`) con nombres únicos (UUID + extensión) | Seguridad |
| RNF-005 | Cobertura del módulo >= 85% | Calidad |
| RNF-006 | Endpoints DEBEN validar JWT y rol antes de lógica de negocio | Seguridad |

---

## 6. Modelo de Datos

### 6.1 Extensión de `census_records` — 4 columnas nuevas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `consent_given` | BOOLEAN NOT NULL DEFAULT 0 | Consentimiento otorgado (DEBE ser 1 para registro válido post-009) |
| `consent_signature` | TEXT NOT NULL DEFAULT '' | Firma textual / trazo serializado del conductor (3–200 chars) |
| `consent_date` | DATETIME NULL | Timestamp servidor de otorgamiento (NULL solo en registros pre-009) |
| `evidence_photos` | TEXT NULL | JSON array de URLs relativas `string[]`, ej. `["/evidence/<uuid>.jpg"]` (NULL = 0 fotos) |

```sql
-- Migración aditiva (SQLite)
ALTER TABLE census_records ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE census_records ADD COLUMN consent_signature TEXT NOT NULL DEFAULT '';
ALTER TABLE census_records ADD COLUMN consent_date DATETIME NULL;
ALTER TABLE census_records ADD COLUMN evidence_photos TEXT NULL;
-- Rollback: DROP COLUMN x4 (SQLite recreate) — ver §13
```

Notas:
- SQLite `evidence_photos` se parsea en aplicación (`JSON.parse`); TypeORM `simple-json` o `text` + transformer.
- Registros pre-009 quedan con `consent_given=0`, `consent_signature=''`, `consent_date=NULL`; no se backfillean.
- Índice no requerido sobre estas columnas (no son criterio de búsqueda).

### 6.2 Entidad de dominio

```typescript
CensusRecord += {
  consentGiven: boolean;        // MUST true
  consentSignature: string;     // 3..200 chars, trimmed non-empty
  consentDate: Date | null;     // server-set, null pre-009
  evidencePhotos: string[];     // 0..5 URLs
}
helpers: isValidConsent(given, signature) => boolean
         isValidEvidenceMime(mime: string) => mime in ALLOWED_MIMES
         isValidEvidenceSize(bytes: number) => bytes <= 5*1024*1024
```

---

## 7. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | Sin consentimiento no hay registro: `consentGiven !== true` o `consentSignature` vacía/<3/>200 retorna 422 `INVALID_CONSENT` / `INVALID_SIGNATURE`. El servidor no corrige ni asume consentimiento. |
| RN-002 | `consentDate` es autoridad del servidor: se ignora cualquier valor enviado por cliente; se setea `new Date()` al persistir consentimiento válido. No es editable posteriormente. |
| RN-003 | Sin foto es válido: `evidencePhotos` 0 elementos es estado legal; el flujo de creación y `submit` (008) NO bloquea por ausencia de fotos. |
| RN-004 | MIME estricto: solo `image/jpeg`, `image/png`, `image/webp` permitidos. Cualquier otro (`image/gif`, `application/pdf`, `image/svg+xml`, etc.) retorna 422 `INVALID_EVIDENCE_MIME` antes de persistir. Validación por MIME declarado + extensión. |
| RN-005 | Tamaño y conteo: archivo > 5 MB retorna 413 `PAYLOAD_TOO_LARGE`; append que haría `evidencePhotos.length > 5` retorna 422 `EVIDENCE_LIMIT_EXCEEDED`. Límites por archivo y por registro. |
| RN-006 | Retención permanente: `consentGiven`, `consentSignature`, `consentDate`, `evidencePhotos` nunca se borran ni anonimizan por jobs de 007 u otros; exclusión de reportes es solo de lectura. |
| RN-007 | Exclusión de 007: `GET /reports/summary` y exports agregados NO incluyen `consentSignature` ni `evidencePhotos`; solo `GET /census-records/:id` las expone. |
| RN-008 | Propiedad: `POST /:id/evidence` solo sobre registros propios para censista; admin puede consultar pero no adjuntar en nombre de otro sin traza (se registra `createdByUserId`). |
| RN-009 | Feature flag: si `HABEAS_ENABLED=false`, validación de consentimiento se desactiva (solo para rollback temporal); por defecto `true`. |

---

## 8. Flujos y Diagramas de Estado

### Flujo de Creación con Consentimiento

```text
Censista envía POST /api/v1/census-records { ..., consentGiven, consentSignature, [photos] }
  → Sistema valida JWT y rol censista
  → Sistema valida consentGiven===true && 3<=signature.trim().length<=200
    → [Inválido] 422 INVALID_CONSENT / INVALID_SIGNATURE
  → Sistema setea consentDate = NOW() (ignora valor cliente)
  → Sistema valida período ACTIVO, unicidad cédula/placa, geografía (006)
  → Sistema valida fotos si vienen: MIME ∈ {jpeg,png,webp} y size <=5MB y count <=5
    → [MIME inválido] 422 INVALID_EVIDENCE_MIME
    → [Size >5MB] 413 PAYLOAD_TOO_LARGE
  → Persiste census_records con 4 cols nuevas → 201 Created con consent* + evidencePhotos
```

### Flujo de Adjuntar Evidencia

```text
Censista envía POST /api/v1/census-records/:id/evidence multipart (photos: File[])
  → Sistema verifica registro existe y pertenece a censista (o admin consulta)
  → Para cada archivo: valida MIME y size
    → [MIME inválido] 422, ningún archivo persiste (atómico)
    → [>5 fotos total] 422 EVIDENCE_LIMIT_EXCEEDED
    → [>5MB] 413
  → Guarda archivos en EVIDENCE_STORAGE_PATH/<uuid>.<ext>
  → Append URLs a evidence_photos JSON → 200 { evidencePhotos: [...] }
```

### Flujo de Consulta

```text
GET /api/v1/census-records/:id
  → Retorna registro con consentGiven, consentSignature, consentDate, evidencePhotos
GET /api/v1/reports/summary (007)
  → Retorna agregados SIN consentSignature ni evidencePhotos
```

Estados: sin máquina de estados propia; `consentDate` es inmutable tras seteo. `evidencePhotos` solo crece por append hasta 5.

---

## 9. Casos Límite y Errores

| Caso | Comportamiento Esperado |
|------|------------------------|
| `consentGiven: false` o ausente en POST | 422 `INVALID_CONSENT`: "El consentimiento es obligatorio (Ley 1581)" |
| `consentSignature: ""` o solo espacios | 422 `INVALID_SIGNATURE`: "La firma no puede estar vacía" |
| `consentSignature` 2 caracteres | 422 `INVALID_SIGNATURE_TOO_SHORT` (mínimo 3) |
| `consentSignature` 201 caracteres | 422 `INVALID_SIGNATURE_TOO_LONG` (máximo 200) |
| Cliente envía `consentDate` arbitraria | Se ignora; servidor setea `NOW()` |
| Sin fotos (0) | 201/200 válido; `evidencePhotos: []` |
| MIME `image/gif` / `application/pdf` / `image/svg+xml` | 422 `INVALID_EVIDENCE_MIME` |
| Archivo 5.1 MB | 413 `PAYLOAD_TOO_LARGE` |
| Sexta foto (ya hay 5) | 422 `EVIDENCE_LIMIT_EXCEEDED` |
| `POST /:id/evidence` sobre registro ajeno (censista) | 403 `FORBIDDEN` / `NOT_OWNER` |
| Registro pre-009 sin consentimiento consultado | Retorna con `consentGiven: false`, `consentDate: null` (lectura tolerante) |
| `HABEAS_ENABLED=false` | POST sin consentimiento pasa (rollback temporal) |

---

## 10. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Habeas Data Consent & Evidential Photos

  Background:
    Given existe período "2026-01" ACTIVO
    And existe corregimiento "Cascajal" ACTIVO
    And existe censista "C1" y admin "A1" autenticados

  Scenario: Crear registro con consentimiento válido
    Given C1 está autenticado
    When POST /census-records con consentGiven true y consentSignature "Juan Pérez 123"
    Then recibe 201 con consentGiven true y consentDate seteada por servidor
    And GET /census-records/:id retorna los mismos consentGiven, consentSignature y consentDate

  Scenario: Rechazo sin consentimiento
    Given C1 está autenticado
    When POST /census-records con consentGiven false
    Then recibe 422 con code INVALID_CONSENT

  Scenario: Rechazo con firma vacía
    Given C1 está autenticado
    When POST /census-records con consentGiven true y consentSignature ""
    Then recibe 422 con code INVALID_SIGNATURE

  Scenario: Rechazo con firma muy corta
    Given C1 está autenticado
    When POST /census-records con consentGiven true y consentSignature "AB"
    Then recibe 422 con code INVALID_SIGNATURE_TOO_SHORT

  Scenario: Rechazo con firma muy larga
    Given C1 está autenticado
    When POST /census-records con consentGiven true y consentSignature de 201 caracteres
    Then recibe 422 con code INVALID_SIGNATURE_TOO_LONG

  Scenario: consentDate es autoridad del servidor
    Given C1 envía consentDate "2020-01-01T00:00:00Z" en el payload
    When POST /census-records con consentGiven true y consentSignature válida
    Then recibe 201 con consentDate cercana a NOW() del servidor y no "2020-01-01"

  Scenario: Crear sin fotos es válido
    Given C1 está autenticado
    When POST /census-records con consentGiven true, firma válida y sin fotos
    Then recibe 201 con evidencePhotos []

  Scenario: Adjuntar foto con MIME válido
    Given existe registro "R1" creado por C1
    When POST /census-records/R1/evidence con archivo image/jpeg de 1 MB
    Then recibe 200 con evidencePhotos de longitud 1 y URL terminada en .jpg

  Scenario: Rechazo por MIME no permitido
    Given existe registro "R1" creado por C1
    When POST /census-records/R1/evidence con archivo image/gif
    Then recibe 422 con code INVALID_EVIDENCE_MIME

  Scenario: Rechazo por tamaño excedido
    Given existe registro "R1" creado por C1
    When POST /census-records/R1/evidence con archivo image/png de 6 MB
    Then recibe 413 con code PAYLOAD_TOO_LARGE

  Scenario: Límite de 5 fotos
    Given R1 ya tiene 5 fotos
    When POST /census-records/R1/evidence con 1 foto más válida
    Then recibe 422 con code EVIDENCE_LIMIT_EXCEEDED

  Scenario: Admin visualiza consentimiento y fotos
    Given R1 fue creado por C1 con consentimiento y 2 fotos
    When A1 hace GET /census-records/R1
    Then recibe 200 con consentGiven, consentSignature, consentDate y evidencePhotos con 2 URLs

  Scenario: Reportes 007 excluyen PII evidencial
    Given existen registros con consentSignature y evidencePhotos
    When A1 hace GET /reports/summary
    Then la respuesta NO contiene consentSignature ni evidencePhotos

  Scenario: Retención permanente
    Given existe job de anonimización/borrado programado
    When el job ejecuta
    Then consentGiven, consentSignature, consentDate y evidencePhotos permanecen intactos
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias

- `isValidConsent(given, signature)`: true solo si `given===true && 3<=trimmed.length<=200`; casos: false, null, "", "AB", 201 chars, 200 chars OK, espacios.
- `isValidEvidenceMime(mime)`: acepta `image/jpeg`, `image/png`, `image/webp`; rechaza `image/gif`, `application/pdf`, `image/svg+xml`, `text/plain`, vacío.
- `isValidEvidenceSize(bytes)`: <=5 MB OK, 5 MB +1 byte falla.
- `validateEvidenceCount(current, incoming)`: `current + incoming <=5`.
- `consentDate` factory: ignora input cliente, setea `new Date()` (mock clock).
- Helpers de mensaje de error por código (`INVALID_CONSENT`, `INVALID_SIGNATURE`, etc.).

### Pruebas de Integración

- `POST /census-records` sin `consentGiven` → 422; con `consentGiven:true` + firma válida → 201 y persistencia verificada en DB (`consent_given=1`, `consent_date` no null, `evidence_photos` JSON).
- `POST /census-records` con `image/gif` → 422 `INVALID_EVIDENCE_MIME`; con `image/jpeg` → 201.
- `POST /census-records/:id/evidence` multipart: 1 jpeg 1 MB → 200 y archivo en `EVIDENCE_STORAGE_PATH`; 6 MB → 413; sexta foto → 422.
- `GET /census-records/:id` incluye 4 campos nuevos; `GET /reports/summary` los excluye.
- `evidencePhotos` 0..5: crear sin fotos → `[]`; append incremental hasta 5 OK; 6ta falla.
- Retrocompatibilidad: registro pre-009 leído sin error (`consentDate null` tolerado).

### Pruebas End-to-End (E2E)

- Flujo completo censista: login → crear registro con consentimiento + 2 fotos → verificar detalle → admin consulta mismo registro → verificar 007 no expone PII.
- Flujo rechazo: intentar crear sin consentimiento → 422 → corregir con consentimiento → 201.

### Criterio de Cobertura

- Cobertura mínima: 85% en `src/domain/value-objects/*` (consent/evidence) y `src/application/use-cases/*` (Create/Update + Evidence).
- Todos los escenarios Gherkin DEBEN tener prueba automatizada (unit o integración).

---

## 12. Consideraciones de Arquitectura (Clean Architecture)

```
src/domain/
├── entities/CensusRecord.ts                 // += consentGiven, consentSignature, consentDate, evidencePhotos
├── value-objects/Consent.ts                 // isValidConsent(), ConsentErrors
└── value-objects/EvidencePhoto.ts           // isValidEvidenceMime(), isValidEvidenceSize(), ALLOWED_MIMES

src/application/
├── use-cases/CreateCensusRecordUseCase.ts   // + guard consent + MIME
├── use-cases/UpdateCensusRecordUseCase.ts   // + guard consent
└── use-cases/AddEvidencePhotosUseCase.ts    // MIME/size/count + append

src/infrastructure/
├── database/entities/CensusRecordEntity.ts  // 4 cols + transformer JSON
└── storage/FileEvidenceStorage.ts           // guarda en EVIDENCE_STORAGE_PATH

src/presentation/
├── controllers/CensusRecordController.ts
├── routes/censusRecord.routes.ts            // POST / y POST /:id/evidence (multer)
└── middlewares/validateHabeas.ts            // opcional, delega a use-case
```

- Casos de uso orquestan: validar JWT/rol → validar consentimiento → validar MIME/size → persistir en transacción → retornar DTO con `consentDate` servidor.
- Validación de MIME antes de tocar filesystem (fail-fast).
- `CensusRecordEntity` usa `evidence_photos TEXT` + transformer `JSON.stringify/parse`.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Registro sin consentimiento por bypass cliente | Validación servidor obligatoria 422; `consentDate` solo servidor |
| Firma falsificada | `consentDate` + `createdByUserId` + auditoría; sin verificación biométrica en este SPEC |
| Fuga PII fotos en reportes | Exclusión explícita en 007; test de integración que aserta ausencia |
| Bloat storage | Límite 5 MB/archivo, máx 5, 413; sin S3 en este alcance |
| SQLite JSON frágil | Transformer app-side + validación de parse |
| Backfill rompe registros antiguos | No backfill; lectura tolerante con defaults |

---

## 14. Referencias

- Stack: Node.js + TypeScript + Express + TypeORM + SQLite, React Vite Tailwind
- Módulos previos: 006 Census Records, 007 Reports, 008 Validation
- Ley 1581 de 2012 — Habeas Data (Colombia)
- Config: `EVIDENCE_STORAGE_PATH`, `HABEAS_ENABLED` (flag rollback)

