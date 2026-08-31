import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddStickerFolio1724990000000 implements MigrationInterface {
  name = "AddStickerFolio1724990000000";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "census_records" ADD COLUMN "sticker_folio" varchar(36)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_census_sticker_folio" ON "census_records" ("sticker_folio") WHERE "sticker_folio" IS NOT NULL`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_census_sticker_folio"`);
    await queryRunner.query(`ALTER TABLE "census_records" DROP COLUMN "sticker_folio"`);
  }
}
