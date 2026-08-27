/**
 * Environment configuration
 *
 * Centralizes all env vars with type-safe access and defaults.
 * Loads from .env via dotenv at application bootstrap.
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

export const env = {
  database: {
    host: required("DB_HOST"),
    port: parseInt(optional("DB_PORT", "5432"), 10),
    username: required("DB_USERNAME"),
    password: required("DB_PASSWORD"),
    name: required("DB_NAME"),
    synchronize: optional("DB_SYNCHRONIZE", "false") === "true",
    logging: optional("DB_LOGGING", "false") === "true",
  },
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    accessExpiresInSeconds: parseInt(optional("JWT_ACCESS_EXPIRES_IN_SECONDS", "900"), 10),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    refreshExpiresInDays: parseInt(optional("JWT_REFRESH_EXPIRES_IN_DAYS", "7"), 10),
  },
  encryption: {
    offlineKey: required("ENCRYPTION_OFFLINE_KEY"),
  },
  admin: {
    email: optional("ADMIN_EMAIL", "admin@mototaxis.com"),
    password: required("ADMIN_PASSWORD"),
  },
} as const;
