/**
 * TypeORM Data Source configuration
 *
 * Production config for PostgreSQL. Uses env vars for connection params.
 * Import this at application bootstrap to initialize the DB connection.
 */

import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { env } from "../config/env.js";

import { UserEntity } from "./entities/UserEntity.js";
import { RefreshTokenEntity } from "./entities/RefreshTokenEntity.js";
import { LoginAuditEntity } from "./entities/LoginAuditEntity.js";

const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.name,
  synchronize: env.database.synchronize,
  logging: env.database.logging,
  entities: [UserEntity, RefreshTokenEntity, LoginAuditEntity],
  migrations: ["./dist/infrastructure/database/migrations/*.js"],
};

export const AppDataSource = new DataSource(dataSourceOptions);
