/**
 * Test Data Source
 *
 * In-memory SQLite database for integration tests.
 * Uses TypeORM synchronize for schema creation.
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserEntity } from "../database/entities/UserEntity.js";
import { RefreshTokenEntity } from "../database/entities/RefreshTokenEntity.js";
import { LoginAuditEntity } from "../database/entities/LoginAuditEntity.js";

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    entities: [UserEntity, RefreshTokenEntity, LoginAuditEntity],
    synchronize: true,
    logging: false,
  });

  return dataSource.initialize();
}
