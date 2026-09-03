import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { IStationRepository } from "../../domain/repositories/IStationRepository.js";
import { validateVehicleFields } from "./censusVehicleValidation.js";

export class UpdateCensusRecordUseCase {
  constructor(private readonly censusRecordRepo: ICensusRecordRepository, private readonly stationRepo: IStationRepository) {}
  async execute(input: any): Promise<void> {
    const rec = await this.censusRecordRepo.findById(input.id);
    if (!rec) { const e:any=new Error("Not found"); e.statusCode=404; throw e; }
    await validateVehicleFields({
      vehicleType: input.vehicleType ?? (rec as any).vehicleType ?? "MOTOTAXI",
      ownershipType: input.ownershipType ?? (rec as any).ownershipType ?? null,
      operationMode: input.operationMode ?? (rec as any).operationMode ?? null,
      stationId: input.stationId ?? rec.stationId ?? null,
      tarifaValor: input.tarifaValor ?? (rec as any).tarifaValor ?? null,
      documentosAlDia: input.documentosAlDia ?? (rec as any).documentosAlDia ?? null,
      horario: input.horario ?? (rec as any).horario ?? null,
      actividadMotocarro: input.actividadMotocarro ?? (rec as any).actividadMotocarro ?? null,
    }, this.stationRepo);
    const updated: any = { ...rec, ...input, updatedAt: new Date() };
    if (updated.actividadMotocarro) updated.actividadMotocarro = String(updated.actividadMotocarro).trim();
    await this.censusRecordRepo.save(updated);
  }
}
