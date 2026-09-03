import type { Repository } from "typeorm";
import type {
  ICensusRecordRepository,
  CensusRecordListFilters,
  CensusRecordListOptions,
} from "../../domain/repositories/ICensusRecordRepository.js";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";
import { CensusRecordEntity } from "../database/entities/CensusRecordEntity.js";

export class TypeormCensusRecordRepository implements ICensusRecordRepository {
  constructor(private readonly repo: Repository<CensusRecordEntity>) {}

  async findById(id: string): Promise<CensusRecord | null> {
    const e = await this.repo.findOneBy({ id });
    return e ? this.toDomain(e) : null;
  }

  async findByCedula(cedula: string): Promise<CensusRecord | null> {
    const e = await this.repo.findOneBy({ mototaxiCedula: cedula });
    return e ? this.toDomain(e) : null;
  }

  async findByPlate(plate: string): Promise<CensusRecord | null> {
    const e = await this.repo.findOneBy({ motorcyclePlate: plate });
    return e ? this.toDomain(e) : null;
  }

  async findAll(options?: CensusRecordListOptions): Promise<CensusRecord[]> {
    const qb = this.repo.createQueryBuilder("r");
    this.applyFilters(qb, options?.filters);
    qb.orderBy("r.createdAt", "DESC");
    if (options?.limit) qb.take(options.limit);
    if (options?.offset) qb.skip(options.offset);
    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async countAll(filters?: CensusRecordListFilters): Promise<number> {
    const qb = this.repo.createQueryBuilder("r");
    this.applyFilters(qb, filters);
    return qb.getCount();
  }

  async save(record: CensusRecord): Promise<void> {
    const entity = this.toEntity(record);
    await this.repo.save(entity);
  }

  async deactivateById(id: string, reason: string): Promise<void> {
    await this.repo.update(id, {
      status: "inactive",
      isActive: false,
      inactiveReason: reason,
    });
  }

  async countActiveByStationId(stationId: string): Promise<number> {
    return this.repo.count({ where: { stationId, isActive: true } });
  }

  async countActiveByPeriodId(periodId: string): Promise<number> {
    return this.repo.count({ where: { periodId, isActive: true } });
  }

  async countByStatus(periodId: string, statuses: string[]): Promise<number> {
    if (!statuses.length) return 0;
    const qb = this.repo.createQueryBuilder("r");
    qb.where("r.periodId = :periodId", { periodId });
    qb.andWhere("r.status IN (:...statuses)", { statuses });
    return qb.getCount();
  }

  async countByStatusGrouped(periodId: string): Promise<Record<string, number>> {
    const rows: any[] = await this.repo
      .createQueryBuilder("r")
      .select("r.status", "status")
      .addSelect("COUNT(*)", "cnt")
      .where("r.periodId = :periodId", { periodId })
      .groupBy("r.status")
      .getRawMany();
    const map: Record<string, number> = {};
    for (const row of rows) map[row.status] = Number(row.cnt);
    return map;
  }

  async updateStatus(id: string, status: string, extra?: any): Promise<void> {
    const update: any = { status };
    if (extra?.validationReason !== undefined) update.validationReason = extra.validationReason;
    if (extra?.validatedBy !== undefined) update.validatedBy = extra.validatedBy;
    if (extra?.validatedAt !== undefined) update.validatedAt = extra.validatedAt;
    await this.repo.update(id, update);
  }

  async updateEvidencePhotos(id: string, evidencePhotos: string[]): Promise<void> {
    const val = evidencePhotos.length ? JSON.stringify(evidencePhotos) : null as any;
    await this.repo.update(id, { evidencePhotos: val } as any);
  }

  async findByFolio(folio: string): Promise<CensusRecord | null> {
    const e = await this.repo.findOneBy({ stickerFolio: folio } as any);
    return e ? this.toDomain(e) : null;
  }
  async findByIdsForUpdate(ids: string[], manager?: any): Promise<CensusRecord[]> {
    const repo = manager ? manager.getRepository(CensusRecordEntity) : this.repo;
    let qb = repo.createQueryBuilder("r").where("r.id IN (:...ids)", { ids });
    // FOR UPDATE only for postgres
    try { qb = qb.setLock("pessimistic_write"); } catch {}
    const entities = await qb.getMany();
    return entities.map((e: any) => this.toDomain(e));
  }
  async saveWithFolio(record: CensusRecord): Promise<void> {
    await this.save(record);
  }

  private applyFilters(qb: any, filters?: CensusRecordListFilters): void {
    if (!filters) return;
    if (filters.periodId) qb.andWhere("r.periodId = :periodId", { periodId: filters.periodId });
    if (filters.corregimientoId) qb.andWhere("r.corregimientoId = :corregimientoId", { corregimientoId: filters.corregimientoId });
    if (filters.neighborhoodId) qb.andWhere("r.neighborhoodId = :neighborhoodId", { neighborhoodId: filters.neighborhoodId });
    if (filters.stationId) qb.andWhere("r.stationId = :stationId", { stationId: filters.stationId });
    if (filters.operationType) qb.andWhere("r.operationType = :operationType", { operationType: filters.operationType });
    if (filters.status) qb.andWhere("r.status = :status", { status: filters.status });
    if (filters.createdByUserId) qb.andWhere("r.createdByUserId = :createdByUserId", { createdByUserId: filters.createdByUserId });
    if (filters.searchTerm) {
      qb.andWhere("(r.mototaxiCedula LIKE :term OR r.motorcyclePlate LIKE :term)", { term: `%${filters.searchTerm}%` });
    }
  }

  private toDomain(e: CensusRecordEntity): CensusRecord {
    const rawPhotos: any = (e as any).evidencePhotos;
    let photos: string[] = [];
    if (Array.isArray(rawPhotos)) photos = rawPhotos;
    else if (typeof rawPhotos === "string" && rawPhotos) { try { photos = JSON.parse(rawPhotos); } catch { photos = []; } }
    else photos = [];
    return {
      id: e.id,
      periodId: e.periodId,
      corregimientoId: e.corregimientoId,
      neighborhoodId: e.neighborhoodId,
      stationId: e.stationId,
      operationType: e.operationType as "station" | "independent",
      vehicleType: ((e as any).vehicleType ?? (e as any).vehicle_type ?? "MOTOTAXI") as any,
      ownershipType: (e as any).ownershipType ?? (e as any).ownership_type ?? null,
      operationMode: (e as any).operationMode ?? (e as any).operation_mode ?? null,
      tarifaValor: (e as any).tarifaValor ?? (e as any).tarifa_valor != null ? Number((e as any).tarifaValor ?? (e as any).tarifa_valor) : null,
      documentosAlDia: (e as any).documentosAlDia ?? (e as any).documentos_al_dia ?? null,
      horario: (e as any).horario ?? null,
      actividadMotocarro: (e as any).actividadMotocarro ?? (e as any).actividad_motocarro ?? null,
      mototaxiCedula: e.mototaxiCedula,
      mototaxiFirstName: e.mototaxiFirstName,
      mototaxiLastName: e.mototaxiLastName,
      mototaxiPhone: e.mototaxiPhone,
      mototaxiAddress: e.mototaxiAddress,
      motorcyclePlate: e.motorcyclePlate,
      motorcycleBrand: e.motorcycleBrand,
      motorcycleModel: e.motorcycleModel,
      motorcycleColor: e.motorcycleColor,
      motorcycleYear: e.motorcycleYear,
      latitude: e.latitude !== null && e.latitude !== undefined ? Number(e.latitude) : null,
      longitude: e.longitude !== null && e.longitude !== undefined ? Number(e.longitude) : null,
      status: e.status as any,
      inactiveReason: e.inactiveReason,
      validationReason: (e as any).validationReason ?? null,
      validatedBy: (e as any).validatedBy ?? null,
      validatedAt: (e as any).validatedAt ?? null,
      createdByUserId: e.createdByUserId,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      consentGiven: Boolean((e as any).consentGiven ?? (e as any).consent_given ?? false),
      consentSignature: (e as any).consentSignature ?? (e as any).consent_signature ?? "",
      consentDate: (e as any).consentDate ?? (e as any).consent_date ?? null,
      evidencePhotos: photos,
      stickerFolio: (e as any).stickerFolio ?? null,
    };
  }

  private toEntity(r: CensusRecord): CensusRecordEntity {
    const e = new CensusRecordEntity();
    e.id = r.id;
    e.periodId = r.periodId;
    e.corregimientoId = r.corregimientoId;
    e.neighborhoodId = r.neighborhoodId;
    e.stationId = r.stationId;
    e.operationType = r.operationType;
    (e as any).vehicleType = (r as any).vehicleType ?? "MOTOTAXI";
    (e as any).ownershipType = (r as any).ownershipType ?? null;
    (e as any).operationMode = (r as any).operationMode ?? null;
    (e as any).tarifaValor = (r as any).tarifaValor ?? null;
    (e as any).documentosAlDia = (r as any).documentosAlDia ?? null;
    (e as any).horario = (r as any).horario ?? null;
    (e as any).actividadMotocarro = (r as any).actividadMotocarro ?? null;
    e.mototaxiCedula = r.mototaxiCedula;
    e.mototaxiFirstName = r.mototaxiFirstName;
    e.mototaxiLastName = r.mototaxiLastName;
    e.mototaxiPhone = r.mototaxiPhone;
    e.mototaxiAddress = r.mototaxiAddress;
    e.motorcyclePlate = r.motorcyclePlate;
    e.motorcycleBrand = r.motorcycleBrand;
    e.motorcycleModel = r.motorcycleModel;
    e.motorcycleColor = r.motorcycleColor;
    e.motorcycleYear = r.motorcycleYear;
    e.latitude = r.latitude;
    e.longitude = r.longitude;
    e.status = r.status;
    e.inactiveReason = r.inactiveReason;
    e.createdByUserId = r.createdByUserId;
    e.isActive = r.isActive;
    (e as any).consentGiven = (r as any).consentGiven ?? false;
    (e as any).consentSignature = (r as any).consentSignature ?? "";
    (e as any).consentDate = (r as any).consentDate ?? null;
    const photos = (r as any).evidencePhotos ?? [];
    (e as any).evidencePhotos = photos.length ? JSON.stringify(photos) : null;
    (e as any).stickerFolio = (r as any).stickerFolio ?? null;
    e.createdAt = r.createdAt;
    e.updatedAt = r.updatedAt;
    return e;
  }
}
