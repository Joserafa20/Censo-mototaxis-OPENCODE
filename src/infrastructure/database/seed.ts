/**
 * Seed script: Creates the default admin user and root municipality
 *
 * Works with both SQLite and PostgreSQL.
 * Uses TypeORM repositories instead of raw SQL for cross-DB compatibility.
 *
 * Run with: npx tsx src/infrastructure/database/seed.ts
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

import { AppDataSource } from "./data-source.js";
import { UserEntity } from "./entities/UserEntity.js";
import { MunicipalityEntity } from "./entities/MunicipalityEntity.js";

const BCRYPT_ROUNDS = 12;

async function seed(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(UserEntity);
  const municipalityRepo = dataSource.getRepository(MunicipalityEntity);

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sabanalarga.gov.co";
  const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });

  if (existingAdmin) {
    console.log("Admin user already exists — skipping admin seed.");
  } else {
    const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@2026!";
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    const admin = userRepo.create({
      id: uuidv4(),
      email: adminEmail,
      passwordHash,
      role: "admin",
      isActive: true,
      failedLoginAttempts: 0,
    });

    await userRepo.save(admin);
    console.log(`Admin user created: ${adminEmail} (id: ${admin.id})`);
  }

  // Seed root municipality
  const existingMunicipality = await municipalityRepo.findOne({
    where: { name: "Sabanalarga" },
  });

  if (existingMunicipality) {
    console.log("Root municipality already exists — skipping municipality seed.");
  } else {
    const municipality = municipalityRepo.create({
      id: uuidv4(),
      name: "Sabanalarga",
      department: "Atlántico",
    });

    await municipalityRepo.save(municipality);
    console.log(`Root municipality created: Sabanalarga, Atlántico (id: ${municipality.id})`);
  }
}

async function main(): Promise<void> {
  try {
    const dataSource = await AppDataSource.initialize();
    console.log(`Database connected (${dataSource.options.type}) — running seed...`);

    await seed(dataSource);

    await dataSource.destroy();
    console.log("Seed completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
