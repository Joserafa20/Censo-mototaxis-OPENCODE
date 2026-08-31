import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddHabeasColumns1724970000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "consent_given" BOOLEAN NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "consent_signature" TEXT NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "consent_date" DATETIME NULL`);
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "evidence_photos" TEXT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite cannot DROP COLUMN easily; recreate without those columns is out of scope.
    // For postgres, drop columns. For sqlite, try drop if supported.
    const driver = queryRunner.connection.driver as any;
    if (driver.options?.type === "better-sqlite3" || driver.options?.type === "sqlite") {
      // No-op for sqlite down (synchronize will handle), but attempt drop for engines that support it
      try { await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "evidence_photos"`); } catch {}
      try { await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_date"`); } catch {}
      try { await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_signature"`); } catch {}
      try { await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_given"`); } catch {}
    } else {
      await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "evidence_photos"`);
      await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_date"`);
      await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_signature"`);
      await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "consent_given"`);
    }
  }
}
