# SPEC 004 — Geografía y Cobertura

## 1. Objetivo

Definir los requisitos técnicos y funcionales del módulo de gestión geográfica del Sistema de Censo de Mototaxis de Sabanalarga. Este módulo permite organizar la cobertura territorial jerárquica (Municipio → Corregimiento → Barrio/Vereda) para ubicar correctamente cada registro de censo.

---

## 2. Contexto y Justificación

La Alcaldía de Sabanalarga, Atlántico, requiere que cada mototaxista y motocicleta censada esté ubicada geográficamente. Sabanalarga no es solo la cabecera municipal; incluye varios corregimientos rurales con sus respectivos barrios y veredas. La gestión correcta de esta jerarquía es fundamental para:
- Estadísticas por zona.
- Planificación de cobertura de servicio.
- Asignación de censistas por territorio.
- Consulta pública por ubicación.

---

## 3. Alcance

### In Scope
- Gestión de jerarquía territorial: Municipio → Corregimiento → Barrio/Vereda.
- CRUD de corregimientos (crear, editar, listar, inactivar).
- CRUD de barrios/veredas (crear, editar, listar, inactivar).
- Inactivación lógica en cascada (inactivar corregimiento → inactivar sus barrios).
- Reactivación de barrios individualmente.
- Captura GPS opcional para ubicación exacta del barrio.
- Árbol jerárquico completo para consumo del frontend.
- Auditoría de cambios geográficos.

### Out of Scope
- Gestión de direcciones postales específicas.
- Geocodificación automática de direcciones.
- Mapas interactivos con mapa de calor (va en Módulo 015: Analítica).
- Límites geográficos poligonales (shapefiles).

---

## 4. Actores y Permisos

| Actor | Permisos |
|-------|----------|
| **Administrador** | Crear, editar, inactivar y reactivar corregimientos y barrios. Consultar árbol completo. |
| **Funcionario Censista** | Consultar (lectura) la jerarquía geográfica para ubicar sus registros de censo. Seleccionar corregimiento y barrio al crear un censo. |
| **Sistema** | Validar unicidad, jerarquía, inactivación en cascada. |

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE permitir al Administrador crear corregimientos con nombre único dentro del municipio | Alta |
| RF-002 | El sistema DEBE permitir al Administrador crear barrios/veredas dentro de un corregimiento | Alta |
| RF-003 | El sistema DEBE listar la jerarquía completa como árbol (municipio → corregimientos → barrios) | Alta |
| RF-004 | El sistema DEBE permitir inactivar un corregimiento (inactivando sus barrios en cascada) | Alta |
| RF-005 | El sistema DEBE permitir reactivar barrios individualmente | Media |
| RF-006 | El sistema DEBE validar que el nombre del barrio sea único dentro de su corregimiento padre | Alta |
| RF-007 | El sistema DEBE soportar coordenadas GPS opcionales (lat, lng) por barrio | Media |
| RF-008 | El sistema DEBE registrar cada cambio geográfico en una tabla de auditoría | Media |
| RF-009 | El sistema DEBE prevenir la eliminación física de registros geográficos | Alta |
| RF-010 | El sistema DEBE permitir al Censista consultar la jerarquía en modo lectura | Alta |
| RF-011 | El sistema DEBE filtrar barrios por corregimiento en tiempo real | Media |
| RF-012 | El sistema DEBE retornar el conteo de barrios activos por corregimiento | Baja |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | La consulta del árbol jerárquico NO DEBE superar 200ms | Rendimiento |
| RNF-002 | El módulo DEBE soportar al menos 50 corregimientos y 500 barrios | Escalabilidad |
| RNF-003 | Los datos geográficos DEBEN cachearse en el cliente para funcionamiento offline | Disponibilidad |
| RNF-004 | Los cambios DEBEN ser auditables con timestamp y actor | Cumplimiento |

---

## 6. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | El municipio de Sabanalarga es el nodo raíz y NO puede ser creado, editado ni inactivado. |
| RN-002 | El nombre de un corregimiento DEBE ser único dentro del municipio. |
| RN-003 | El nombre de un barrio DEBE ser único dentro de su corregimiento padre. |
| RN-004 | Al inactivar un corregimiento, TODOS sus barrios activos SE inactivan en cascada. |
| RN-005 | Un barrio inactivo NO podrá ser seleccionado para nuevos registros de censo. |
| RN-006 | Un corregimiento inactivo NO podrá ser seleccionado para nuevos registros de censo. |
| RN-007 | La reactivación de un barrio es individual y NO reactiva su corregimiento padre. |
| RN-008 | Un barrio solo puede reactivarse si su corregimiento padre está ACTIVO. |
| RN-009 | Las coordenadas GPS son opcionales pero DEBEN estar dentro del rango válido (lat: -90 a 90, lng: -180 a 180). |
| RN-010 | Los registros geográficos NO pueden eliminarse físicamente (solo inactivación lógica). |
| RN-011 | El Censista solo tiene permisos de lectura sobre la geografía. |

---

## 7. Modelo de Datos Afectado

### Tabla: `municipalities`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `name` | VARCHAR(100) | Nombre del municipio (Sabanalarga) |
| `department` | VARCHAR(100) | Departamento (Atlántico) |
| `created_at` | TIMESTAMP | Fecha de creación |

### Tabla: `corregimientos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `municipality_id` | UUID (FK → municipalities.id) | Municipio padre |
| `name` | VARCHAR(100) | Nombre del corregimiento |
| `is_active` | BOOLEAN | Estado activo/inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

**Restricción:** UNIQUE(municipality_id, name) para unicidad de nombre dentro del municipio.

### Tabla: `neighborhoods`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `corregimiento_id` | UUID (FK → corregimientos.id) | Corregimiento padre |
| `name` | VARCHAR(150) | Nombre del barrio o vereda |
| `latitude` | DECIMAL(10,8) NULL | Latitud GPS (opcional) |
| `longitude` | DECIMAL(11,8) NULL | Longitud GPS (opcional) |
| `is_active` | BOOLEAN | Estado activo/inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

**Restricción:** UNIQUE(corregimiento_id, name) para unicidad de nombre dentro del corregimiento.

### Tabla: `geography_audit`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `entity_type` | ENUM('corregimiento', 'neighborhood') | Tipo de entidad modificada |
| `entity_id` | UUID | ID de la entidad modificada |
| `action` | ENUM('created', 'updated', 'deactivated', 'reactivated') | Acción realizada |
| `actor_user_id` | UUID (FK → users.id) | Usuario que realizó la acción |
| `details` | JSONB | Detalles del cambio (before/after) |
| `created_at` | TIMESTAMP | Momento de la acción |

---

## 8. Flujos y Diagramas de Estado

### Flujo de Creación de Corregimiento

```text
Admin envía POST /api/v1/geography/corregimientos
  → Sistema valida nombre único dentro del municipio
    → [Único] Crea corregimiento con is_active=true → Responde 201
    → [Duplicado] Responde 409 Conflict
```

### Flujo de Creación de Barrio

```text
Admin envía POST /api/v1/geography/corregimientos/:id/neighborhoods
  → Sistema valida que el corregimiento esté ACTIVO
    → [Activo] Valida nombre único dentro del corregimiento
      → [Único] Crea barrio con is_active=true → Responde 201
      → [Duplicado] Responde 409 Conflict
    → [Inactivo] Responde 400 Bad Request
```

### Flujo de Inactivación en Cascada

```text
Admin inactiva corregimiento
  → Sistema busca todos los barrios activos del corregimiento
    → Marca corregimiento como is_active=false
    → Marca todos sus barrios como is_active=false
    → Registra auditoría para corregimiento y cada barrio
    → Responde 200 OK
```

### Estados

```text
Corregimiento: ACTIVO ↔ INACTIVO (reactivación manual)
Barrio: ACTIVO ↔ INACTIVO (reactivación individual, requiere corregimiento ACTIVO)
```

---

## 9. Casos Límite y Errores

| Caso | Comportamiento Esperado |
|------|------------------------|
| Nombre de corregimiento duplicado | 409 Conflict: "Ya existe un corregimiento con ese nombre" |
| Nombre de barrio duplicado dentro del corregimiento | 409 Conflict: "Ya existe un barrio con ese nombre en este corregimiento" |
| Crear barrio en corregimiento inactivo | 400 Bad Request: "No se puede crear barrio en un corregimiento inactivo" |
| Reactivar barrio con corregimiento inactivo | 400 Bad Request: "El corregimiento padre está inactivo" |
| Coordenadas GPS fuera de rango | 422 Unprocessable: "Coordenadas GPS inválidas" |
| Intento de eliminar corregimiento físicamente | 405 Method Not Allowed: "Use inactivación lógica" |
| Consultar árbol sin corregimientos | 200 OK con array vacío |
| Corregimiento con barrios activos al inactivar | 200 OK: se inactivan en cascada |

---

## 10. Criterios de Aceptación (Gherkin / Given-When-Then)

```gherkin
Feature: Gestión Geográfica

  Scenario: Crear corregimiento exitosamente
    Given el Administrador está autenticado
    When envía POST /api/v1/geography/corregimientos con nombre "Cascajal"
    Then se crea el corregimiento con estado ACTIVO
    And se registra evento de auditoría

  Scenario: Crear corregimiento con nombre duplicado
    Given ya existe un corregimiento "Cascajal"
    When el Admin envía POST con nombre "Cascajal"
    Then recibe respuesta 409 Conflict

  Scenario: Crear barrio en corregimiento activo
    Given el corregimiento "Cascajal" está ACTIVO
    When el Admin crea barrio "La Esperanza" en Cascajal
    Then se crea el barrio con estado ACTIVO

  Scenario: Crear barrio en corregimiento inactivo
    Given el corregimiento "Isabel López" está INACTIVO
    When el Admin intenta crear un barrio en Isabel López
    Then recibe respuesta 400 Bad Request

  Scenario: Inactivar corregimiento con barrios activos
    Given "Cascajal" tiene 3 barrios activos
    When el Admin inactiva "Cascajal"
    Then "Cascajal" queda INACTIVO
    And los 3 barrios quedan INACTIVOS

  Scenario: Reactivar barrio individualmente
    Given "La Esperanza" está INACTIVO y "Cascajal" está ACTIVO
    When el Admin reactiva "La Esperanza"
    Then "La Esperanza" queda ACTIVO
    And "Cascajal" sigue ACTIVO

  Scenario: Reactivar barrio con corregimiento inactivo
    Given "La Peña" está INACTIVO y su corregimiento también
    When el Admin intenta reactivar "La Peña"
    Then recibe respuesta 400 Bad Request

  Scenario: Censista consulta árbol geográfico
    Given existen corregimientos y barrios activos
    When el Censista consulta GET /api/v1/geography/tree
    Then recibe el árbol jerárquico completo en modo lectura

  Scenario: Barrio con coordenadas GPS
    Given el corregimiento "Cascajal" está ACTIVO
    When el Admin crea barrio "Centro" con lat 10.7563 and lng -74.8235
    Then se guarda las coordenadas correctamente

  Scenario: Coordenadas GPS inválidas
    When el Admin crea barrio con lat 999.0
    Then recibe respuesta 422 con error de validación
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias
- Validación de nombre único (case-insensitive).
- Validación de coordenadas GPS.
- Lógica de inactivación en cascada.
- Transiciones de estado (ACTIVO ↔ INACTIVO).

### Pruebas de Integración
- CRUD completo de corregimientos y barrios contra DB de prueba.
- Verificación de restricciones UNIQUE compuestas.
- Cascada de inactivación real en base de datos.

### Pruebas End-to-End (E2E)
- Flujo completo: crear corregimiento → crear barrios → inactivar → verificar cascada.
- Árbol jerárquico completo desde la API.

### Criterio de Cobertura
- Cobertura mínima de código: 85%.
- Todos los escenarios Gherkin DEBEN tener al menos una prueba automatizada.
