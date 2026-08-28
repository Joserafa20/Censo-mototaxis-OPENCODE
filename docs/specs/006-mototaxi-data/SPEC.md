# SPEC 006 — Datos del Mototaxista

## 1. Objetivo

Definir los requisitos técnicos y funcionales del módulo de datos del mototaxista del Sistema de Censo de Mototaxis de Sabanalarga. Este módulo permite registrar, consultar y gestionar la información personal del mototaxista, su motocicleta y el registro de censo que los vincula geográficamente.

---

## 2. Contexto y Justificación

El censo de mototaxis de Sabanalarga requiere capturar datos completos de cada mototaxista que opera en el municipio. La información incluye:
- **Datos personales del mototaxista**: cédula, nombre, teléfono, dirección.
- **Datos de la motocicleta**: placa, marca, modelo, color, año.
- **Registro de censo**: vincula al mototaxista con su motocicleta, ubicación geográfica, estación (si aplica) y período de censo.

Este módulo es el corazón del sistema de censo, ya que contiene los datos que serán consultados, exportados y analizados en módulos posteriores.

---

## 3. Alcance

### In Scope
- CRUD de registros de censo (crear, editar, listar, inactivar).
- Gestión de datos del mototaxista (cédula, nombre, teléfono, dirección).
- Gestión de datos de la motocicleta (placa, marca, modelo, color, año).
- Validación de unicidad de cédula y placa.
- Vinculación con geografía (corregimiento, barrio) y estación.
- Vinculación con período de censo activo.
- Registro de estado del mototaxista (activo, inactivo, suspendido).
- Registro de tipo de operación (estación o independiente).
- Coordenadas GPS opcionales de ubicación habitual.
- Auditoría de cambios en registros de censo.

### Out of Scope
- Gestión de licencias o documentos legales (va en módulo futuro).
- Historial de ingresos o facturación.
- Seguimiento GPS en tiempo real.
- Asignación de rutas o recorridos.

---

## 4. Actores y Permisos

| Actor | Permisos |
|-------|----------|
| **Administrador** | Crear, editar, inactivar registros de censo. Consultar todos los registros. |
| **Funcionario Censista** | Crear registros de censo. Consultar registros propios. |
| **Sistema** | Validar unicidad, consistencia geográfica, período activo. |

---

## 5. Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-001 | El sistema DEBE permitir al Censista crear registros de censo con datos completos | Alta |
| RF-002 | El sistema DEBE validar que la cédula sea única en el sistema | Alta |
| RF-003 | El sistema DEBE validar que la placa sea única en el sistema | Alta |
| RF-004 | El sistema DEBE vincular cada registro a un corregimiento y barrio ACTIVOS | Alta |
| RF-005 | El sistema DEBE vincular cada registro a un período de censo ACTIVO | Alta |
| RF-006 | El sistema DEBE permitir asociar un registro a una estación (opcional) | Alta |
| RF-007 | El sistema DEBE registrar el tipo de operación (estación/independiente) | Alta |
| RF-008 | El sistema DEBE permitir coordenadas GPS opcionales de ubicación habitual | Media |
| RF-009 | El sistema DEBE permitir al Admin listar todos los registros con filtros | Alta |
| RF-010 | El sistema DEBE permitir al Censista listar sus propios registros | Alta |
| RF-011 | El sistema DEBE permitir inactivar registros (sin DELETE físico) | Alta |
| RF-012 | El sistema DEBE registrar cada cambio en tabla de auditoría | Media |
| RF-013 | El sistema DEBE registrar el motivo de inactivación | Media |
| RF-014 | El sistema DEBE permitir buscar registros por cédula o placa | Alta |

### Requisitos No Funcionales

| ID | Requisito | Categoría |
|----|-----------|-----------|
| RNF-001 | La búsqueda por cédula o placa DEBE responder en < 100ms | Rendimiento |
| RNF-002 | La lista de registros DEBE soportar paginación | Escalabilidad |
| RNF-003 | Los registros DEBEN cachearse en el cliente para modo offline | Disponibilidad |
| RNF-004 | Los cambios DEBEN ser auditables con timestamp y actor | Cumplimiento |

---

## 6. Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-001 | La cédula del mototaxista DEBE ser única en todo el sistema. |
| RN-002 | La placa de la motocicleta DEBE ser única en todo el sistema. |
| RN-003 | Un registro de censo DEBE estar vinculado a un período de censo ACTIVO al momento de creación. |
| RN-004 | El corregimiento y barrio del registro DEBEN estar ACTIVOS. |
| RN-005 | Si el tipo de operación es "estación", DEBE existir una estación ACTIVA asignada. |
| RN-006 | Si el tipo de operación es "independiente", NO debe tener estación asignada. |
| RN-007 | Los registros NO se eliminan físicamente (solo inactivación lógica). |
| RN-008 | Un registro inactivo NO puede ser reactivado (se crea uno nuevo). |
| RN-009 | Las coordenadas GPS son opcionales pero DEBEN estar en rango válido. |
| RN-010 | El Censista solo puede ver y crear registros, no editar ni inactivar. |

---

## 7. Modelo de Datos

### Tabla: `census_records`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `period_id` | UUID (FK → census_periods.id) | Período de censo |
| `corregimiento_id` | UUID (FK → corregimientos.id) | Corregimiento |
| `neighborhood_id` | UUID (FK → neighborhoods.id) NULL | Barrio (opcional) |
| `station_id` | UUID (FK → stations.id) NULL | Estación (opcional) |
| `operation_type` | ENUM('station', 'independent') | Tipo de operación |
| `mototaxi_cedula` | VARCHAR(20) | Cédula del mototaxista |
| `mototaxi_first_name` | VARCHAR(100) | Nombre del mototaxista |
| `mototaxi_last_name` | VARCHAR(100) | Apellido del mototaxista |
| `mototaxi_phone` | VARCHAR(20) NULL | Teléfono (opcional) |
| `mototaxi_address` | VARCHAR(255) NULL | Dirección (opcional) |
| `motorcycle_plate` | VARCHAR(10) | Placa de la motocicleta |
| `motorcycle_brand` | VARCHAR(50) | Marca |
| `motorcycle_model` | VARCHAR(50) | Modelo |
| `motorcycle_color` | VARCHAR(30) | Color |
| `motorcycle_year` | INTEGER NULL | Año (opcional) |
| `latitude` | DECIMAL(10,8) NULL | Latitud GPS |
| `longitude` | DECIMAL(11,8) NULL | Longitud GPS |
| `status` | ENUM('active', 'inactive', 'suspended') | Estado |
| `inactive_reason` | VARCHAR(255) NULL | Motivo de inactivación |
| `created_by_user_id` | UUID (FK → users.id) | Censista que creó |
| `is_active` | BOOLEAN | Activo/inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

**Restricciones:**
- UNIQUE(mototaxi_cedula) — cédula única global.
- UNIQUE(motorcycle_plate) — placa única global.
- CHECK(operation_type = 'station' AND station_id IS NOT NULL) OR (operation_type = 'independent' AND station_id IS NULL).

### Tabla: `census_audit`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `entity_type` | ENUM('census_record') | Tipo de entidad |
| `entity_id` | UUID | ID del registro |
| `action` | ENUM('created', 'updated', 'deactivated') | Acción |
| `actor_user_id` | UUID (FK → users.id) | Usuario que realizó |
| `details` | JSONB | Detalles del cambio |
| `created_at` | TIMESTAMP | Momento de la acción |

---

## 8. Flujos y Diagramas de Estado

### Flujo de Creación de Registro de Censo

```text
Censista envía POST /api/v1/census-records
  → Sistema valida período de censo ACTIVO
  → Sistema valida unicidad de cédula
  → Sistema valida unicidad de placa
  → Sistema valida que corregimiento y barrio estén ACTIVOS
  → Sistema valida coherencia tipo operación ↔ estación
    → [Válido] Crea registro con status=active → Responde 201
    → [Cédula duplicada] Responde 409 Conflict
    → [Placa duplicada] Responde 409 Conflict
    → [Período inactivo] Responde 400 Bad Request
    → [Geografía inactiva] Responde 400 Bad Request
    → [Estación requerida] Responde 400 Bad Request
```

### Flujo de Búsqueda

```text
Admin/Censista envía GET /api/v1/census-records?search=12345
  → Sistema busca por cédula o placa
  → Retorna resultados paginados
```

### Estados

```text
Registro de censo: ACTIVE ↔ INACTIVE (solo inactivación, no reactivación)
                   SUSPENDED (para casos especiales)
```

---

## 9. Casos Límite y Errores

| Caso | Comportamiento Esperado |
|------|------------------------|
| Cédula duplicada | 409 Conflict: "Ya existe un registro con esta cédula" |
| Placa duplicada | 409 Conflict: "Ya existe un registro con esta placa" |
| Crear en período inactivo | 400 Bad Request: "No hay período de censo activo" |
| Crear en corregimiento inactivo | 400 Bad Request: "El corregimiento está inactivo" |
| Estación requerida sin asignar | 400 Bad Request: "Debe asignar una estación" |
| Estación asignada con tipo independiente | 400 Bad Request: "No puede asignar estación a independiente" |
| Coordenadas GPS fuera de rango | 422 Unprocessable: "Coordenadas GPS inválidas" |
| Censista intenta editar registro | 403 Forbidden: "No tiene permisos" |
| Buscar sin resultados | 200 OK con array vacío |

---

## 10. Criterios de Aceptación (Gherkin)

```gherkin
Feature: Datos del Mototaxista

  Scenario: Crear registro de censo exitosamente
    Given el Censista está autenticado
    And existe período de censo ACTIVO
    And el corregimiento "Cascajal" está ACTIVO
    When crea registro con cédula "1234567890", placa "ABC123", nombre "Juan Pérez"
    Then se crea el registro con status ACTIVE
    And se registra auditoría

  Scenario: Cédula duplicada
    Given ya existe registro con cédula "1234567890"
    When el Censista crea otro registro con cédula "1234567890"
    Then recibe 409 Conflict

  Scenario: Placa duplicada
    Given ya existe registro con placa "ABC123"
    When el Censista crea registro con placa "ABC123"
    Then recibe 409 Conflict

  Scenario: Crear registro con estación
    Given el Censista está autenticado
    And existe estación "Estación Terminal" ACTIVA en Cascajal
    When crea registro con tipo "station" y estación "Estación Terminal"
    Then se crea el registro con estación asignada

  Scenario: Crear registro independiente
    Given el Censista está autenticado
    When crea registro con tipo "independent" sin estación
    Then se crea el registro sin estación

  Scenario: Estación requerida sin asignar
    Given el Censista está autenticado
    When crea registro con tipo "station" sin estación
    Then recibe 400 Bad Request

  Scenario: Buscar por cédula
    Given existen registros con cédula "1234567890"
    When Admin busca "1234567890"
    Then retorna el registro correspondiente

  Scenario: Buscar por placa
    Given existen registros con placa "ABC123"
    When Admin busca "ABC123"
    Then retorna el registro correspondiente

  Scenario: Inactivar registro
    Given existe registro activo
    When Admin inactiva el registro con motivo "Cambió de municipio"
    Then el registro queda INACTIVE
    And se registra el motivo de inactivación

  Scenario: Censista consulta sus registros
    Given el Censista creó 3 registros
    When consulta sus registros
    Then solo ve los 3 registros que creó

  Scenario: Admin consulta todos los registros
    Given existen 10 registros de distintos censistas
    When Admin consulta la lista
    Then ve los 10 registros
```

---

## 11. Estrategia de Pruebas

### Pruebas Unitarias
- Validación de unicidad de cédula y placa.
- Validación de coherencia tipo operación ↔ estación.
- Validación de coordenadas GPS.
- Validación de estado y transiciones.

### Pruebas de Integración
- CRUD completo de registros de censo.
- Verificación de restricciones UNIQUE.
- Búsqueda por cédula y placa.
- Auditoría de cambios.

### Pruebas End-to-End (E2E)
- Flujo completo: crear registro → buscar → inactivar.
- Flujo con estación: crear con estación → verificar asignación.

### Criterio de Cobertura
- Cobertura mínima: 85%.
- Todos los escenarios Gherkin DEBEN tener prueba automatizada.
