import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCensoAmpliadoColumns1710000000012 implements MigrationInterface {
  name = "AddCensoAmpliadoColumns1710000000012";
  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = async (col: string) => {
      const cols = await queryRunner.query(`SELECT name FROM pragma_table_info('census_records')`);
      return cols.some((c: any) => c.name === col);
    };
    if (!(await has("vehicle_type"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "vehicle_type" varchar(20) NOT NULL DEFAULT 'MOTOTAXI'`);
    if (!(await has("ownership_type"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "ownership_type" varchar(20)`);
    if (!(await has("operation_mode"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "operation_mode" varchar(20)`);
    if (!(await has("tarifa_valor"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "tarifa_valor" decimal(10,2)`);
    if (!(await has("documentos_al_dia"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "documentos_al_dia" boolean`);
    if (!(await has("horario"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "horario" varchar(20)`);
    if (!(await has("actividad_motocarro"))) await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "actividad_motocarro" varchar(150)`);
    // legacy update
    await queryRunner.query(`UPDATE "census_records" SET "vehicle_type"='MOTOTAXI' WHERE "vehicle_type" IS NULL OR "vehicle_type"=''`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_census_vehicleType" ON "census_records" ("vehicle_type")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    const cnt = await queryRunner.query(`SELECT COUNT(*) as c FROM "census_records" WHERE "vehicle_type" != 'MOTOTAXI'`);
    if (Number(cnt[0]?.c ?? 0) > 0) throw new Error("Cannot revert: records with vehicleType != MOTOTAXI exist");
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_census_vehicleType"`);
    // SQLite cannot drop columns easily - leave columns
  }
}
