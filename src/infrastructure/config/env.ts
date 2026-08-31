/**
 * Environment configuration
 *
 * Centralizes all env vars with type-safe access and defaults.
 * Loads from .env via dotenv at application bootstrap.
 *
 * Supports two database modes:
 * - "sqlite" (default): local file-based DB, no server needed
 * - "postgres": full PostgreSQL server
 */

import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Database type: "sqlite" (default) or "postgres"
const dbType = optional("DB_TYPE", "sqlite") as "sqlite" | "postgres";

export const env = {
  dbType,
  database: {
    // SQLite config (default)
    sqlitePath: optional("DB_SQLITE_PATH", "./data/mototaxis.db"),
    // PostgreSQL config (only required when dbType = "postgres")
    host: optional("DB_HOST", "localhost"),
    port: parseInt(optional("DB_PORT", "5432"), 10),
    username: optional("DB_USERNAME", "postgres"),
    password: optional("DB_PASSWORD", ""),
    name: optional("DB_NAME", "mototaxis_census"),
    synchronize: optional("DB_SYNCHRONIZE", "false") === "true",
    logging: optional("DB_LOGGING", "false") === "true",
  },
  jwt: {
    accessSecret: optional("JWT_ACCESS_SECRET", "dev-access-secret-change-in-production"),
    accessExpiresInSeconds: parseInt(optional("JWT_ACCESS_EXPIRES_IN_SECONDS", "900"), 10),
    refreshSecret: optional("JWT_REFRESH_SECRET", "dev-refresh-secret-change-in-production"),
    refreshExpiresInDays: parseInt(optional("JWT_REFRESH_EXPIRES_IN_DAYS", "7"), 10),
  },
  encryption: {
    offlineKey: optional("ENCRYPTION_OFFLINE_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  },
  admin: {
    email: optional("ADMIN_EMAIL", "admin@sabanalarga.gov.co"),
    password: optional("ADMIN_PASSWORD", "Admin@2026!"),
  },
  port: parseInt(optional("PORT", "3000"), 10),
  habeasEnabled: optional("HABEAS_ENABLED", "true") !== "false",
  evidenceStoragePath: optional("EVIDENCE_STORAGE_PATH", "./uploads/evidence"),
} as const;
