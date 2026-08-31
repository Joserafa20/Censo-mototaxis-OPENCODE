import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientIdToCensusRecords1724981000000 implements MigrationInterface {
  name = "AddClientIdToCensusRecords1724981000000";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "clientId" varchar(64)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_census_clientId" ON "census_records" ("clientId") WHERE "clientId" IS NOT NULL`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_census_clientId"`);
    await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "clientId"`);
  }
}
