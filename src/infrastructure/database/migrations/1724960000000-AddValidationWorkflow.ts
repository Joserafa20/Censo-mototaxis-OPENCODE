import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddValidationWorkflow1724960000000 implements MigrationInterface {
  name = "AddValidationWorkflow1724960000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to census_periods
    await queryRunner.query(`ALTER TABLE "census_periods" ADD COLUMN "closedAt" datetime`);
    await queryRunner.query(`ALTER TABLE "census_periods" ADD COLUMN "closedByUserId" uuid`);

    // Add columns to census_records
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "validationReason" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "validatedBy" uuid`);
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "validatedAt" datetime`);

    // Create census_validations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "census_validations" (
        "id" varchar PRIMARY KEY NOT NULL,
        "censusRecordId" varchar NOT NULL,
        "periodId" varchar NOT NULL,
        "fromStatus" varchar(20) NOT NULL,
        "toStatus" varchar(20) NOT NULL,
        "actorUserId" varchar NOT NULL,
        "actorRole" varchar(20) NOT NULL,
        "reason" varchar(500),
        "metadata" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_validations_record" ON "census_validations" ("censusRecordId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_validations_period" ON "census_validations" ("periodId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_census_records_status_period" ON "census_records" ("status", "periodId")`);

    // Backfill: map legacy statuses if any
    await queryRunner.query(`UPDATE "census_records" SET "status"='PENDIENTE' WHERE "status"='pending'`);
    await queryRunner.query(`UPDATE "census_records" SET "status"='EN_PROCESO' WHERE "status"='active' OR "status"='in_progress'`);
    await queryRunner.query(`UPDATE "census_records" SET "status"='COMPLETADO' WHERE "status"='completed'`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "census_validations"`);
    // SQLite doesn't support DROP COLUMN easily; leave columns
  }
}
