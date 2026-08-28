# Design: 006 — Datos del Mototaxista

## Technical Approach

Implementación del módulo de datos del mototaxista siguiendo Clean Architecture (Domain → Application → Infrastructure → Presentation). El módulo gestura registros de censo que vinculan datos personales del mototaxista, datos de la motocicleta y ubicación geográfica, integrándose con los módulos existentes de Geografía (004) y Estaciones (005).

---

## Architecture Decisions

### Decision: Entidad única `census_records` vs. entidades separadas (Mototaxista + Motocicleta)

**Choice**: Entidad única `census_records` con datos del mototaxista y motocicleta embebidos.

**Alternatives considered**:
- Entidades separadas `mototaxistas` y `motorcycles` con relación N:1.
- Tabla normalizada con direcciones normalizadas.

**Rationale**: El sistema es un CENSO — cada registro es un snapshot completo. No hay nécessairement una relación 1:N (un mototaxista puede cambiar de moto). La estructura plana simplifica queries, reducir joins, y facilita exportación de datos. La normalización excesiva complicaría el offline-first.

### Decision: Enum `operation_type` vs. relación nullable con stations

**Choice**: Campo `operation_type` ENUM('station', 'independent') + FK nullable a `stations`.

**Alternatives considered**:
- Solo FK nullable (sin enum, inferir tipo por presencia de station_id).
- Tabla polimórfica de asignación.

**Rationale**: El enum hace explícita la intención y facilita validaciones en dominio. La FK nullable mantiene la integridad referencial. Inferir el tipo por la FK sería frágil y propenso a errores.

### Decision: Búsqueda por cédula/placa en índices vs. servicio de búsqueda

**Choice**: Índices únicos en BD + query directa.

**Alternatives considered**:
- Elasticsearch o servicio de búsqueda dedicado.
- Búsqueda por ILIKE sin índices.

**Rationale**: Con < 10,000 registros esperados (censo municipal), índices únicos + query directa es suficiente. Elasticsearch sería over-engineering. ILIKE sin índice sería lento.

### Decision: Sin reactivación de registros

**Choice**: Registros inactivos no se reactivan; se crea un nuevo registro.

**Alternatives considered**:
- Permitir reactivación con validación.
- Soft delete con campo `deactivated_at` y `reactivated_at`.

**Rationale**: Un censo es un snapshot temporal. Reactivar un registro viejo podría introducir datos desactualizados. Es más limpio crear un nuevo registro vinculado al mismo mototaxista (cédula) en un nuevo período.

### Decision: Auditoría en tabla separada vs. columnas de auditoría

**Choice**: Tabla `census_audit` separada con `entity_type`, `entity_id`, `action`, `actor_user_id`, `details` JSONB.

**Alternatives considered**:
- Columnas `created_by`, `updated_by`, `last_modified_at` en la misma tabla.
- Event sourcing.

**Rationale**: Consistente con el patrón de `geography_audit` existente. Permite historial completo sin polluting la tabla principal. JSONB para detalles flexibles.

---

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Presentation │ ──→ │ Application  │ ──→ │    Domain       │ ──→ │Infrastructure│
│ Controller   │     │  Use Cases   │     │  Entities +     │     │ TypeORM      │
│ Routes       │     │              │     │  Value Objects  │     │ Repositories │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
       │                    │                     │                      │
       │                    │                     │                      │
       ▼                    ▼                     ▼                      ▼
  HTTP Request      Validate +            Domain Rules            TypeORM Entities
  to JSON           Orchestrate           Value Objects           DB Operations
                    Business Logic        Error Types
```

### Flujo de Creación

```
POST /api/v1/census-records
  → CensusController.createRecord()
    → CreateCensusRecordUseCase.execute()
      → ICensusPeriodRepository.findActive()     // Validate period
      → ICensusRecordRepository.findByCedula()   // Validate uniqueness
      → ICensusRecordRepository.findByPlate()    // Validate uniqueness
      → ICorregimientoRepository.findById()      // Validate geography
      → IStationRepository.findById()            // Validate station (if applicable)
      → Coordinates.create()                     // Validate GPS (if provided)
      → createCensusRecord()                     // Domain entity factory
      → ICensusRecordRepository.save()           // Persist
      → ICensusAuditRepository.log()             // Audit
    ← { recordId }
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/entities/CensusRecord.ts` | Create | Domain entity + factory function |
| `src/domain/value-objects/MototaxiCedula.ts` | Create | Value object for cédula validation |
| `src/domain/value-objects/MotorcyclePlate.ts` | Create | Value object for plate validation |
| `src/domain/value-objects/OperationType.ts` | Create | Value object for operation type enum |
| `src/domain/repositories/ICensusRecordRepository.ts` | Create | Repository port |
| `src/domain/repositories/ICensusAuditRepository.ts` | Create | Audit repository port |
| `src/domain/errors/CensusErrors.ts` | Create | Domain errors (DuplicateCedula, etc.) |
| `src/application/use-cases/CreateCensusRecordUseCase.ts` | Create | Create census record use case |
| `src/application/use-cases/ListCensusRecordsUseCase.ts` | Create | List with filters + pagination |
| `src/application/use-cases/SearchCensusRecordsUseCase.ts` | Create | Search by cédula or plate |
| `src/application/use-cases/DeactivateCensusRecordUseCase.ts` | Create | Deactivate with reason |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Create | TypeORM entity |
| `src/infrastructure/database/entities/CensusAuditEntity.ts` | Create | TypeORM audit entity |
| `src/infrastructure/repositories/TypeormCensusRecordRepository.ts` | Create | Repository adapter |
| `src/infrastructure/repositories/TypeormCensusAuditRepository.ts` | Create | Audit repository adapter |
| `src/presentation/controllers/CensusController.ts` | Create | HTTP adapter |
| `src/presentation/routes/census-records.routes.ts` | Create | Express routes |
| `src/domain/entities/index.ts` | Modify | Export CensusRecord |
| `src/domain/repositories/index.ts` | Modify | Export new repos |
| `src/domain/errors/index.ts` | Modify | Export CensusErrors |
| `src/infrastructure/database/entities/index.ts` | Modify | Export TypeORM entities |
| `src/infrastructure/repositories/index.ts` | Modify | Export new repos |
| `src/infrastructure/database/data-source.ts` | Modify | Add entities to DataSource |
| `src/app.ts` | Modify | Wire controller + routes |

---

## Interfaces / Contracts

### Domain Entity

```typescript
export interface CensusRecord {
  id: string;
  periodId: string;
  corregimientoId: string;
  neighborhoodId: string | null;
  stationId: string | null;
  operationType: "station" | "independent";
  mototaxiCedula: string;
  mototaxiFirstName: string;
  mototaxiLastName: string;
  mototaxiPhone: string | null;
  mototaxiAddress: string | null;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleColor: string;
  motorcycleYear: number | null;
  latitude: number | null;
  longitude: number | null;
  status: "active" | "inactive" | "suspended";
  inactiveReason: string | null;
  createdByUserId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Value Objects

```typescript
// MototaxiCedula — validates format and uniqueness
export class MototaxiCedula {
  static create(value: string): MototaxiCedula;
  get value(): string;
}

// MotorcyclePlate — validates format (ABC123 or AB123C)
export class MotorcyclePlate {
  static create(value: string): MotorcyclePlate;
  get value(): string;
}

// OperationType — enum wrapper
export type OperationType = "station" | "independent";
```

### Repository Port

```typescript
export interface CensusRecordListFilters {
  periodId?: string;
  corregimientoId?: string;
  neighborhoodId?: string;
  stationId?: string;
  operationType?: OperationType;
  status?: "active" | "inactive" | "suspended";
  createdByUserId?: string;
  searchTerm?: string;
}

export interface ICensusRecordRepository {
  findById(id: string): Promise<CensusRecord | null>;
  findByCedula(cedula: string): Promise<CensusRecord | null>;
  findByPlate(plate: string): Promise<CensusRecord | null>;
  findAll(filters?: CensusRecordListFilters): Promise<CensusRecord[]>;
  save(record: CensusRecord): Promise<void>;
  deactivateById(id: string, reason: string): Promise<void>;
  countActiveByStationId(stationId: string): Promise<number>;
  countActiveByPeriodId(periodId: string): Promise<number>;
}
```

### Use Case Signatures

```typescript
// CreateCensusRecordUseCase
interface CreateCensusRecordInput {
  periodId: string;
  corregimientoId: string;
  neighborhoodId?: string;
  stationId?: string;
  operationType: "station" | "independent";
  mototaxiCedula: string;
  mototaxiFirstName: string;
  mototaxiLastName: string;
  mototaxiPhone?: string;
  mototaxiAddress?: string;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleColor: string;
  motorcycleYear?: number;
  latitude?: number;
  longitude?: number;
}
interface CreateCensusRecordOutput { recordId: string; }

// ListCensusRecordsUseCase
interface ListCensusRecordsInput {
  filters?: CensusRecordListFilters;
  page?: number;
  pageSize?: number;
}
interface ListCensusRecordsOutput {
  records: CensusRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// SearchCensusRecordsUseCase
interface SearchCensusRecordsInput { searchTerm: string; }
interface SearchCensusRecordsOutput { records: CensusRecord[]; }

// DeactivateCensusRecordUseCase
interface DeactivateCensusRecordInput { recordId: string; reason: string; }
interface DeactivateCensusRecordOutput { success: boolean; }
```

### API Routes

```
POST   /api/v1/census-records                    - Create (censista)
GET    /api/v1/census-records                    - List (admin: all, censista: own)
GET    /api/v1/census-records/search?q=term      - Search by cédula/plate
GET    /api/v1/census-records/:id                - Get by ID
PATCH  /api/v1/census-records/:id/deactivate     - Deactivate (admin)
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Cédula/plate validation, operation type rules, GPS validation | Jest unit tests with domain entities |
| Unit | Duplicate detection logic | Mock repositories, test use case orchestration |
| Integration | CRUD against SQLite test DB | TypeORM with test data-source |
| Integration | UNIQUE constraints (cédula, plate) | Expect TypeORM unique constraint errors |
| Integration | Audit logging | Verify census_audit records created |
| E2E | Full flow: create → search → deactivate | Supertest against Express app |

---

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

---

## Migration / Rollout

1. **DDL migration**: Create `census_records` and `census_audit` tables.
2. **Seed data**: None required (data comes from census operations).
3. **Feature flag**: Not required — module is additive.
4. **No breaking changes**: Existing modules unaffected.

---

## Open Questions

- [ ] ¿El `motorcycle_year` debe ser validado contra un rango razonable (ej. 1990-2026)?
- [ ] ¿Debe existir un límite de registros por censista por día?
- [ ] ¿El campo `suspended` se usa en este módulo o se reserva para futuro?
- [ ] ¿La búsqueda debe soportar acentos (cédula con nombre)?
