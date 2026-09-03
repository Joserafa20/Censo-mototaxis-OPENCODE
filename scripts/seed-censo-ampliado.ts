import "reflect-metadata";
import { DataSource } from "typeorm";
import { CensusRecordEntity } from "../src/infrastructure/database/entities/CensusRecordEntity.js";
import { v4 as uuid } from "uuid";

const ds = new DataSource({
  type: "better-sqlite3",
  database: process.env.DATABASE_URL || "./data/censo.db",
  entities: [CensusRecordEntity],
  synchronize: false,
});

async function run(){
  await ds.initialize();
  const repo = ds.getRepository(CensusRecordEntity);
  // need period/corregimiento - fetch first
  const period = await ds.query(`SELECT id FROM census_periods LIMIT 1`);
  const corr = await ds.query(`SELECT id FROM corregimientos LIMIT 1`);
  const station = await ds.query(`SELECT id FROM stations WHERE is_active=1 LIMIT 1`);
  const periodId = period[0]?.id ?? uuid();
  const corrId = corr[0]?.id ?? uuid();
  const stationId = station[0]?.id ?? null;
  const userId = (await ds.query(`SELECT id FROM users LIMIT 1`))[0]?.id ?? uuid();
  const make = (override: Partial<CensusRecordEntity>) => {
    const e = new CensusRecordEntity();
    Object.assign(e, {
      id: uuid(), periodId, corregimientoId: corrId, neighborhoodId:null, stationId:null, operationType:"station",
      mototaxiCedula: String(Math.floor(10000000+Math.random()*90000000)),
      mototaxiFirstName:"Test", mototaxiLastName:"User", mototaxiPhone:null, mototaxiAddress:null,
      motorcyclePlate: `ABC${Math.floor(100+Math.random()*900)}`, motorcycleBrand:"Yamaha", motorcycleModel:"NMAX", motorcycleColor:"Negro", motorcycleYear:2023,
      latitude:null, longitude:null, status:"PENDIENTE", inactiveReason:null, validationReason:null, validatedBy:null, validatedAt:null,
      createdByUserId:userId, isActive:true, consentGiven:true, consentSignature:"Firma test", consentDate:new Date(),
      evidencePhotos:null, clientId:null, stickerFolio:null, createdAt:new Date(), updatedAt:new Date(),
      vehicleType:"MOTOTAXI", ownershipType:null, operationMode:null, tarifaValor:null, documentosAlDia:null, horario:null, actividadMotocarro:null,
      ...override,
    });
    return e;
  };
  const records: CensusRecordEntity[] = [];
  // 3 FAMILIAR
  for(let i=0;i<3;i++) records.push(make({ vehicleType:"MOTO_FAMILIAR", documentosAlDia:true, motorcyclePlate:`FAM${100+i}`}));
  // 3 MOTOTAXI
  for(let i=0;i<3;i++) records.push(make({ vehicleType:"MOTOTAXI", ownershipType: i===1?"PAGA_TARIFA":"PROPIA", operationMode: i===0?"ESTACION":"CIRCULANTE", stationId: i===0?stationId:null, tarifaValor: i===1?15000:null, documentosAlDia:true, horario: i%2===0?"DIURNO":"NOCTURNO", motorcyclePlate:`MTX${200+i}`}));
  // 3 MOTOCARRO
  for(let i=0;i<3;i++) records.push(make({ vehicleType:"MOTOCARRO", ownershipType: i===1?"PAGA_TARIFA":"PROPIA", actividadMotocarro:"Carga mercancía", tarifaValor: i===1?20000:null, documentosAlDia: i===1?true:null, motorcyclePlate:`MCO${300+i}`}));
  // one APROBADO for adhesivo test -> first record
  records[0].status = "APROBADO";
  records[0].stickerFolio = `FOLIO-${uuid().slice(0,8)}`;
  for(const r of records) await repo.save(r);
  console.log(`Seeded ${records.length} records, one APROBADO folio=${records[0].stickerFolio}`);
  await ds.destroy();
}
run().catch(e=>{ console.error(e); process.exit(1); });
