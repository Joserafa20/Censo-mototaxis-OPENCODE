/**
 * Seed script: Creates the default admin user
 *
 * Run with: npx tsx src/infrastructure/database/seed.ts
 * Requires DATABASE_URL and ADMIN_PASSWORD env vars.
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

import { AppDataSource } from "./data-source.js";

const BCRYPT_ROUNDS = 12;

async function seed(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Check if admin already exists
    const existingAdmin = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [process.env.ADMIN_EMAIL ?? "admin@mototaxis.com"]
    );

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists — skipping seed.");
      return;
    }

    const adminId = uuidv4();
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@mototaxis.com";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error("ADMIN_PASSWORD environment variable is required for seeding");
    }

    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    await queryRunner.query(
      `
      INSERT INTO users (id, email, passwordHash, role, isActive, failedLoginAttempts, lockedUntil, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, TRUE, 0, NULL, NOW(), NOW())
      `,
      [adminId, adminEmail, passwordHash, "admin"]
    );

    await queryRunner.commitTransaction();
    console.log(`Admin user created: ${adminEmail} (id: ${adminId})`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function main(): Promise<void> {
  try {
    const dataSource = await AppDataSource.initialize();
    console.log("Database connected — running seed...");

    await seed(dataSource);

    await dataSource.destroy();
    console.log("Seed completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
