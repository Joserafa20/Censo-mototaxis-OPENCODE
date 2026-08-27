/**
 * Migration: CreateAuthTables
 *
 * Initial migration for the authentication module.
 * Creates users, refresh_tokens, and login_audit tables with proper
 * constraints, indexes, and foreign keys.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthTables1724764800000 implements MigrationInterface {
  name = "CreateAuthTables1724764800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- users table ---
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"               VARCHAR(255) UNIQUE,
        "passwordHash"        VARCHAR(255) NOT NULL,
        "role"                VARCHAR(20) NOT NULL,
        "documentType"        VARCHAR(10),
        "documentNumber"      VARCHAR(20) UNIQUE,
        "phoneNumber"         VARCHAR(20),
        "isActive"            BOOLEAN NOT NULL DEFAULT TRUE,
        "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
        "lockedUntil"         TIMESTAMPTZ,
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Composite uniqueness: admin users must have email, censista must have documentNumber
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_email_active"
        ON "users" ("email")
        WHERE "email" IS NOT NULL AND "isActive" = TRUE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_document_active"
        ON "users" ("documentNumber")
        WHERE "documentNumber" IS NOT NULL AND "isActive" = TRUE
    `);

    // --- refresh_tokens table ---
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      UUID NOT NULL,
        "tokenHash"   VARCHAR(64) NOT NULL UNIQUE,
        "deviceInfo"  VARCHAR(500) NOT NULL,
        "ipAddress"   VARCHAR(45) NOT NULL,
        "expiresAt"   TIMESTAMPTZ NOT NULL,
        "revokedAt"   TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_refresh_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Index for active token lookup (find non-revoked by hash)
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_hash_active"
        ON "refresh_tokens" ("tokenHash")
        WHERE "revokedAt" IS NULL
    `);

    // Index for bulk revoke by user
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_active"
        ON "refresh_tokens" ("userId")
        WHERE "revokedAt" IS NULL
    `);

    // Cleanup index for expired tokens
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_expires"
        ON "refresh_tokens" ("expiresAt")
    `);

    // --- login_audit table ---
    await queryRunner.query(`
      CREATE TABLE "login_audit" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"        UUID NOT NULL,
        "success"       BOOLEAN NOT NULL,
        "ipAddress"     VARCHAR(45) NOT NULL,
        "userAgent"     VARCHAR(500) NOT NULL,
        "failureReason" VARCHAR(255),
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_login_audit_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Index for querying audit by user and time
    await queryRunner.query(`
      CREATE INDEX "idx_login_audit_user_created"
        ON "login_audit" ("userId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "login_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
