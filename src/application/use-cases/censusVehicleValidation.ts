import { InvalidTarifaError, StationNotActiveError, RequiredActividadError, RequiredDocumentosError } from "../../domain/errors/CensusErrors.js";
import { TarifaValor } from "../../domain/value-objects/TarifaValor.js";
import { ActividadMotocarro } from "../../domain/value-objects/ActividadMotocarro.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";

export interface VehicleFields {
  vehicleType?: string;
  ownershipType?: string | null;
  operationMode?: string | null;
  stationId?: string | null;
  tarifaValor?: number | null;
  documentosAlDia?: boolean | null;
  horario?: string | null;
  actividadMotocarro?: string | null;
}

export async function validateVehicleFields(input: VehicleFields, stationRepo?: IStationRepository): Promise<void> {
  const vt = input.vehicleType ?? "MOTOTAXI";
  if (!["MOTO_FAMILIAR","MOTOTAXI","MOTOCARRO"].includes(vt)) {
    const e:any = new Error("INVALID_VEHICLE_TYPE"); e.statusCode=400; e.code="INVALID_VEHICLE_TYPE"; e.details=[{field:"vehicleType",code:"INVALID_VEHICLE_TYPE"}]; throw e;
  }
  if (vt === "MOTO_FAMILIAR") {
    if (input.documentosAlDia == null) throw new RequiredDocumentosError();
    return;
  }
  if (vt === "MOTOTAXI") {
    if (!input.ownershipType) { const e:any=new Error("ownershipType required"); e.statusCode=400; e.details=[{field:"ownershipType",code:"REQUIRED"}]; throw e; }
    if (!input.operationMode) { const e:any=new Error("operationMode required"); e.statusCode=400; e.details=[{field:"operationMode",code:"REQUIRED"}]; throw e; }
    if (input.documentosAlDia == null) throw new RequiredDocumentosError();
    if (!input.horario) { const e:any=new Error("horario required"); e.statusCode=400; e.details=[{field:"horario",code:"REQUIRED"}]; throw e; }
    if (input.operationMode === "ESTACION") {
      if (!input.stationId) throw new StationNotActiveError();
      if (stationRepo) {
        const st = await stationRepo.findById(input.stationId);
        if (!st || !(st as any).isActive) throw new StationNotActiveError();
      }
    }
    if (input.ownershipType === "PAGA_TARIFA") {
      if (input.tarifaValor == null) throw new InvalidTarifaError();
      try { TarifaValor.create(input.tarifaValor); } catch { throw new InvalidTarifaError(); }
    }
    return;
  }
  if (vt === "MOTOCARRO") {
    if (!input.ownershipType) { const e:any=new Error("ownershipType required"); e.statusCode=400; e.details=[{field:"ownershipType",code:"REQUIRED"}]; throw e; }
    try { ActividadMotocarro.create(input.actividadMotocarro); } catch { throw new RequiredActividadError(); }
    if (input.ownershipType === "PAGA_TARIFA") {
      if (input.tarifaValor == null) throw new InvalidTarifaError();
      try { TarifaValor.create(input.tarifaValor); } catch { throw new InvalidTarifaError(); }
      if (input.documentosAlDia == null) throw new RequiredDocumentosError();
    }
    return;
  }
}
