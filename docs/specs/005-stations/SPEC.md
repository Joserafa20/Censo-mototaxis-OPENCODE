# SPEC 005 — Estaciones de Mototaxis

## 1. Objetivo

Definir los requisitos técnicos y funcionales del módulo de gestión de Estaciones de Mototaxis del Sistema de Censo. Este módulo permite administrar los puntos físicos de operación (estaciones) y los mototaxistas independientes que operan fuera de una estación.

---

## 2. Contexto y Justificación

En Sabanalarga, los mototaxistas operan desde dos contextos:
- **Estaciones de Mototaxis:** Puntos físicos fijos (ej. "Estación Terminal", "Estación Centro") donde múltiples mototaxistas están agrupados.
- **Mototaxistas Independientes:** Operan sin estación asignada, de forma libre por el municipio.

El sistema debe diferenciar这两种 situaciones para estadísticas, asignación geográfica y control.

---

## 3. Alcance

### In Scope
- CRUD de estaciones de mototaxis (crear, editar, listar, inactivar).
- Asignación de mototaxistas a una estación.
- Registro de mototaxistas independientes (sin estación).
- Ubicación geográfica de estaciones (corregimiento + barrio + GPS opcional).
- Conteo de mototaxistas por estación.
- Inactivación lógica de estaciones.

### Out of Scope
- Gestión de rutas o recorridos.
- Tarifas o precios por estación.
- Mapas interactivos de estaciones (va en Módulo 015).

---

## 4. Actores y Permisos

| Actor | Permisos |
|-------|----------|
| **Administrador** | Crear, editar, inactivar estaciones. Asignar/desasignar mototaxistas. |
| **Funcionario Censista** | Consultar estaciones para ubicar sus registros de censo. Seleccionar estación al crear un censo. |

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE permitir al Admin crear estaciones con nombre único | Alta |
| RF-002 | El sistema DEBE asociar cada estación a un corregimiento y barrio | Alta |
| RF-003 | El sistema DEBE permitir coordenadas GPS opcionales por estación | Media |
| RF-004 | El sistema DEBE listar estaciones con conteo de mototaxistas asignados | Alta |
| RF-005 | El sistema DEBE permitir inactivar estaciones (sin DELETE) | Alta |
| RF-006 | El sistema DEBE diferenciar mototaxistas de estación vs. independientes | Alta |
| RF-007 | El sistema DEBE permitir al Censista consultar estaciones en modo lectura | Alta |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | La lista de estaciones DEBE cargarse en < 200ms | Rendimiento |
| RNF-002 | Las estaciones DEBEN cachearse en el cliente para modo offline | Disponibilidad |

---

## 6. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | El nombre de la estación DEBE ser único dentro del corregimiento. |
| RN-002 | Una estación solo puede pertenecer a un corregimiento. |
| RN-003 | Al inactivar una estación, los mototaxistas asignados quedan como "independientes" (sin estación). |
| RN-004 | Un mototaxista NO puede estar asignado a más de una estación activa simultáneamente. |
| RN-005 | Los registros geográficos (corregimiento, barrio) de la estación deben estar ACTIVOS. |
| RN-006 | Las estaciones NO se eliminan físicamente (inactivación lógica). |

---

## 7. Modelo de Datos Afectado

### Tabla: `stations`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `name` | VARCHAR(150) | Nombre de la estación |
| `corregimiento_id` | UUID (FK → corregimientos.id) | Corregimiento donde está ubicada |
| `neighborhood_id` | UUID (FK → neighborhoods.id) NULL | Barrio (opcional) |
| `latitude` | DECIMAL(10,8) NULL | Latitud GPS |
| `longitude` | DECIMAL(11,8) NULL | Longitud GPS |
| `is_active` | BOOLEAN | Estado activo/inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

**Restricción:** UNIQUE(name, corregimiento_id) — nombre único por corregimiento.

### Tabla: `station_agents` (relación mototaxista ↔ estación)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `station_id` | UUID (FK → stations.id) | Estación |
| `census_record_id` | UUID (FK) | Registro de censo del mototaxista |
| `assigned_at` | TIMESTAMP | Fecha de asignación |
| `unassigned_at` | TIMESTAMP NULL | Fecha de desasignación (NULL = activo) |

---

## 8. Flujos y Diagramas de Estado

### Flujo de Creación de Estación

```text
Admin envía POST /api/v1/stations
  → Sistema valida nombre único en el corregimiento
  → Sistema valida que corregimiento y barrio estén ACTIVOS
    → [Válido] Crea estación con is_active=true → Responde 201
    → [Nombre duplicado] Responde 409 Conflict
    → [Corregimiento inactivo] Responde 400 Bad Request
```

### Flujo de Asignación de Mototaxista

```text
Admin asigna mototaxista a estación
  → Sistema verifica que el mototaxista no tenga estación activa actualmente
    → [Sin estación] Crea asignación → Responde 201
    → [Ya tiene estación] Responde 409 Conflict
```

### Estados

```text
Estación: ACTIVA ↔ INACTIVO (inactivación lógica)
Asignación: ACTIVA (unassigned_at = NULL) → DESASIGNADA (unassigned_at = timestamp)
```

---

## 9. Casos Límite y Errores

| Caso | Comportamiento Esperado |
|------|------------------------|
| Nombre duplicado en mismo corregimiento | 409 Conflict |
| Asignar mototaxista que ya tiene estación | 409 Conflict |
| Inactivar estación con mototaxistas | 200 OK (quedan independientes) |
| Crear estación en corregimiento inactivo | 400 Bad Request |
| Listar estaciones sin datos | 200 OK con array vacío |

---

## 10. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Gestión de Estaciones de Mototaxis

  Scenario: Crear estación exitosamente
    Given el Admin está autenticado
    And existe el corregimiento "Cascajal" ACTIVO
    When crea estación "Estación Terminal" en Cascajal
    Then se crea con estado ACTIVO

  Scenario: Nombre duplicado en mismo corregimiento
    Given ya existe "Estación Terminal" en Cascajal
    When el Admin crea otra "Estación Terminal" en Cascajal
    Then recibe 409 Conflict

  Scenario: Inactivar estación libera mototaxistas
    Given "Estación Terminal" tiene 3 mototaxistas asignados
    When el Admin inactiva "Estación Terminal"
    Then la estación queda INACTIVA
    And los 3 mototaxistas quedan sin estación (independientes)

  Scenario: Censista consulta estaciones
    Given existen estaciones activas
    When el Censista consulta GET /api/v1/stations
    Then recibe la lista de estaciones activas

  Scenario: Asignar mototaxista a estación
    Given "Estación Terminal" está ACTIVA
    And el mototaxista no tiene estación asignada
    When el Admin asigna el mototaxista a "Estación Terminal"
    Then se crea la asignación

  Scenario: Mototaxista ya tiene estación
    Given el mototaxista ya está en "Estación Centro"
    When el Admin intenta asignarlo a "Estación Terminal"
    Then recibe 409 Conflict
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias
- Validación de nombre único por corregimiento.
- Lógica de inactivación y liberación de mototaxistas.
- Validación de doble asignación.

### Pruebas de Integración
- CRUD completo de estaciones.
- Asignación y desasignación de mototaxistas.
- Verificación de restricciones.

### Criterio de Cobertura
- Cobertura mínima: 85%.
- Todos los escenarios Gherkin DEBEN tener prueba automatizada.
