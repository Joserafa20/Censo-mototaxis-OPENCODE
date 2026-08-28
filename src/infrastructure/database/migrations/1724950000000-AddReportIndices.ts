import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddReportIndices1724950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_period ON census_records(periodId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_corregimiento ON census_records(corregimientoId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_station ON census_records(stationId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_created_by ON census_records(createdByUserId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_active ON census_records(isActive)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_census_records_created_at ON census_records(createdAt)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_corregimiento`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_station`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_created_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_census_records_created_at`);
  }
}
