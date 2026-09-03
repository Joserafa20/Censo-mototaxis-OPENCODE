# Design: 012 — Censo Ampliado (3 Tipos de Vehiculo)

## Technical Approach

Extender `CensusRecord` con discriminante `vehicleType` y 7 campos condicionales. Validacion unica via Zod `discriminatedUnion('vehicleType')` en `census.schema.ts` (presentacion) replicada en use-cases para I/O (`stationId` activa, `tarifaValor>0`). Infra: 8 columnas en `CensusRecordEntity` (solo `vehicleType` NOT NULL DEFAULT `MOTOTAXI`), indice `idx_census_vehicleType`, migracion idempotente. Frontend `CensusForm` con selector `vehicleType` primero y render condicional con validacion espejo.

## Architecture Decisions

### Decision: discriminatedUnion como fuente unica

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Schemas separados sin discriminante | Duplica logica, desync front/back | Rejected |
| `z.discriminatedUnion('vehicleType', [...])` | Falla rapido por discriminante, errores por rama, <100ms | **Chosen** |

**Rationale**: Cumple RNF-004; front importa mismo schema, 400 con `errors[{field,code}]` por rama.

### Decision: stationId validado en use-case

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Solo Zod uuid | No verifica `is_active` | Rejected |
| Zod forma + `IStationRepository.findById` en use-case | Cubre RN-009; <300ms con I/O (RNF-001) | **Chosen** |

**Rationale**: Requiere I/O; use-case lanza `STATION_NOT_ACTIVE` -> 400.

### Decision: Columnas nullable + DEFAULT

| Option | Tradeoff | Decision |
|--------|----------|----------|
| CHECKs condicionales en DB | Rigido, bloquea legacy | Rejected |
| 7 cols NULL + `vehicleType` NOT NULL DEFAULT 'MOTOTAXI' + CHECK `tarifaValor>0` + FK `stationId` | Idempotente, validacion en app | **Chosen** |

**Rationale**: RNF-003 exige reversible/idempotente; DB solo asegura `tarifaValor>0` y FK.

### Decision: VOs enum + helpers puntuales

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Clase VO por cada enum | Verboso | Rejected |
| `z.enum` para enums + clases `TarifaValor`/`ActividadMotocarro` | Solo logica (`>0`, `trim>=2`) encapsulada | **Chosen** |

**Rationale**: Consistente con `MototaxiCedula`/`Coordinates`; enums cerrados los valida Zod.

## Data Flow

```
CensusForm (vehicleType primero) -> census.schema.ts (discriminatedUnion) -> POST /census-records
 -> validate(schema) -> CensusController -> CreateCensusRecordUseCase (VOs + station is_active)
  -> ICensusRecordRepository.save -> CensusRecordEntity (8 cols) -> DB
 <- 201 {id, vehicleType} | 400 {errors[{field,code,vehicleType}]}
Legacy GET /:id -> mapper vehicleType ?? 'MOTOTAXI' -> 200
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/value-objects/VehicleType.ts` | Create | `z.enum(['MOTO_FAMILIAR','MOTOTAXI','MOTOCARRO'])` + type |
| `src/domain/value-objects/OwnershipType.ts` | Create | `z.enum(['PROPIA','PAGA_TARIFA'])` |
| `src/domain/value-objects/OperationMode.ts` | Create | `z.enum(['ESTACION','CIRCULANTE'])` |
| `src/domain/value-objects/Horario.ts` | Create | `z.enum(['DIURNO','NOCTURNO'])` |
| `src/domain/value-objects/TarifaValor.ts` | Create | `create(v)` valida decimal >0 |
| `src/domain/value-objects/ActividadMotocarro.ts` | Create | `create(v)` valida trim >=2 <=150 |
| `src/domain/entities/CensusRecord.ts` | Modify | Añade 8 campos + defaults en `createCensusRecord` |
| `src/domain/errors/CensusErrors.ts` | Modify | `INVALID_VEHICLE_TYPE`, `INVALID_TARIFA`, `STATION_NOT_ACTIVE`, `REQUIRED_ACTIVIDAD`, `REQUIRED_DOCUMENTOS` (400) |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modify | 8 columnas, `@Index(['vehicleType'])`, CHECK `tarifaValor>0` |
| `src/infrastructure/database/migrations/1710000000012-AddCensoAmpliadoColumns.ts` | Create | ALTER ADD, UPDATE legacy, CREATE INDEX; down condicional |
| `src/infrastructure/repositories/TypeormCensusRecordRepository.ts` | Modify | Mapper legacy `?? 'MOTOTAXI'`, persiste 8 cols |
| `src/application/use-cases/CreateCensusRecordUseCase.ts` | Modify | Inyecta `IStationRepository`, validacion discriminada |
| `src/application/use-cases/UpdateCensusRecordUseCase.ts` | Modify | Misma validacion para edit |
| `src/presentation/validators/census.schema.ts` | Create | `discriminatedUnion` + `superRefine` (stationId/tarifaValor) |
| `src/presentation/controllers/CensusController.ts` | Modify | `safeParse` + map ZodError -> 400 `{errors, vehicleType}` |
| `src/presentation/routes/census-records.routes.ts` | Modify | `validate(censusCreateSchema)` en POST/PATCH |
| `frontend/src/features/census/CensusForm.tsx` | Create | Selector primero, `useWatch` condicional, limpia campos, fetch estaciones activas |
| `frontend/src/features/census/census.schema.ts` | Create | Re-export espejo para cliente |

## Interfaces / Contracts

```typescript
type VehicleType = 'MOTO_FAMILIAR'|'MOTOTAXI'|'MOTOCARRO';
type OwnershipType = 'PROPIA'|'PAGA_TARIFA';
type OperationMode = 'ESTACION'|'CIRCULANTE';
type Horario = 'DIURNO'|'NOCTURNO';

interface CensusRecord { // delta sobre 006
  vehicleType: VehicleType; ownershipType: OwnershipType|null;
  operationMode: OperationMode|null; tarifaValor: number|null;
  documentosAlDia: boolean|null; horario: Horario|null;
  actividadMotocarro: string|null; // stationId ya existe
}

const motoFamiliar = z.object({ vehicleType: z.literal('MOTO_FAMILIAR'), documentosAlDia: z.boolean() });
const mototaxi = z.object({
  vehicleType: z.literal('MOTOTAXI'), ownershipType: z.enum(['PROPIA','PAGA_TARIFA']),
  operationMode: z.enum(['ESTACION','CIRCULANTE']), stationId: z.string().uuid().nullable(),
  tarifaValor: z.number().positive().nullable(), documentosAlDia: z.boolean(),
  horario: z.enum(['DIURNO','NOCTURNO']),
}).superRefine((v,c)=>{
  if(v.operationMode==='ESTACION'&&!v.stationId) c.addIssue({code:'custom',path:['stationId'],message:'STATION_NOT_ACTIVE'});
  if(v.ownershipType==='PAGA_TARIFA'&&!(v.tarifaValor!>0)) c.addIssue({code:'custom',path:['tarifaValor'],message:'INVALID_TARIFA'});
});
const motocarro = z.object({
  vehicleType: z.literal('MOTOCARRO'), ownershipType: z.enum(['PROPIA','PAGA_TARIFA']),
  actividadMotocarro: z.string().trim().min(2).max(150), tarifaValor: z.number().positive().nullable(),
  documentosAlDia: z.boolean().nullable(),
}).superRefine((v,c)=>{
  if(v.ownershipType==='PAGA_TARIFA'&&v.tarifaValor===null) c.addIssue({code:'custom',path:['tarifaValor'],message:'INVALID_TARIFA'});
  if(v.ownershipType==='PAGA_TARIFA'&&v.documentosAlDia===null) c.addIssue({code:'custom',path:['documentosAlDia'],message:'REQUIRED_DOCUMENTOS'});
});
export const censusCreateSchema = z.discriminatedUnion('vehicleType', [motoFamiliar, mototaxi, motocarro]);

// 400 { errors:[{field, code, message}], vehicleType } codes: INVALID_VEHICLE_TYPE | STATION_NOT_ACTIVE | INVALID_TARIFA | REQUIRED_ACTIVIDAD | REQUIRED_DOCUMENTOS
// POST /census-records -> 201 {id, vehicleType} | 400  ; GET /:id legacy -> 200 {vehicleType:'MOTOTAXI'}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | VOs `TarifaValor` (0/-1/NaN/string) y `ActividadMotocarro` (trim/min) | Jest |
| Unit | `census.schema.ts` 16 escenarios Gherkin (400 por campo + 201) | Jest `safeParse` |
| Unit | Use-case `stationId` is_active mock | Jest mock `IStationRepository` |
| Integration | POST matriz por tipo + estacion activa/inactiva, verifica FK/CHECK | Supertest + test DB |
| Integration | Migracion legacy NULL->MOTOTAXI, on-read, idempotencia | TypeORM migration |
| E2E | CensusForm selector primero, condicional, espejo Zod bloquea/corrige ->201 | Playwright |

Cobertura: 85% en `census.schema.ts`/`CreateCensusRecordUseCase`/`CensusRecord`; 100% Gherkin (16).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Migracion añade 7 NULL + `vehicleType` DEFAULT 'MOTOTAXI', `UPDATE WHERE NULL`, indice y CHECK. Down solo si `0` registros con `vehicleType != 'MOTOTAXI'`. Mapper `?? 'MOTOTAXI'` cubre nodos sin migrar. Flag `CENSO_AMPLIADO_ENABLED` (default true) para rollback sin DROP.

## Open Questions

- [ ] ¿ `tarifaValor` decimal(10,2) vs integer centavos? Se sigue decimal por SPEC.
- [ ] ¿ `actividadMotocarro` catalogo cerrado? SPEC dice texto libre >=2; se usa varchar(150) libre.
