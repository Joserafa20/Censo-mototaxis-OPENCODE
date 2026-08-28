/**
 * Migration: CreateGeographyTables
 *
 * Geography & Coverage module (Module 004).
 * Creates the geographic hierarchy tables:
 * - municipalities (root level)
 * - corregimientos (within a municipality)
 * - neighborhoods (within a corregimiento)
 * - geography_audit_log (audit trail)
 *
 * Includes UNIQUE constraints on (name + parent) combinations and
 * indexes for efficient hierarchy queries.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGeographyTables1724900000000 implements MigrationInterface {
  name = "CreateGeographyTables1724900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- municipalities table ---
    await queryRunner.query(`
      CREATE TABLE "municipalities" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(255) NOT NULL,
        "department"  VARCHAR(255) NOT NULL,
        "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // --- corregimientos table ---
    await queryRunner.query(`
      CREATE TABLE "corregimientos" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "municipalityId"  UUID NOT NULL,
        "name"            VARCHAR(255) NOT NULL,
        "latitude"        DECIMAL(10,7),
        "longitude"       DECIMAL(10,7),
        "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
        "deactivatedAt"   TIMESTAMPTZ,
        "deactivatedBy"   UUID,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_corregimientos_municipality"
          FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id")
          ON DELETE RESTRICT
      )
    `);

    // UNIQUE constraint: name within municipality
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_corregimientos_name_municipality"
        ON "corregimientos" ("municipalityId", LOWER("name"))
    `);

    // Index for filtering active corregimientos
    await queryRunner.query(`
      CREATE INDEX "idx_corregimientos_municipality_active"
        ON "corregimientos" ("municipalityId", "isActive")
    `);

    // --- neighborhoods table ---
    await queryRunner.query(`
      CREATE TABLE "neighborhoods" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "corregimientoId"   UUID NOT NULL,
        "name"              VARCHAR(255) NOT NULL,
        "latitude"          DECIMAL(10,7),
        "longitude"         DECIMAL(10,7),
        "isActive"          BOOLEAN NOT NULL DEFAULT TRUE,
        "deactivatedAt"     TIMESTAMPTZ,
        "deactivatedBy"     UUID,
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_neighborhoods_corregimiento"
          FOREIGN KEY ("corregimientoId") REFERENCES "corregimientos"("id")
          ON DELETE RESTRICT
      )
    `);

    // UNIQUE constraint: name within corregimiento
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_neighborhoods_name_corregimiento"
        ON "neighborhoods" ("corregimientoId", LOWER("name"))
    `);

    // Index for filtering active neighborhoods
    await queryRunner.query(`
      CREATE INDEX "idx_neighborhoods_corregimiento_active"
        ON "neighborhoods" ("corregimientoId", "isActive")
    `);

    // --- geography_audit_log table ---
    await queryRunner.query(`
      CREATE TABLE "geography_audit_log" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entityType"    VARCHAR(50) NOT NULL,
        "entityId"      UUID NOT NULL,
        "actorUserId"   UUID NOT NULL,
        "action"        VARCHAR(50) NOT NULL,
        "details"       TEXT,
        "ipAddress"     VARCHAR(45),
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index for querying audit by entity type and entity id
    await queryRunner.query(`
      CREATE INDEX "idx_geography_audit_entity"
        ON "geography_audit_log" ("entityType", "entityId", "createdAt" DESC)
    `);

    // Index for filtering by action type
    await queryRunner.query(`
      CREATE INDEX "idx_geography_audit_action"
        ON "geography_audit_log" ("action")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "geography_audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "neighborhoods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "corregimientos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "municipalities"`);
  }
}
