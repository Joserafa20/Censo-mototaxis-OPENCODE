# Proposal: 012 — Censo Ampliado (3 Tipos de Vehículo)

## Intent

Censo era solo mototaxis. Municipio exige 3 tipos: MOTO FAMILIAR, MOTOTAXI y MOTOCARRO, cada uno con validaciones propias. Sin esto el censo no cubre el territorio.

## Scope

### In Scope
- Enum `vehicleType`: `MOTO_FAMILIAR`|`MOTOTAXI`|`MOTOCARRO` en `CensusRecord`
- Campos condicionales + validaciones por tipo
- Formulario dinámico según `vehicleType`
- Mantener existente (personales, moto marca/modelo/placa, geografía) + lo nuevo
- Migración legacy → `MOTOTAXI` default

### Out of Scope
- Reportes por tipo, cambios en estaciones/periodos/roles, biometría/OCR

## Capabilities

### New Capabilities
- `census-vehicle-type`: enum y discriminación por tipo

### Modified Capabilities
- `census-records` (006): `CensusRecord` + campos condicionales, validación por tipo, use-cases y rutas

> `openspec/specs/` no existe; `census-records` = dominio 006. `sdd-spec` lo crea como `ADDED` si no hay base.

## Approach

Extender `CensusRecord` con `vehicleType`, `ownershipType` (`PROPIA`/`PAGA_TARIFA`), `operationMode` (`ESTACION`/`CIRCULANTE`), `stationId`, `tarifaValor`, `documentosAlDia`, `horario` (`DIURNO`/`NOCTURNO`), `actividadMotocarro`. Zod `discriminatedUnion` por `vehicleType`.

**Reglas obligatorias (verbatim):**
- MOTOTAXI: `ownershipType`+`operationMode` oblig.; `ESTACION`→`stationId` requerido; `PAGA_TARIFA`→`tarifaValor` requerido; `documentosAlDia` SI/NO oblig.; `horario` DIURNO/NOCTURNO oblig.
- MOTOCARRO: `actividad` oblig.; `ownershipType` oblig.; `PAGA_TARIFA`→`tarifaValor`+`documentosAlDia` SI/NO oblig.
- MOTO FAMILIAR: solo `documentosAlDia` SI/NO.

API: DTO discriminante, 400 por campo, valida estación activa. Frontend: selector `vehicleType` primero, render condicional, validación espejo Zod.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/entities/CensusRecord.ts` | Modified | `vehicleType` + campos |
| `src/infrastructure/database/entities/CensusRecordEntity.ts` | Modified | Columnas + migración |
| `src/application/use-cases/CreateCensusRecordUseCase.ts` | Modified | Validación discriminada |
| `src/presentation/routes/census.routes.ts` | Modified | DTO Zod por tipo |
| `src/presentation/validators/census.schema.ts` | Modified/New | Schemas condicionales |
| `frontend/src/features/census/CensusForm.tsx` | Modified | Form dinámico |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Validación condicional cruzada | High | discriminatedUnion + tests por tipo |
| Legacy sin `vehicleType` | Med | Default `MOTOTAXI` |
| `stationId` huérfano | Med | Validar estación activa |
| UX dinámico confuso | Med | Agrupar por tipo + e2e |

## Rollback Plan

Flag `CENSO_AMPLIADO_ENABLED=false` restaura form legacy. Columnas nullable; down solo si no hay `vehicleType != MOTOTAXI`.

## Dependencies

- 006 `CensusRecord`/`Station`; TypeORM; Zod; catálogo estaciones

## Success Criteria

- [ ] MOTOTAXI sin `ownershipType`/`operationMode`/`documentosAlDia`/`horario` → 400
- [ ] MOTOTAXI `ESTACION` sin `stationId` → 400; con `stationId` → 201
- [ ] MOTOTAXI `PAGA_TARIFA` sin `tarifaValor` → 400
- [ ] MOTOCARRO sin `actividad` → 400; `PAGA_TARIFA` sin `documentosAlDia` → 400
- [ ] MOTO_FAMILIAR solo exige `documentosAlDia`
- [ ] Legacy migran a `MOTOTAXI` y siguen consultables
- [ ] Form muestra solo campos del tipo
