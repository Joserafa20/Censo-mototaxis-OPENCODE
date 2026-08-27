/**
 * Migration: AddUserManagementTables
 *
 * Phase 1 — User Management module.
 * Adds new columns to `users` for first-login flow and deactivation tracking.
 * Creates `password_reset_tokens` for password reset flow.
 * Creates `user_audit_log` for administrative audit trail.
 */

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserManagementTables1724851200000 implements MigrationInterface {
  name = "AddUserManagementTables1724851200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Extend users table with new columns ---
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "isFirstLogin" BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "deactivatedAt" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "deactivatedBy" UUID
    `);

    // Foreign key: deactivatedBy → users(id) — self-referential
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "fk_users_deactivated_by"
        FOREIGN KEY ("deactivatedBy") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    // --- password_reset_tokens table ---
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      UUID NOT NULL,
        "tokenHash"   VARCHAR(64) NOT NULL UNIQUE,
        "expiresAt"   TIMESTAMPTZ NOT NULL,
        "usedAt"      TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_password_reset_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Index for active token lookup
    await queryRunner.query(`
      CREATE INDEX "idx_password_reset_tokens_hash"
        ON "password_reset_tokens" ("tokenHash")
    `);

    // Index for querying tokens by user
    await queryRunner.query(`
      CREATE INDEX "idx_password_reset_tokens_user_created"
        ON "password_reset_tokens" ("userId", "createdAt" DESC)
    `);

    // --- user_audit_log table ---
    await queryRunner.query(`
      CREATE TABLE "user_audit_log" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "targetUserId"  UUID NOT NULL,
        "actorUserId"   UUID,
        "action"        VARCHAR(50) NOT NULL,
        "details"       TEXT,
        "ipAddress"     VARCHAR(45),
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_user_audit_log_target_user"
          FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_audit_log_actor_user"
          FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Index for querying audit by target user and time
    await queryRunner.query(`
      CREATE INDEX "idx_user_audit_log_target_created"
        ON "user_audit_log" ("targetUserId", "createdAt" DESC)
    `);

    // Index for filtering by action type
    await queryRunner.query(`
      CREATE INDEX "idx_user_audit_log_action"
        ON "user_audit_log" ("action")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_deactivated_by"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deactivatedBy"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deactivatedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "forcePasswordChange"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isFirstLogin"`);
  }
}
