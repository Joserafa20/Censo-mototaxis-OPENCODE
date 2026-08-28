import type { DataSource } from "typeorm";
import type { ReportFilters } from "../../domain/value-objects/ReportFilters.js";
import type { ReportSummary } from "../../domain/entities/ReportSummary.js";
import type { IReportRepository, UserScope } from "../../domain/repositories/IReportRepository.js";
import type { CensusRecord } from "../../domain/entities/CensusRecord.js";
import { RURAL_CORREGIMIENTOS } from "../../domain/constants/Corregimientos.js";

type CensusRow = Record<string, unknown>;

export class TypeormReportRepository implements IReportRepository {
  constructor(private dataSource: DataSource) {}

  private applyFilters(
    qb: any,
    alias: string,
    filters: ReportFilters,
    scope: UserScope,
  ): void {
    if (!filters.includeInactive) {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: 1 });
      // better-sqlite3 uses 1/0 for boolean; postgres true works too with 1 mapped
    }
    if (filters.periodId) qb.andWhere(`${alias}.periodId = :periodId`, { periodId: filters.periodId });
    if (filters.corregimientoId) qb.andWhere(`${alias}.corregimientoId = :corregimientoId`, { corregimientoId: filters.corregimientoId });
    if (filters.stationId) qb.andWhere(`${alias}.stationId = :stationId`, { stationId: filters.stationId });
    if (filters.operationType) qb.andWhere(`${alias}.operationType = :operationType`, { operationType: filters.operationType });
    if (filters.dateFrom) qb.andWhere(`${alias}.createdAt >= :dateFrom`, { dateFrom: new Date(filters.dateFrom) });
    if (filters.dateTo) qb.andWhere(`${alias}.createdAt <= :dateTo`, { dateTo: new Date(filters.dateTo) });
    if (scope.role === "censista") {
      qb.andWhere(`${alias}.createdByUserId = :userId`, { userId: scope.userId });
    }
    // locationType filter: join logic
    if (filters.locationType === "urban") {
      // urban = records where corregimiento name not in rural list OR locationType handling
      // We filter by corregimiento name; need subquery or join
      // Simplest: if urban, corregimiento NOT IN rural names; but we need join to corregimientos table
      // For now filter via station location or corregimiento lookup done in JS for summary; for counting we approximate via corregimiento names fetched separately
    }
  }

  // For locationType we need to filter via corregimiento names. We'll implement by fetching corregimiento ids if needed.
  private async filterByLocationType(ids: string[], locationType: "urban" | "rural"): Promise<Set<string>> {
    if (!ids.length) return new Set();
    // fetch corregimiento entities to map urban/rural
    const repo = this.dataSource.getRepository("CorregimientoEntity" as any);
    const corrs = await repo.find() as any[];
    const ruralNames = new Set(RURAL_CORREGIMIENTOS as unknown as string[]);
    const ruralIds = new Set<string>(corrs.filter((c: any) => ruralNames.has(c.name)).map((c: any) => c.id as string));
    // urban = not rural
    if (locationType === "rural") return ruralIds;
    // urban = corregimientos not in rural list (includes null? treat as urban)
    // For rural filter we keep only ruralIds
    return ruralIds;
  }

  async getSummary(filters: ReportFilters, scope: UserScope): Promise<ReportSummary> {
    const crRepo = this.dataSource.getRepository("CensusRecordEntity" as any);
    const cpRepo = this.dataSource.getRepository("CensusPeriodEntity" as any);
    const corrRepo = this.dataSource.getRepository("CorregimientoEntity" as any);
    const stationRepo = this.dataSource.getRepository("StationEntity" as any);

    // Helper to create base qb
    const baseQb = () => {
      const qb = crRepo.createQueryBuilder("cr");
      this.applyFilters(qb, "cr", filters, scope);
      return qb;
    };

    // Handle locationType filtering: if present, we need to restrict by corregimiento ids
    // We'll post-filter by fetching and applying IN clause if locationType provided
    let extraCorregimientoIds: string[] | null = null;
    if (filters.locationType) {
      const corrs = await corrRepo.find() as any[];
      const ruralNames = new Set(RURAL_CORREGIMIENTOS as unknown as string[]);
      const ruralIds = new Set<string>(corrs.filter((c: any) => ruralNames.has(c.name)).map((c: any) => c.id));
      if (filters.locationType === "rural") {
        extraCorregimientoIds = Array.from(ruralIds);
      } else {
        // urban = not rural
        extraCorregimientoIds = corrs.filter((c: any) => !ruralNames.has(c.name)).map((c: any) => c.id);
        // census records with corregimientoId in urban set
      }
    }

    const applyExtra = (qb: any) => {
      if (extraCorregimientoIds !== null) {
        if (extraCorregimientoIds.length === 0) {
          qb.andWhere("1=0");
        } else {
          qb.andWhere("cr.corregimientoId IN (:...extraIds)", { extraIds: extraCorregimientoIds });
        }
      }
    };

    // totalGlobal
    const qbTotal = baseQb();
    applyExtra(qbTotal);
    const totalGlobal = await qbTotal.getCount();

    // byLocationType: need urban vs rural split
    let byLocationType = { urban: 0, rural: 0 };
    if (!filters.locationType) {
      // compute both
      const corrs = await corrRepo.find() as any[];
      const ruralNames = new Set(RURAL_CORREGIMIENTOS as unknown as string[]);
      const ruralIds = new Set<string>(corrs.filter((c: any) => ruralNames.has(c.name)).map((c: any) => c.id));
      const qbRural = baseQb();
      if (ruralIds.size === 0) {
        byLocationType.rural = 0;
      } else {
        qbRural.andWhere("cr.corregimientoId IN (:...ruralIds)", { ruralIds: Array.from(ruralIds) });
        byLocationType.rural = await qbRural.getCount();
      }
      byLocationType.urban = totalGlobal - byLocationType.rural;
    } else if (filters.locationType === "rural") {
      byLocationType = { urban: 0, rural: totalGlobal };
    } else {
      byLocationType = { urban: totalGlobal, rural: 0 };
    }

    // byCorregimiento: group by corregimientoId, zero-fill 7
    const qbCorr = baseQb();
    applyExtra(qbCorr);
    qbCorr.select("cr.corregimientoId", "corregimientoId").addSelect("COUNT(*)", "cnt").groupBy("cr.corregimientoId");
    const corrGroups: { corregimientoId: string; cnt: string }[] = await qbCorr.getRawMany();
    const cntMap = new Map<string, number>(corrGroups.map((g) => [g.corregimientoId, Number(g.cnt)]));
    const allCorrs = await corrRepo.find() as any[];
    const byCorregimiento = allCorrs
      .filter((c: any) => (RURAL_CORREGIMIENTOS as unknown as string[]).includes(c.name))
      .map((c: any) => ({
        corregimientoId: c.id as string,
        name: c.name as string,
        locationType: "rural",
        total: cntMap.get(c.id as string) ?? 0,
      }))
      .sort((a: any, b: any) => b.total - a.total);

    // If filter is specific corregimiento, reduce to that one
    let finalByCorregimiento = byCorregimiento;
    if (filters.corregimientoId) {
      finalByCorregimiento = byCorregimiento.filter((x) => x.corregimientoId === filters.corregimientoId);
    }

    // byOperationType
    const qbOp = baseQb();
    applyExtra(qbOp);
    qbOp.select("cr.operationType", "op").addSelect("COUNT(*)", "cnt").groupBy("cr.operationType");
    const opGroups: { op: string; cnt: string }[] = await qbOp.getRawMany();
    let station = 0, independent = 0;
    for (const g of opGroups) {
      if (g.op === "station") station = Number(g.cnt);
      if (g.op === "independent") independent = Number(g.cnt);
    }

    // byStation
    const qbSt = baseQb();
    applyExtra(qbSt);
    qbSt.select("cr.stationId", "stationId").addSelect("COUNT(*)", "cnt").where("cr.stationId IS NOT NULL").andWhere(qbSt.getQueryAndParameters()[0].includes("isActive") ? "cr.isActive = :isActive" : "1=1", {}).groupBy("cr.stationId");
    // Need to re-apply filters properly for station grouping
    const qbSt2 = baseQb();
    applyExtra(qbSt2);
    qbSt2.andWhere("cr.stationId IS NOT NULL");
    qbSt2.select("cr.stationId", "stationId").addSelect("COUNT(*)", "cnt").groupBy("cr.stationId");
    const stGroups: { stationId: string; cnt: string }[] = await qbSt2.getRawMany();
    const stations = await stationRepo.find() as any[];
    const stationNameMap = new Map<string, string>(stations.map((s: any) => [s.id, s.name]));
    const byStation = stGroups
      .map((g) => ({ stationId: g.stationId, name: stationNameMap.get(g.stationId) ?? g.stationId, total: Number(g.cnt) }))
      .sort((a, b) => b.total - a.total);

    // byMotoType (brand)
    const qbMoto = baseQb();
    applyExtra(qbMoto);
    qbMoto.select("cr.motorcycleBrand", "brand").addSelect("COUNT(*)", "cnt").groupBy("cr.motorcycleBrand");
    const motoGroups: { brand: string; cnt: string }[] = await qbMoto.getRawMany();
    const byMotoType = motoGroups.map((g) => ({ brand: g.brand, total: Number(g.cnt) })).sort((a, b) => b.total - a.total);

    // byGenero / byRangoEdad: columns may not exist, degrade gracefully
    let byGenero: { genero: string; total: number }[] = [];
    let byRangoEdad: { rango: string; total: number }[] = [];
    try {
      const qbGen = baseQb();
      applyExtra(qbGen);
      qbGen.select("cr.mototaxiGender", "genero").addSelect("COUNT(*)", "cnt").groupBy("cr.mototaxiGender");
      const genGroups: any[] = await qbGen.getRawMany();
      if (genGroups.length > 0 && genGroups[0].genero !== undefined) {
        byGenero = genGroups
          .filter((g) => g.genero != null)
          .map((g) => ({ genero: String(g.genero).toUpperCase(), total: Number(g.cnt) }));
      }
    } catch {
      byGenero = [];
    }
    try {
      const qbAge = baseQb();
      applyExtra(qbAge);
      // try to select birthdate if column exists
      const rows: any[] = await qbAge.select("cr.mototaxiBirthdate", "bd").getRawMany().catch(() => []);
      if (rows.length > 0 && rows[0].bd !== undefined) {
        const buckets = new Map<string, number>([["18-25", 0], ["26-35", 0], ["36-45", 0], ["46-55", 0], ["56+", 0]]);
        const { calculateAgeRange } = await import("../../domain/value-objects/AgeRange.js");
        for (const r of rows) {
          const label = calculateAgeRange(r.bd);
          if (label) buckets.set(label, (buckets.get(label) ?? 0) + 1);
        }
        byRangoEdad = Array.from(buckets.entries()).filter(([, v]) => v > 0).map(([rango, total]) => ({ rango, total }));
      }
    } catch {
      byRangoEdad = [];
    }

    // totalByPeriod & evolucionPorPeriodo
    const periods = await cpRepo.find() as any[];
    const qbPeriod = baseQb();
    applyExtra(qbPeriod);
    qbPeriod.select("cr.periodId", "periodId").addSelect("COUNT(*)", "cnt").groupBy("cr.periodId");
    const periodGroups: { periodId: string; cnt: string }[] = await qbPeriod.getRawMany();
    const periodCnt = new Map(periodGroups.map((g) => [g.periodId, Number(g.cnt)]));
    const periodNameMap = new Map(periods.map((p: any) => [p.id, p.name]));
    const totalByPeriod = periods.map((p: any) => ({
      periodId: p.id as string,
      periodName: p.name as string,
      total: periodCnt.get(p.id as string) ?? 0,
    })).filter((x: any) => filters.periodId ? x.periodId === filters.periodId : true);
    const evolucionPorPeriodo = [...totalByPeriod].sort((a, b) => a.periodName.localeCompare(b.periodName));

    return {
      totalGlobal,
      totalByPeriod,
      byLocationType,
      byCorregimiento: finalByCorregimiento,
      byOperationType: { station, independent },
      byStation,
      byMotoType,
      byGenero,
      byRangoEdad,
      evolucionPorPeriodo,
      filtersApplied: filters,
      generatedAt: new Date().toISOString(),
    };
  }

  async countFiltered(filters: ReportFilters, scope: UserScope): Promise<number> {
    const crRepo = this.dataSource.getRepository("CensusRecordEntity" as any);
    const qb = crRepo.createQueryBuilder("cr");
    this.applyFilters(qb, "cr", filters, scope);
    // locationType extra
    if (filters.locationType) {
      const corrRepo = this.dataSource.getRepository("CorregimientoEntity" as any);
      const corrs = await corrRepo.find() as any[];
      const ruralNames = new Set(RURAL_CORREGIMIENTOS as unknown as string[]);
      const ruralIds = corrs.filter((c: any) => ruralNames.has(c.name)).map((c: any) => c.id as string);
      const ids = filters.locationType === "rural" ? ruralIds : corrs.filter((c: any) => !ruralNames.has(c.name)).map((c: any) => c.id as string);
      if (ids.length === 0) qb.andWhere("1=0");
      else qb.andWhere("cr.corregimientoId IN (:...locIds)", { locIds: ids });
    }
    return qb.getCount();
  }

  async getFilteredRecords(filters: ReportFilters, scope: UserScope, pagination?: { page: number; limit: number }): Promise<CensusRecord[]> {
    const crRepo = this.dataSource.getRepository("CensusRecordEntity" as any);
    const qb = crRepo.createQueryBuilder("cr");
    this.applyFilters(qb, "cr", filters, scope);
    if (filters.locationType) {
      const corrRepo = this.dataSource.getRepository("CorregimientoEntity" as any);
      const corrs = await corrRepo.find() as any[];
      const ruralNames = new Set(RURAL_CORREGIMIENTOS as unknown as string[]);
      const ruralIds = corrs.filter((c: any) => ruralNames.has(c.name)).map((c: any) => c.id as string);
      const ids = filters.locationType === "rural" ? ruralIds : corrs.filter((c: any) => !ruralNames.has(c.name)).map((c: any) => c.id as string);
      if (ids.length === 0) qb.andWhere("1=0");
      else qb.andWhere("cr.corregimientoId IN (:...locIds)", { locIds: ids });
    }
    qb.orderBy("cr.createdAt", "DESC");
    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }
    const entities = await qb.getMany() as any[];
    return entities.map((e: any) => ({
      id: e.id,
      periodId: e.periodId,
      corregimientoId: e.corregimientoId,
      neighborhoodId: e.neighborhoodId,
      stationId: e.stationId,
      operationType: e.operationType,
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
      latitude: e.latitude,
      longitude: e.longitude,
      status: e.status,
      inactiveReason: e.inactiveReason,
      createdByUserId: e.createdByUserId,
      isActive: Boolean(e.isActive),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }
}
