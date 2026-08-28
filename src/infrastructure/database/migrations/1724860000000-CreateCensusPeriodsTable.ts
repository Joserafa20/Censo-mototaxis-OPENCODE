/**
 * Migration: CreateCensusPeriodsTable
 *
 * Creates the `census_periods` table for census period management.
 * Each period has a name, date range, status, and lifecycle timestamps.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCensusPeriodsTable1724860000000 implements MigrationInterface {
  name = "CreateCensusPeriodsTable1724860000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "census_periods" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(255) NOT NULL UNIQUE,
        "description" TEXT,
        "startDate"   DATE NOT NULL,
        "endDate"     DATE NOT NULL,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'INACTIVO',
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "chk_census_periods_status"
          CHECK ("status" IN ('INACTIVO', 'ACTIVO', 'FINALIZADO')),
        CONSTRAINT "chk_census_periods_dates"
          CHECK ("endDate" >= "startDate")
      )
    `);

    // Index for filtering by status
    await queryRunner.query(`
      CREATE INDEX "idx_census_periods_status"
        ON "census_periods" ("status")
    `);

    // Index for date range queries
    await queryRunner.query(`
      CREATE INDEX "idx_census_periods_dates"
        ON "census_periods" ("startDate", "endDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "census_periods"`);
  }
}
