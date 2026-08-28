# SPEC 008 — Validación y Cierre de Censos

## 1. Objetivo

Definir el workflow de validación y cierre del Sistema de Censo de Mototaxis de Sabanalarga. Este módulo extiende los estados del registro censal (`006 Census Records`) y del período (`003 Census Periods`) para incorporar un ciclo de revisión con trazabilidad, separación de responsabilidades censista/admin y bloqueo por cierre de período, manteniendo Clean Architecture y compatibilidad con `007 Reports`.

---

## 2. Contexto y Justificación

Los módulos previos permiten crear y consultar registros pero no garantizan calidad ni cierre controlado:

- Sin validación, un `census_record` incompleto puede considerarse definitivo.
- Sin separación de roles, no hay segunda mirada (revisión) sobre datos sensibles.
- Sin cierre de período, los reportes (007) nunca se congelan y los datos quedan mutables indefinidamente.

Este módulo introduce una máquina de estados explícita con validaciones automáticas al completar y reglas de cierre que congelan el período.

Stack: Node.js + TypeScript + Express + TypeORM + SQLite, React Vite Tailwind. Arquitectura: Clean Architecture.

Dependencias:
- **006 Census Records**: provee `census_records` y estados base `PENDIENTE / EN_PROCESO / COMPLETADO` (equivalentes a `pending / in_progress / completed`).
- **003 Census Periods**: provee `census_periods` con estado `ACTIVO / CERRADO`.
- **007 Reports**: consumidor; debe excluir o marcar registros no `APROBADO` según filtro.

---

## 3. Alcance

### In Scope
- Extensión del enum de estado de `census_records` a 6 estados: `PENDIENTE`, `EN_PROCESO`, `COMPLETADO`, `EN_REVISION`, `APROBADO`, `RECHAZADO`.
- Matriz de transiciones con control por rol.
- Validaciones automáticas al intentar `COMPLETADO` (cédula, placa, período ACTIVO, geografía activa).
- Workflow de revisión admin: `COMPLETADO -> EN_REVISION -> APROBADO | RECHAZADO`, con motivo obligatorio en rechazo y retorno a `EN_PROCESO`.
- Cierre de período por admin (`POST /census-periods/:id/close`) con precondición de no pendientes y efecto de bloqueo de `EN_REVISION`.
- Endpoints de transición: `submit`, `review`, `approve`, `reject`, `close`.
- Tabla opcional `census_validations` para auditoría de transiciones.
- UI de validación (bandeja de revisión, detalle con acciones, cierre de período).

### Out of Scope
- Edición de datos del mototaxista/moto fuera del flujo de corrección post-rechazo (sigue en 006).
- Firma digital o validación externa (Registraduría / RUNT).
- Reapertura de período cerrado (requeriría SPEC futuro con justificación y auditoría).
- Notificaciones push/email al censista tras aprobación/rechazo (solo log/auditoría en este SPEC).
- Validación de foto/documento con IA o almacenamiento de imágenes (foto opcional, no bloqueante).

---

## 4. Actores y Permisos

| Actor | Rol sistema | Permisos en este módulo |
|-------|-------------|-------------------------|
| **Censista** | `censista` | Crear/editar sus registros en `PENDIENTE`/`EN_PROCESO`. Ejecutar `submit` (`EN_PROCESO -> COMPLETADO`) solo sobre registros propios. Consultar estado de sus registros. No puede ejecutar `review`/`approve`/`reject`/`close`. |
| **Administrador** | `admin` | Ejecutar `review`, `approve`, `reject` sobre cualquier registro. Ejecutar `close` sobre períodos. Consultar bandeja de validación completa. No puede ejecutar `submit` por censistas. |
| **Sistema** | — | Validar transiciones, validaciones automáticas, precondiciones de cierre, coherencia de período/geografía, registro en `census_validations` y `census_audit`. |
| **No autenticado** | — | 401 en todos los endpoints de este módulo. |

> Principio: separación de responsabilidades. El censista produce hasta `COMPLETADO`; solo admin valida y cierra.

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE extender el estado de `census_records` a `PENDIENTE`, `EN_PROCESO`, `COMPLETADO`, `EN_REVISION`, `APROBADO`, `RECHAZADO` | Alta |
| RF-002 | El sistema DEBE permitir al censista ejecutar `PATCH /census-records/:id/submit` para transicionar `EN_PROCESO -> COMPLETADO` solo sobre registros propios, tras validaciones automáticas | Alta |
| RF-003 | El sistema DEBE aplicar validaciones automáticas al intentar `COMPLETADO`: cédula válida (formato + unicidad), placa válida (formato + unicidad), período en `ACTIVO`, corregimiento/barrio en `ACTIVO` (si aplica), foto NO obligatoria | Alta |
| RF-004 | El sistema DEBE exponer `PATCH /census-records/:id/review` solo para admin: `COMPLETADO -> EN_REVISION` | Alta |
| RF-005 | El sistema DEBE exponer `PATCH /census-records/:id/approve` solo para admin: `EN_REVISION -> APROBADO` | Alta |
| RF-006 | El sistema DEBE exponer `PATCH /census-records/:id/reject` solo para admin: `EN_REVISION -> RECHAZADO`, con `motivo` obligatorio (10-500 caracteres) y transición automática `RECHAZADO -> EN_PROCESO` para corrección | Alta |
| RF-007 | El sistema DEBE registrar cada transición en `census_validations` (opcional pero recomendada) y en auditoría, con `from_status`, `to_status`, `actor_user_id`, `motivo` y `created_at` | Alta |
| RF-008 | El sistema DEBE exponer `POST /census-periods/:id/close` solo para admin, que valida que no existan registros en `PENDIENTE` o `EN_PROCESO` para ese período antes de cerrar | Alta |
| RF-009 | Al cerrar período, el sistema DEBE transicionar `census_periods.status` a `CERRADO` y bloquear toda transición posterior de registros en `EN_REVISION` dentro de ese período (retorna 409) | Alta |
| RF-010 | El sistema DEBE impedir cualquier mutación de `census_records` cuyo período esté `CERRADO`, excepto consulta | Alta |
| RF-011 | El sistema DEBE retornar 403 si el rol no tiene permiso para la transición, 404 si el registro/período no existe, 409 si la transición es inválida por estado actual o período cerrado, 422 si fallan validaciones automáticas | Alta |
| RF-012 | El sistema DEBE exponer bandeja de revisión filtrable `GET /census-records?status=COMPLETADO|EN_REVISION&periodId=` para admin y propia para censista | Media |
| RF-013 | El sistema DEBE incluir en `GET /census-records/:id` el historial de validaciones ordenado cronológicamente | Media |
| RF-014 | El sistema DEBE excluir registros no `APROBADO` de reportes oficiales cuando el período esté `CERRADO` (integración con 007) | Media |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | Transiciones DEBEN ser atómicas (transacción DB) y idempotentes si se reintenta mismo estado | Confiabilidad |
| RNF-002 | Validaciones automáticas en `submit` DEBEN responder en < 200 ms (incluye checks de unicidad con índices) | Rendimiento |
| RNF-003 | Auditoría de validaciones DEBE ser inmutable (append-only) | Cumplimiento |
| RNF-004 | Cobertura del módulo >= 85% | Calidad |
| RNF-005 | Endpoints DEBEN validar JWT y rol antes de lógica de negocio | Seguridad |
| RNF-006 | Cierre de período con hasta 10.000 registros DEBE completarse en < 2 s | Rendimiento |

---

## 6. Modelo de Datos

### 6.1 Extensión de `census_records`

```sql
-- Enum extendido (SQLite: CHECK constraint)
status TEXT CHECK(status IN ('PENDIENTE','EN_PROCESO','COMPLETADO','EN_REVISION','APROBADO','RECHAZADO')) NOT NULL DEFAULT 'PENDIENTE'

-- Campos existentes que participan en validación:
-- period_id FK -> census_periods.id
-- corregimiento_id FK -> corregimientos.id
-- neighborhood_id FK -> neighborhoods.id NULL
-- station_id FK -> stations.id NULL
-- mototaxi_cedula, motorcycle_plate (UNIQUE)
-- created_by_user_id FK -> users.id
-- is_active (mantener para compatibilidad; no usado en flujo de validación, pero registros inactivos se excluyen de cierre)
```

Migración: ampliar CHECK de `status` y crear índice `IDX_census_records_status_period (status, period_id)` si no existe. Backfill: mapear `pending -> PENDIENTE`, `in_progress -> EN_PROCESO`, `completed -> COMPLETADO` o mantener compat temporal con vista.

### 6.2 Extensión de `census_periods`

```sql
status TEXT CHECK(status IN ('ACTIVO','CERRADO')) NOT NULL DEFAULT 'ACTIVO'
closed_at TIMESTAMP NULL
closed_by_user_id UUID NULL FK -> users.id
```

`close` setea `status='CERRADO'`, `closed_at=NOW()`, `closed_by_user_id=:adminId` en transacción.

### 6.3 Tabla opcional `census_validations` (recomendada)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador |
| `census_record_id` | UUID FK -> census_records.id ON DELETE CASCADE | Registro |
| `period_id` | UUID FK -> census_periods.id | Denormalizado para queries de cierre |
| `from_status` | TEXT | Estado origen |
| `to_status` | TEXT | Estado destino |
| `actor_user_id` | UUID FK -> users.id | Quien ejecutó |
| `actor_role` | TEXT | `censista` \| `admin` |
| `reason` | VARCHAR(500) NULL | Motivo (obligatorio en RECHAZADO) |
| `metadata` | JSON NULL | Detalle de validaciones automáticas fallidas |
| `created_at` | TIMESTAMP | Momento |

Índices: `IDX_validations_record (census_record_id, created_at)`, `IDX_validations_period (period_id)`.

Alternativa si no se crea tabla: reusar `census_audit` con `action` extendido (`submit`, `review`, `approve`, `reject`, `close_period`). Este SPEC prefiere `census_validations` por semántica y queries de trazabilidad.

### 6.4 Diagrama de estados

```
PENDIENTE ──► EN_PROCESO ──► COMPLETADO ──► EN_REVISION ──┬──► APROBADO (final)
                                                        └──► RECHAZADO ──► EN_PROCESO (corrección)
                                                                       (motivo obligatorio)

Notas:
- PENDIENTE -> EN_PROCESO : censista (al iniciar edición) o sistema al crear
- EN_PROCESO -> COMPLETADO : solo censista vía submit (+ validaciones automáticas)
- COMPLETADO -> EN_REVISION : solo admin vía review
- EN_REVISION -> APROBADO : solo admin vía approve
- EN_REVISION -> RECHAZADO : solo admin vía reject (motivo) -> auto EN_PROCESO
- Ninguna transición permitida si period.status = CERRADO (excepto lectura)
- APROBADO es terminal (no sale); RECHAZADO es efímero (inmediato a EN_PROCESO)
```

---

## 7. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | Matriz de transiciones permitidas (únicas válidas): `PENDIENTE->EN_PROCESO`, `EN_PROCESO->COMPLETADO` (censista propio), `COMPLETADO->EN_REVISION` (admin), `EN_REVISION->APROBADO` (admin), `EN_REVISION->RECHAZADO` (admin+motivo), `RECHAZADO->EN_PROCESO` (automática). Cualquier otra retorna 409 `INVALID_TRANSITION`. |
| RN-002 | Validaciones automáticas en `EN_PROCESO->COMPLETADO`: (a) cédula formato colombiano 6-10 dígitos y única global, (b) placa formato `^[A-Z]{3}[0-9]{3}$` o `^[A-Z]{3}-[0-9]{3}$` normalizada y única, (c) `census_periods.status = ACTIVO` para `period_id` del registro, (d) `corregimientos.is_active = true` y si `neighborhood_id` no nulo entonces `neighborhoods.is_active = true`, (e) foto opcional: si se envía debe ser MIME imagen válida pero su ausencia NO bloquea. Si falla alguna, 422 con `code` y `details[]`. |
| RN-003 | Solo el `created_by_user_id` puede ejecutar `submit`; admin no puede suplantar. |
| RN-004 | Solo `admin` puede ejecutar `review`/`approve`/`reject`/`close`. Censista recibe 403. |
| RN-005 | `reject` exige `reason` 10-500 caracteres no vacío; sin él 400 `REJECT_REASON_REQUIRED`. El sistema registra `RECHAZADO` y en la misma transacción mueve a `EN_PROCESO` dejando trazabilidad de ambos pasos. |
| RN-006 | Cierre de período: `POST /census-periods/:id/close` valida `COUNT(*) WHERE period_id=:id AND status IN ('PENDIENTE','EN_PROCESO') = 0`. Si >0 retorna 409 `PERIOD_HAS_PENDING_RECORDS` con conteo. Si ya `CERRADO` retorna 409 `PERIOD_ALREADY_CLOSED`. |
| RN-007 | Período cerrado congela: (a) todo `census_records` de ese período en `EN_REVISION` queda bloqueado para `approve`/`reject` (409 `PERIOD_CLOSED`), (b) ningún registro del período puede cambiar de estado ni editarse, (c) `COMPLETADO` tampoco puede pasar a `EN_REVISION`. |
| RN-008 | `APROBADO` es terminal: no admite ninguna transición posterior; intento retorna 409 `ALREADY_APPROVED`. |
| RN-009 | Concurrencia: usar transacción con `SELECT ... FOR UPDATE` (o equivalente SQLite `BEGIN IMMEDIATE`) sobre `census_records` y `census_periods` para evitar doble `submit`/`close` concurrente. |
| RN-010 | Auditoría: cada transición exitosa inserta fila en `census_validations` (o `census_audit`) antes de commit. |
| RN-011 | Compatibilidad con 007: reportes sobre período `CERRADO` por defecto cuentan solo `APROBADO`; parámetro `includeNonApproved` solo para admin con advertencia. |
| RN-012 | Foto opcional no afecta validación; si se requiere en futuro, se versiona como SPEC menor sin romper matriz. |

### Matriz de transiciones (resumen)

| Origen \ Destino | PENDIENTE | EN_PROCESO | COMPLETADO | EN_REVISION | APROBADO | RECHAZADO |
|------------------|-----------|------------|------------|-------------|----------|-----------|
| **PENDIENTE** | — | ✅ censista | — | — | — | — |
| **EN_PROCESO** | — | — | ✅ censista+validaciones | — | — | — |
| **COMPLETADO** | — | — | — | ✅ admin | — | — |
| **EN_REVISION** | — | — | — | — | ✅ admin | ✅ admin+motivo → auto EN_PROCESO |
| **APROBADO** | — | — | — | — | — | — |
| **RECHAZADO** | — | — | — | — | — | — (efímero) |

`—` = 409. Celda `✅` indica única transición válida con actor indicado. Período `CERRADO` anula todas.

---

## 8. Endpoints y Contratos

Base: `/api/v1`

| Método | Ruta | Rol | Transición | Códigos |
|--------|------|-----|------------|---------|
| `PATCH` | `/census-records/:id/submit` | censista (propio) | `EN_PROCESO -> COMPLETADO` | 200, 401, 403, 404, 409, 422 |
| `PATCH` | `/census-records/:id/review` | admin | `COMPLETADO -> EN_REVISION` | 200, 401, 403, 404, 409 |
| `PATCH` | `/census-records/:id/approve` | admin | `EN_REVISION -> APROBADO` | 200, 401, 403, 404, 409 |
| `PATCH` | `/census-records/:id/reject` | admin | `EN_REVISION -> RECHAZADO -> EN_PROCESO` | 200, 400, 401, 403, 404, 409 |
| `POST` | `/census-periods/:id/close` | admin | `ACTIVO -> CERRADO` | 200, 401, 403, 404, 409 |

**Request `reject`:**
```json
{ "reason": "Cédula no coincide con foto del documento, corregir" }
```

**Response 200 transición (ejemplo):**
```json
{
  "id": "uuid",
  "status": "COMPLETADO",
  "previousStatus": "EN_PROCESO",
  "periodId": "uuid",
  "updatedAt": "2026-08-28T00:00:00.000Z",
  "validation": { "actorId": "uuid", "actorRole": "censista" }
}
```

**Response 422 validaciones `submit`:**
```json
{
  "code": "VALIDATION_FAILED",
  "details": [
    { "field": "mototaxi_cedula", "code": "INVALID_CEDULA_FORMAT" },
    { "field": "period_id", "code": "PERIOD_NOT_ACTIVE" }
  ]
}
```

**Response 409 cierre bloqueado:**
```json
{ "code": "PERIOD_HAS_PENDING_RECORDS", "pendingCount": 12, "inProgressCount": 5 }
```

Headers: `Authorization: Bearer <JWT>` obligatorio. Rate-limit en `close` (5 req/min por admin) recomendado.

---

## 9. Casos Límite y Errores

| Caso | Comportamiento |
|------|----------------|
| Censista hace `submit` sobre registro ajeno | 403 `NOT_OWNER` |
| `submit` con período `CERRADO` o inexistente | 422 `PERIOD_NOT_ACTIVE` |
| `submit` con corregimiento/barrio inactivo | 422 `GEOGRAPHY_NOT_ACTIVE` |
| `submit` con cédula/placa formato inválido | 422 `INVALID_CEDULA_FORMAT` / `INVALID_PLATE_FORMAT` |
| `submit` con cédula/placa duplicada | 422 `CEDULA_ALREADY_EXISTS` / `PLATE_ALREADY_EXISTS` |
| Foto ausente | 200 (no bloquea) |
| Admin hace `review` sobre `EN_PROCESO` | 409 `INVALID_TRANSITION` |
| `reject` sin motivo o <10 chars | 400 `REJECT_REASON_REQUIRED` / `REJECT_REASON_TOO_SHORT` |
| `approve`/`reject` con período cerrado | 409 `PERIOD_CLOSED` |
| `approve` sobre `APROBADO` | 409 `ALREADY_APPROVED` |
| `close` con pendientes | 409 `PERIOD_HAS_PENDING_RECORDS` |
| `close` ya cerrado | 409 `PERIOD_ALREADY_CLOSED` |
| Sin JWT | 401 `UNAUTHORIZED` |
| Censista intenta `review`/`approve`/`reject`/`close` | 403 `FORBIDDEN` |
| Concurrencia doble `submit` | Uno 200, otro 409 por estado ya cambiado |

---

## 10. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Validación y Cierre de Censos

  Background:
    Given existe período "2026-01" en estado ACTIVO
    And existe corregimiento "Cascajal" ACTIVO y barrio "Centro" ACTIVO
    And existe censista "C1" y admin "A1" autenticados

  Scenario: Censista completa registro válido
    Given existe registro "R1" en EN_PROCESO creado por C1 con cédula "1234567890" y placa "ABC123" válidas
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 200 con status COMPLETADO
    And existe fila en census_validations con from EN_PROCESO to COMPLETADO y actor C1

  Scenario: Submit falla por período inactivo
    Given el período "2026-01" está CERRADO
    And existe registro R1 en EN_PROCESO de ese período
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 422 con code PERIOD_NOT_ACTIVE

  Scenario: Submit falla por geografía inactiva
    Given el corregimiento "Cascajal" está inactivo
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 422 con code GEOGRAPHY_NOT_ACTIVE

  Scenario: Submit falla por cédula inválida
    Given R1 tiene cédula "ABC"
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 422 con code INVALID_CEDULA_FORMAT

  Scenario: Foto opcional no bloquea
    Given R1 no tiene foto
    And todos los demás campos son válidos
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 200 con status COMPLETADO

  Scenario: Censista no puede enviar registro ajeno
    Given R1 fue creado por otro censista C2
    When C1 hace PATCH /census-records/R1/submit
    Then recibe 403 con code NOT_OWNER

  Scenario: Admin pasa a revisión
    Given R1 está en COMPLETADO
    When A1 hace PATCH /census-records/R1/review
    Then recibe 200 con status EN_REVISION

  Scenario: Censista no puede revisar
    Given R1 está en COMPLETADO
    When C1 hace PATCH /census-records/R1/review
    Then recibe 403

  Scenario: Admin aprueba
    Given R1 está en EN_REVISION
    When A1 hace PATCH /census-records/R1/approve
    Then recibe 200 con status APROBADO
    And APROBADO es terminal: siguiente approve retorna 409

  Scenario: Admin rechaza con motivo y vuelve a EN_PROCESO
    Given R1 está en EN_REVISION
    When A1 hace PATCH /census-records/R1/reject con reason "Foto borrosa, reintentar con mejor calidad"
    Then recibe 200 con status EN_PROCESO
    And el historial contiene RECHAZADO con reason y luego EN_PROCESO
    And C1 puede corregir y reenviar submit

  Scenario: Rechazo sin motivo falla
    Given R1 está en EN_REVISION
    When A1 hace PATCH /census-records/R1/reject con body {}
    Then recibe 400 con code REJECT_REASON_REQUIRED

  Scenario: Transición inválida
    Given R1 está en EN_PROCESO
    When A1 hace PATCH /census-records/R1/approve
    Then recibe 409 con code INVALID_TRANSITION

  Scenario: Cierre de período exitoso
    Given período "2026-01" ACTIVO con 10 registros todos en COMPLETADO/EN_REVISION/APROBADO y 0 en PENDIENTE/EN_PROCESO
    When A1 hace POST /census-periods/2026-01/close
    Then recibe 200 con status CERRADO
    And closed_at y closed_by_user_id quedan seteados

  Scenario: Cierre bloqueado por pendientes
    Given período "2026-01" tiene 2 registros en PENDIENTE y 1 en EN_PROCESO
    When A1 hace POST /census-periods/2026-01/close
    Then recibe 409 con code PERIOD_HAS_PENDING_RECORDS y conteos

  Scenario: Período cerrado bloquea aprobaciones
    Given período "2026-01" está CERRADO y R1 en EN_REVISION de ese período
    When A1 hace PATCH /census-records/R1/approve
    Then recibe 409 con code PERIOD_CLOSED

  Scenario: Período cerrado bloquea submit y review
    Given período "2026-01" CERRADO
    When C1 hace PATCH /census-records/R1/submit o A1 hace PATCH /census-records/R1/review
    Then recibe 409 con code PERIOD_CLOSED

  Scenario: Bandeja de revisión admin
    Given existen 5 registros en COMPLETADO y 3 en EN_REVISION del período activo
    When A1 hace GET /census-records?status=COMPLETADO&periodId=2026-01
    Then recibe 200 con 5 registros paginados

  Scenario: Historial de validaciones
    Given R1 pasó por EN_PROCESO -> COMPLETADO -> EN_REVISION -> RECHAZADO -> EN_PROCESO -> COMPLETADO -> EN_REVISION -> APROBADO
    When A1 hace GET /census-records/R1
    Then el campo validations contiene 8 entradas ordenadas por created_at asc
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias
- Validadores: `isValidCedula`, `isValidPlate` (normalización con/sin guion), `validateGeographyActive`, `validatePeriodActive`, `validateRejectReason`.
- Máquina de estados: `canTransition(from, to, role, isOwner, periodStatus)` con tabla de 6x6 + casos período cerrado.
- Helpers de unicidad: mock de repositorio para cédula/placa duplicada.
- Mapper de estados legacy `pending/completed -> PENDIENTE/COMPLETADO`.

### Pruebas de Integración
- `PATCH /submit` happy path + 422 por cada validación + 403 por no propietario.
- `PATCH /review|approve|reject` con rol admin/censista, 409 por transición inválida, 400 por motivo faltante.
- `reject` verifica doble inserción en `census_validations` (RECHAZADO + EN_PROCESO) en una transacción.
- `POST /close` con 0 pendientes (200), con pendientes (409), ya cerrado (409), con EN_REVISION bloqueado post-cierre.
- Período cerrado bloquea cualquier `PATCH` posterior (409 `PERIOD_CLOSED`).
- `GET /census-records?status=` filtra correctamente y respeta scoping por rol (censista solo propios).
- `GET /census-records/:id` incluye historial ordenado.

### Pruebas End-to-End (E2E)
- Flujo completo censista: crear PENDIENTE -> editar EN_PROCESO -> submit COMPLETADO -> admin review EN_REVISION -> reject -> censista corrige -> submit -> admin approve APROBADO -> close período -> verificar 007 solo cuenta APROBADO.
- Flujo cierre bloqueado: crear pendientes -> intentar close 409 -> completar pendientes -> close 200.
- Concurrencia: dos `submit` simultáneos sobre mismo EN_PROCESO (uno 200, otro 409).

### Criterio de Cobertura
- Cobertura mínima: 85% en `src/modules/validation/**` y `src/modules/census-periods/**` (close).
- Todos los escenarios Gherkin DEBEN tener prueba automatizada (unit o integración).
- Snapshot de matriz de transiciones como test de regresión.

---

## 12. Consideraciones de Arquitectura (Clean Architecture)

```
src/modules/validation/
├── domain/
│   ├── entities/CensusValidation.ts
│   ├── value-objects/CensusStatus.ts      // enum + canTransition()
│   └── value-objects/RejectReason.ts
├── application/
│   ├── use-cases/SubmitRecordUseCase.ts
│   ├── use-cases/ReviewRecordUseCase.ts
│   ├── use-cases/ApproveRecordUseCase.ts
│   ├── use-cases/RejectRecordUseCase.ts
│   ├── use-cases/ClosePeriodUseCase.ts
│   └── ports/IValidationRepository.ts | ICensusRecordRepository | ICensusPeriodRepository
├── infrastructure/
│   ├── repositories/TypeormValidationRepository.ts
│   └── validators/CedulaValidator.ts, PlateValidator.ts
└── presentation/
    ├── controllers/ValidationController.ts
    └── routes/validation.routes.ts  // monta PATCH /census-records/:id/{submit,review,approve,reject}
                                      // y POST /census-periods/:id/close (o en period routes)
```

- Casos de uso orquestan: cargar registro+período en transacción -> validar rol/propiedad -> validar período no cerrado -> validar transición -> ejecutar validaciones automáticas (submit) -> persistir estado + `census_validations` -> commit.
- `CensusStatus.canTransition()` es pura de dominio, testeable sin DB.
- Controladores delegan a casos de uso; middleware `auth` + `requireRole` antes.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Migración de enum rompe datos existentes | Backfill con mapeo + CHECK ampliado; rollback mantiene compat lectora |
| Doble submit/close concurrente | Transacción `BEGIN IMMEDIATE` + `FOR UPDATE` + test de concurrencia |
| Censista bloqueado tras rechazo sin feedback | Motivo obligatorio visible en UI + historial; notificación log |
| Cierre accidental con datos incompletos | Precondición estricta + confirmación UI + 409 con conteo explícito |
| Foto opcional malinterpretada como requerida | Documentar en validación y UI; test dedicado "sin foto 200" |
| Reportes inconsistentes post-cierre | Contrato 007: período CERRADO solo APROBADO por defecto |

---

## 14. Referencias

- Stack: Node.js + TypeScript + Express + TypeORM + SQLite, React Vite Tailwind
- Módulos previos: 003 Census Periods, 006 Census Records (006-mototaxi-data), 007 Reports
- Clean Architecture — separación domain/application/infrastructure/presentation
- Ley 1581 de 2012 (para coherencia con 007 anonimización)

