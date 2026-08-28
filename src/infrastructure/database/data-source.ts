/**
 * TypeORM Data Source configuration
 *
 * Supports two modes via DB_TYPE env var:
 * - "sqlite" (default): file-based local DB, no server needed
 * - "postgres": full PostgreSQL server
 *
 * Import this at application bootstrap to initialize the DB connection.
 */

import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { env } from "../config/env.js";

import { UserEntity } from "./entities/UserEntity.js";
import { RefreshTokenEntity } from "./entities/RefreshTokenEntity.js";
import { LoginAuditEntity } from "./entities/LoginAuditEntity.js";
import { PasswordResetTokenEntity } from "./entities/PasswordResetTokenEntity.js";
import { UserAuditLogEntity } from "./entities/UserAuditLogEntity.js";
import { CensusPeriodEntity } from "./entities/CensusPeriodEntity.js";
import { MunicipalityEntity } from "./entities/MunicipalityEntity.js";
import { CorregimientoEntity } from "./entities/CorregimientoEntity.js";
import { NeighborhoodEntity } from "./entities/NeighborhoodEntity.js";
import { GeographyAuditEntity } from "./entities/GeographyAuditEntity.js";

const entities = [
  UserEntity,
  RefreshTokenEntity,
  LoginAuditEntity,
  PasswordResetTokenEntity,
  UserAuditLogEntity,
  CensusPeriodEntity,
  MunicipalityEntity,
  CorregimientoEntity,
  NeighborhoodEntity,
  GeographyAuditEntity,
];

let dataSourceOptions: DataSourceOptions;

if (env.dbType === "sqlite") {
  // Ensure the data directory exists
  const dbPath = env.database.sqlitePath;
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch {
    // directory already exists
  }

  dataSourceOptions = {
    type: "better-sqlite3",
    database: dbPath,
    synchronize: true, // Auto-create tables in dev
    logging: env.database.logging,
    entities,
  };
} else {
  dataSourceOptions = {
    type: "postgres",
    host: env.database.host,
    port: env.database.port,
    username: env.database.username,
    password: env.database.password,
    database: env.database.name,
    synchronize: env.database.synchronize,
    logging: env.database.logging,
    entities,
    migrations: ["./dist/infrastructure/database/migrations/*.js"],
  };
}

export const AppDataSource = new DataSource(dataSourceOptions);
