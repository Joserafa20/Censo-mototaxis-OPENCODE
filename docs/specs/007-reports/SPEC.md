# SPEC 007 — Reportes y Estadísticas

## 1. Objetivo

Definir los requisitos técnicos y funcionales del módulo de Reportes y Estadísticas del Sistema de Censo de Mototaxis de Sabanalarga. Este módulo provee dashboards de solo lectura, reportes filtrables y exportación de datos (CSV/Excel) mediante agregaciones sobre los registros de censo existentes, sin crear nuevas tablas transaccionales, cumpliendo con la Ley 1581 de 2012 (Habeas Data) para el tratamiento de datos personales.

---

## 2. Contexto y Justificación

Los módulos previos (001 Auth, 002 Users, 003 Census Periods, 004 Geography, 005 Stations, 006 Census Records) capturan los datos operativos del censo. El módulo 007 los explota para la toma de decisiones:

- La Alcaldía necesita saber **cuántos mototaxistas hay, dónde operan y cómo se distribuyen** por corregimiento, estación, tipo de moto, género y edad.
- Los censistas necesitan **reportes de su propio trabajo**.
- La administración necesita **exportar listados filtrados** para análisis externo, respetando la protección de datos personales.

Arquitectura: Clean Architecture. Los reportes son **consultas de lectura (CQRS-read)**: no mutan estado, solo agregan y proyectan `census_records` + `stations` + `corregimientos` + `census_periods` + `users`.

---

## 3. Alcance

### In Scope

- Dashboard de estadísticas (agregaciones de solo lectura):
  - Total de mototaxis censados global y por período.
  - Distribución por `locationType`: casco urbano vs. rural (desglosado por cada corregimiento: Cascajal, Colombia, Isabel López, Molineros, Aguada de Pablo, Gallego, La Peña).
  - Distribución por estación vs. independientes (`operation_type`).
  - Distribución por tipo/marca de moto, por género y por rango de edad.
  - Evolución por período (comparativo si existen múltiples `census_periods`).
- Reportes filtrables con paginación sobre `census_records`.
- Filtros: `periodId`, `locationType` (urban/rural), `corregimientoId`, `stationId`, `operationType`, `rangoFechas` (`createdAt` desde/hasta).
- Control de visibilidad: Admin ve todo; Censista solo ve sus registros (`created_by_user_id`).
- Exportación del listado filtrado a CSV y Excel (XLSX).
- Anonimización en exportación según rol y Ley 1581.
- Endpoints:
  - `GET /api/v1/reports/summary?periodId=&locationType=&corregimientoId=&stationId=&operationType=&dateFrom=&dateTo=`
  - `GET /api/v1/reports/export?format=csv|xlsx&periodId=&locationType=&corregimientoId=&stationId=&operationType=&dateFrom=&dateTo=`
- Cache de corta duración para `summary` y rate-limit en `export`.

### Out of Scope

- Creación de nuevas tablas transaccionales (este módulo no persiste; solo agrega).
- Edición o borrado de registros de censo (propio de 006).
- Reportes en tiempo real con WebSockets / streaming.
- Generación de PDF con gráficos (va en Módulo 015 - Visualización).
- Mapas interactivos / georreferenciación avanzada.
- Envío automático de reportes por correo o programación (cron).
- Auditoría de quién consultó reportes (opcional futuro, no requerido aquí).
- Dashboards editables por el usuario (filtros predefinidos solamente).

---

## 4. Actores y Permisos

| Actor | Permisos |
|-------|----------|
| **Administrador** | Consultar `summary` y `export` sobre TODOS los registros. Ver datos personales completos en exportación. Ver evolución por período completa. |
| **Censista (Funcionario)** | Consultar `summary` y `export` SOLO sobre registros donde `created_by_user_id = own_user_id`. Los totales y distribuciones se calculan sobre su subconjunto. No puede ver datos de otros censistas. |
| **Sistema** | Aplicar scoping automático por rol, validar filtros, anonimizar según Ley 1581, limitar tamaño de exportación. |
| **No autenticado** | 401 Unauthorized en ambos endpoints. |

> Nota: Si en el futuro existe rol `Supervisor`, hereda permisos de Censista + visibilidad agregada sin PII (pendiente de SPEC 008).

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE exponer `GET /api/v1/reports/summary` que retorne agregaciones de solo lectura | Alta |
| RF-002 | El sistema DEBE retornar en `summary`: `totalGlobal`, `totalByPeriod[]`, `byLocationType {urban, rural}`, `byCorregimiento[]` (7 corregimientos fijos) | Alta |
| RF-003 | El sistema DEBE retornar en `summary`: `byOperationType {station, independent}`, `byStation[]` (con conteo), `byMotoType[]` (marca/modelo), `byGenero[]`, `byRangoEdad[]` | Alta |
| RF-004 | El sistema DEBE retornar en `summary`: `evolucionPorPeriodo[]` con total por cada `census_period` | Alta |
| RF-005 | El sistema DEBE soportar filtros opcionales en `summary` y `export`: `periodId`, `locationType`, `corregimientoId`, `stationId`, `operationType`, `dateFrom`, `dateTo` | Alta |
| RF-006 | El sistema DEBE aplicar scoping por rol: Admin = sin restricción; Censista = `WHERE created_by_user_id = :currentUserId` | Alta |
| RF-007 | El sistema DEBE validar que los filtros referencien entidades existentes y activas (periodo/corregimiento/estación); si no existen retornar 400 | Alta |
| RF-008 | El sistema DEBE exponer `GET /api/v1/reports/export?format=csv\|xlsx` que retorne el listado filtrado paginado/exportable | Alta |
| RF-009 | El sistema DEBE limitar la exportación a un máximo configurable (por defecto 10.000 filas); si se excede retornar 400 con mensaje | Media |
| RF-010 | El sistema DEBE anonimizar datos personales en exportación cuando el solicitante NO es Admin (Ley 1581): cédula y teléfono enmascarados, nombre parcial | Alta |
| RF-011 | El sistema DEBE incluir en el CSV/XLSX cabeceras estables y `Content-Disposition: attachment` con nombre `censo-mototaxis-YYYY-MM-DD.{csv|xlsx}` | Media |
| RF-012 | El sistema DEBE registrar `Content-Type` correcto (`text/csv` / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) | Media |
| RF-013 | El sistema DEBE responder 401 si no hay JWT válido y 403 si el rol no tiene permiso | Alta |
| RF-014 | El sistema DEBE paginar `summary.byStation` y el listado de exportación (`page`, `limit`) | Media |
| RF-015 | El sistema DEBE excluir registros con `is_active = false` de todos los conteos por defecto (parámetro opcional `includeInactive=false`) | Alta |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | `GET /summary` DEBE responder en < 300 ms p95 con hasta 10.000 registros (agregaciones con índices) | Rendimiento |
| RNF-002 | `GET /export` DEBE soportar hasta 10.000 filas sin OOM; streaming para CSV | Rendimiento |
| RNF-003 | Respuesta `summary` DEBE cachearse 60s por combinación de filtros+rol (Cache-Control / memoria o Redis) | Escalabilidad |
| RNF-004 | Exportación DEBE estar rate-limitada (ej. 10 req/min por usuario) | Seguridad |
| RNF-005 | Consultas DEBEN usar índices existentes en `census_records(period_id, corregimiento_id, station_id, created_by_user_id, is_active, created_at)` | Rendimiento |
| RNF-006 | El módulo NO DEBE crear tablas nuevas; solo vistas/query builder sobre tablas existentes | Arquitectura |
| RNF-007 | Logs de exportación DEBEN registrar `userId`, filtros y `format` sin exponer PII | Cumplimiento |
| RNF-008 | Cumplimiento Ley 1581 de 2012: anonimización y aviso de tratamiento en documentación de exportación | Cumplimiento |
| RNF-009 | Cobertura de pruebas del módulo >= 85% | Calidad |

---

## 6. Modelo de Datos

> **No se crea nueva tabla.** Todas las estadísticas son agregaciones en tiempo de consulta sobre tablas existentes. Si se requiere optimización futura, se evaluará una vista materializada (fuera de este SPEC).

### Tablas origen

| Tabla | Campos relevantes para reportes |
|-------|----------------------------------|
| `census_records` | `id`, `period_id`, `corregimiento_id`, `neighborhood_id`, `station_id`, `operation_type`, `mototaxi_cedula`, `mototaxi_first_name`, `mototaxi_last_name`, `mototaxi_phone`, `mototaxi_address`, `motorcycle_plate`, `motorcycle_brand`, `motorcycle_model`, `motorcycle_color`, `is_active`, `created_by_user_id`, `created_at`, `mototaxi_gender`*, `mototaxi_birthdate`* |
| `stations` | `id`, `name`, `corregimiento_id`, `is_active`, `locationType` (urban/rural derivado de `corregimiento` o campo propio) |
| `corregimientos` | `id`, `name` (7 fijos), `locationType` |
| `census_periods` | `id`, `name`, `is_active`, `start_date`, `end_date` |
| `users` | `id`, `role` (admin/censista) |

\* `mototaxi_gender` y `mototaxi_birthdate` existen si fueron agregados en 006; si no, `byGenero` y `byRangoEdad` se calculan solo si los campos están presentes, caso contrario retornan array vacío con aviso.

### Agregaciones (query builder / TypeORM)

```sql
-- Ejemplo conceptual (no DDL):
SELECT count(*) FROM census_records WHERE is_active = true AND period_id = :periodId
SELECT corregimiento_id, count(*) FROM census_records WHERE ... GROUP BY corregimiento_id
SELECT operation_type, count(*) FROM census_records WHERE ... GROUP BY operation_type
SELECT station_id, count(*) FROM census_records WHERE station_id IS NOT NULL GROUP BY station_id
SELECT motorcycle_brand, count(*) FROM census_records GROUP BY motorcycle_brand
```

### Índices requeridos (verificar existencia, crear si faltan)

- `IDX_census_records_period` en `census_records(period_id)`
- `IDX_census_records_corregimiento` en `census_records(corregimiento_id)`
- `IDX_census_records_station` en `census_records(station_id)`
- `IDX_census_records_created_by` en `census_records(created_by_user_id)`
- `IDX_census_records_active` en `census_records(is_active)`
- `IDX_census_records_created_at` en `census_records(created_at)`

### DTO de respuesta `summary` (contrato)

```json
{
  "totalGlobal": 1240,
  "totalByPeriod": [{ "periodId": "uuid", "periodName": "2026-01", "total": 800 }],
  "byLocationType": { "urban": 600, "rural": 640 },
  "byCorregimiento": [
    { "corregimientoId": "uuid", "name": "Cascajal", "locationType": "rural", "total": 180 },
    { "corregimientoId": "uuid", "name": "Colombia", "locationType": "rural", "total": 95 }
  ],
  "byOperationType": { "station": 900, "independent": 340 },
  "byStation": [{ "stationId": "uuid", "name": "Estación Centro", "total": 120 }],
  "byMotoType": [{ "brand": "Honda", "total": 400 }],
  "byGenero": [{ "genero": "M", "total": 1100 }, { "genero": "F", "total": 140 }],
  "byRangoEdad": [{ "rango": "18-25", "total": 300 }, { "rango": "26-35", "total": 500 }],
  "evolucionPorPeriodo": [{ "periodId": "uuid", "periodName": "2025-02", "total": 440 }, { "periodId": "uuid", "periodName": "2026-01", "total": 800 }],
  "filtersApplied": { "periodId": null, "locationType": null, "corregimientoId": null, "stationId": null, "dateFrom": null, "dateTo": null },
  "generatedAt": "2026-08-28T00:00:00.000Z"
}
```

---

## 7. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | Todos los conteos excluyen `is_active = false` salvo que el cliente envíe `includeInactive=true` (solo Admin puede usarlo). |
| RN-002 | `locationType` válido: `urban` \| `rural`. Si `locationType=rural` sin `corregimientoId`, el desglose DEBE incluir los 7 corregimientos rurales con su total (0 si no hay datos). |
| RN-003 | Los 7 corregimientos canónicos son: Cascajal, Colombia, Isabel López, Molineros, Aguada de Pablo, Gallego, La Peña. Si un `corregimientoId` no corresponde a uno de ellos y `locationType=rural`, se retorna 400. |
| RN-004 | `stationId` solo es válido si la estación existe y está activa; filtrar por estación inactiva retorna 400. |
| RN-005 | `periodId` solo es válido si el período existe; si no existe retorna 400. Sin `periodId`, el `totalGlobal` agrega todos los períodos. |
| RN-006 | Rango de fechas: `dateFrom` <= `dateTo`; ambos en ISO 8601; si `dateFrom` > `dateTo` retornar 400. El rango filtra por `census_records.created_at`. |
| RN-007 | Scoping por rol: Censista ve solo `created_by_user_id = :currentUserId`. Admin ve todo. El scoping se aplica ANTES de agregar. |
| RN-008 | Exportación: Admin recibe PII completo; Censista y cualquier no-Admin recibe datos anonimizados: `cédula -> ***6789` (últimos 4 visibles), `teléfono -> ***123`, `nombre -> J*** P***`. |
| RN-009 | Ley 1581 — Aviso: toda exportación DEBE incluir en la primera fila del CSV o en hoja "Aviso" del XLSX el texto: "Datos tratados conforme a Ley 1581 de 2012 — Uso exclusivo para fines estadísticos del Censo de Mototaxis de Sabanalarga. Prohibida su divulgación." |
| RN-010 | Límite de exportación: máximo 10.000 filas por solicitud. Si el filtro supera el límite, retornar 400 con `code: EXPORT_LIMIT_EXCEEDED` y sugerir refinar filtros o paginar. |
| RN-011 | `summary` es solo lectura y cacheable 60s por clave `hash(filtros + role + userId si censista)`. Invalidación no requerida (TTL). |
| RN-012 | `byRangoEdad` se calcula a partir de `mototaxi_birthdate` con rangos fijos: 18-25, 26-35, 36-45, 46-55, 56+. Si el campo no existe, retornar array vacío. |
| RN-013 | `byGenero` valores esperados: `M`, `F`, `Otro` / `No registra`. Normalizar a mayúsculas. |
| RN-014 | Orden de `byCorregimiento` y `byStation`: descendente por `total`. |

---

## 8. Flujos y Endpoints

### 8.1 GET /api/v1/reports/summary

```
Cliente envía GET /api/v1/reports/summary?periodId=&locationType=&corregimientoId=&stationId=&operationType=&dateFrom=&dateTo=
  → Auth middleware valida JWT → 401 si falta/inválido
  → Sistema resuelve rol (admin/censista)
  → Sistema valida filtros (400 si inválidos)
  → Sistema aplica scoping por rol
  → Sistema ejecuta agregaciones (query builder) con cache 60s
    → [Cache hit] Retorna 200 con `X-Cache: HIT`
    → [Cache miss] Calcula, guarda en cache, retorna 200 con `X-Cache: MISS`
```

**Query params:**

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `periodId` | UUID | No | Filtra por período |
| `locationType` | enum `urban`/`rural` | No | Casco urbano vs rural |
| `corregimientoId` | UUID | No | Filtra por corregimiento |
| `stationId` | UUID | No | Filtra por estación |
| `operationType` | enum `station`/`independent` | No | Tipo operación |
| `dateFrom` | ISO 8601 | No | Desde `created_at` |
| `dateTo` | ISO 8601 | No | Hasta `created_at` |
| `includeInactive` | boolean | No | Default `false`; solo Admin |

### 8.2 GET /api/v1/reports/export

```
Cliente envía GET /api/v1/reports/export?format=csv&...
  → Auth + validación filtros (igual que summary)
  → Sistema aplica scoping por rol
  → Sistema cuenta filas filtradas
    → [> 10.000] Retorna 400 EXPORT_LIMIT_EXCEEDED
    → [<= 10.000] Genera stream CSV/XLSX con anonimización según rol
  → Retorna 200 con Content-Type y Content-Disposition
```

**Query params adicionales:**

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `format` | enum `csv`/`xlsx` | Sí | Formato de exportación |
| `page`/`limit` | int | No | Paginación opcional para previsualizar |

**Headers de respuesta export:**

- `Content-Type: text/csv; charset=utf-8` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="censo-mototaxis-2026-08-28.csv"`
- `X-Total-Count: <n>`

---

## 9. Casos Límite y Errores

| Caso | Comportamiento Esperado |
|------|------------------------|
| Sin registros en el sistema | `summary` retorna todos los totales en 0 y arrays vacíos con 200 OK |
| Filtro `periodId` inexistente | 400 Bad Request `{ code: "INVALID_PERIOD" }` |
| Filtro `corregimientoId` inexistente | 400 Bad Request `{ code: "INVALID_CORREGIMIENTO" }` |
| Filtro `stationId` de estación inactiva | 400 Bad Request `{ code: "INVALID_STATION" }` |
| `dateFrom > dateTo` | 400 Bad Request `{ code: "INVALID_DATE_RANGE" }` |
| `locationType` inválido | 400 Bad Request `{ code: "INVALID_LOCATION_TYPE" }` |
| Exportación > 10.000 filas | 400 Bad Request `{ code: "EXPORT_LIMIT_EXCEEDED", message: "Refine filtros" }` |
| `format` no soportado | 400 Bad Request `{ code: "INVALID_FORMAT" }` |
| Sin JWT | 401 Unauthorized |
| Censista intenta `includeInactive=true` | 403 Forbidden |
| Censista consulta summary | Solo ve sus registros; totales coherentes con su subconjunto |
| Campos género/edad no existen | `byGenero`/`byRangoEdad` retornan `[]` sin error |

---

## 10. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Reportes y Estadísticas

  Background:
    Given existen 7 corregimientos: Cascajal, Colombia, Isabel López, Molineros, Aguada de Pablo, Gallego, La Peña
    And existen períodos "2025-02" y "2026-01"
    And existen estaciones activas en Cascajal y Colombia

  Scenario: Admin consulta summary global
    Given el Admin está autenticado
    And existen 100 registros activos (60 urban, 40 rural)
    When hace GET /api/v1/reports/summary
    Then recibe 200 con totalGlobal 100
    And byLocationType es { urban: 60, rural: 40 }
    And byCorregimiento tiene 7 entradas (con 0 donde no hay datos)

  Scenario: Summary filtrado por período
    Given el Admin está autenticado
    When hace GET /api/v1/reports/summary?periodId=<id-2026-01>
    Then totalGlobal equivale a los registros de 2026-01
    And evolucionPorPeriodo refleja ambos períodos

  Scenario: Distribución por estación vs independientes
    Given existen 70 registros con station y 30 independientes
    When el Admin consulta summary
    Then byOperationType es { station: 70, independent: 30 }
    And byStation lista cada estación con su conteo descendente

  Scenario: Censista solo ve sus registros en summary
    Given el Censista A creó 5 registros y el Censista B creó 10
    When Censista A hace GET /api/v1/reports/summary
    Then totalGlobal es 5
    And no ve datos de Censista B

  Scenario: Censista solo exporta sus registros anonimizados
    Given el Censista A está autenticado
    When hace GET /api/v1/reports/export?format=csv
    Then recibe 200 con text/csv y Content-Disposition attachment
    And el CSV contiene solo sus 5 registros
    And la cédula aparece enmascarada "***6789"
    And la primera fila contiene el aviso Ley 1581

  Scenario: Admin exporta con datos completos
    Given el Admin está autenticado
    When hace GET /api/v1/reports/export?format=xlsx
    Then recibe 200 con application/vnd.openxmlformats...
    And el XLSX contiene cédulas completas sin enmascarar

  Scenario: Filtro por corregimiento rural
    Given el Admin está autenticado
    When hace GET /api/v1/reports/summary?locationType=rural&corregimientoId=<Cascajal>
    Then byCorregimiento solo incluye Cascajal con su total
    And byLocationType.rural coincide con ese total

  Scenario: Filtro por rango de fechas
    Given existen registros creados en 2026-01 y 2026-02
    When hace GET /api/v1/reports/summary?dateFrom=2026-02-01&dateTo=2026-02-28
    Then solo cuenta registros de febrero

  Scenario: Rango de fechas inválido
    When hace GET /api/v1/reports/summary?dateFrom=2026-02-28&dateTo=2026-02-01
    Then recibe 400 con code INVALID_DATE_RANGE

  Scenario: Exportación excede límite
    Given existen 15000 registros que coinciden con el filtro
    When hace GET /api/v1/reports/export?format=csv
    Then recibe 400 con code EXPORT_LIMIT_EXCEEDED

  Scenario: Sin autenticación
    When hace GET /api/v1/reports/summary sin JWT
    Then recibe 401 Unauthorized

  Scenario: Evolución por período con múltiples periodos
    Given existen períodos 2025-02 (40 registros) y 2026-01 (60 registros)
    When el Admin consulta summary
    Then evolucionPorPeriodo es [{ periodName: "2025-02", total: 40 }, { periodName: "2026-01", total: 60 }]

  Scenario: Distribución por género y edad
    Given existen registros con género M/F y birthdate variado
    When el Admin consulta summary
    Then byGenero desglosa M/F/Otro
    And byRangoEdad desglosa 18-25, 26-35, 36-45, 46-55, 56+

  Scenario: Cache de summary
    Given el Admin consulta summary con mismos filtros dos veces en 60s
    Then la segunda respuesta incluye header X-Cache: HIT
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias

- Helpers de anonimización: `maskCedula`, `maskPhone`, `maskName` con casos borde.
- Helper `calculateAgeRange(birthdate)` y rangos 18-25 ... 56+.
- Validadores de filtros: `validateReportFilters()` (UUID, enums, fechas, coherencia).
- Builder de query con scoping por rol (mock repository).
- Generador de nombre de archivo export con fecha.
- Constantes de 7 corregimientos canónicos.

### Pruebas de Integración

- `GET /summary` sin filtros retorna totales correctos (seed 20 registros).
- `GET /summary` con `periodId`, `corregimientoId`, `locationType`, `stationId`, `dateFrom/dateTo` filtra correctamente.
- `GET /summary` como Censista retorna solo sus registros; como Admin retorna todos.
- `GET /summary` excluye `is_active=false` por defecto; con `includeInactive=true` (Admin) los incluye.
- `GET /export?format=csv` retorna CSV con headers estables y aviso Ley 1581.
- `GET /export?format=xlsx` retorna XLSX válido con hoja de datos + hoja "Aviso".
- Anonimización: Censista recibe PII enmascarado; Admin recibe PII completo.
- Límite 10.000 filas: mock de 10.001 filas retorna 400.
- Validaciones 400 para filtros inválidos y 401/403 para auth/rol.
- Cache: segundo request idéntico retorna HIT (si hay cache en memoria).

### Pruebas End-to-End (E2E)

- Flujo Admin: seed períodos + geografía + estaciones + 50 census_records → `GET /summary` → verificar distribuciones → `GET /export?format=csv` → verificar archivo descargado.
- Flujo Censista: crear 3 registros como censista → `GET /summary` verifica total 3 → `GET /export` verifica anonimización.
- Filtros combinados: `periodId + corregimientoId + stationId + dateRange` en ambos endpoints.

### Criterio de Cobertura

- Cobertura mínima: 85% en `src/modules/reports/**`.
- Todos los escenarios Gherkin DEBEN tener prueba automatizada (unit o integración).
- Mutation testing opcional para helpers de anonimización.

---

## 12. Consideraciones de Arquitectura (Clean Architecture)

```
src/modules/reports/
├── domain/
│   ├── entities/ReportFilters.ts
│   └── value-objects/AgeRange.ts
├── application/
│   ├── use-cases/GetSummaryUseCase.ts
│   ├── use-cases/ExportReportUseCase.ts
│   └── ports/IReportRepository.ts  (puerto de lectura)
├── infrastructure/
│   ├── repositories/TypeormReportRepository.ts  (query builder, agregaciones)
│   └── export/CsvExporter.ts, ExcelExporter.ts
└── presentation/
    ├── controllers/ReportController.ts
    └── routes/reports.routes.ts
```

- `IReportRepository` es un **puerto de lectura** con métodos `getSummary(filters, userScope)` y `getFilteredRecords(filters, userScope, pagination)`.
- No se inyecta escritura; no hay comandos.
- Controladores delegan a casos de uso; casos de uso aplican scoping + validación + anonimización.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Agregaciones lentas con muchos registros | Índices + paginación + cache 60s; evaluar vista materializada si > 50k |
| Fuga de PII en exportación | Anonimización obligatoria + tests de snapshot CSV + code review de exporters |
| Inconsistencia de 7 corregimientos | Constante canónica `RURAL_CORREGIMIENTOS` validada contra tabla `corregimientos` al boot |
| Campos género/edad no existen en 006 | Degradación graceful: retornar [] y documentar en README |

---

## 14. Referencias

- Stack: Node.js + TypeScript + Express + TypeORM + SQLite/PostgreSQL, React Vite Tailwind
- Módulos previos: 001 Auth, 002 Users, 003 Census Periods, 004 Geography, 005 Stations, 006 Census Records
- Ley 1581 de 2012 — Protección de Datos Personales (Colombia)
- Clean Architecture — separación domain/application/infrastructure/presentation
