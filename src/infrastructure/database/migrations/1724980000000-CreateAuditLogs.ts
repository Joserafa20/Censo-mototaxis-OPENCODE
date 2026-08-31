import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogs1724980000000 implements MigrationInterface {
  name = "CreateAuditLogs1724980000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" varchar PRIMARY KEY NOT NULL,
        "entityType" varchar(100) NOT NULL,
        "entityId" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "actorId" uuid NOT NULL,
        "actorRole" varchar(20) NOT NULL,
        "timestamp" datetime NOT NULL DEFAULT (datetime('now')),
        "before" text,
        "after" text,
        "ip" varchar(45),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_entity_ts" ON "audit_logs" ("entityType","entityId","timestamp")`);

    // Append-only triggers: prevent UPDATE and DELETE
    // SQLite syntax
    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
      BEFORE UPDATE ON "audit_logs"
      BEGIN
        SELECT RAISE(ABORT, 'audit_logs is append-only: UPDATE not allowed');
      END;
    `);
    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
      BEFORE DELETE ON "audit_logs"
      BEGIN
        SELECT RAISE(ABORT, 'audit_logs is append-only: DELETE not allowed');
      END;
    `);
    // Postgres fallback (will be ignored on sqlite if syntax differs, but we create conditionally via try)
    // We add postgres triggers via separate migration check at runtime if needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_logs_no_update`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_logs_no_delete`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
