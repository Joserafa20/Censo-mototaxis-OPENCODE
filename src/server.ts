/**
 * Server entry point
 *
 * Bootstraps the application with real infrastructure dependencies.
 * Loads environment config, initializes database, seeds data, and starts listening.
 * Supports both SQLite (local dev) and PostgreSQL (production).
 */

import { createApp } from "./app.js";
import { JwtTokenService } from "./infrastructure/services/JwtTokenService.js";
import { BcryptPasswordHasher } from "./infrastructure/services/BcryptPasswordHasher.js";
import { CryptoSecureTokenGenerator } from "./infrastructure/services/CryptoSecureTokenGenerator.js";
import { TypeormUserRepository } from "./infrastructure/repositories/TypeormUserRepository.js";
import { TypeormRefreshTokenRepository } from "./infrastructure/repositories/TypeormRefreshTokenRepository.js";
import { TypeormLoginAuditRepository } from "./infrastructure/repositories/TypeormLoginAuditRepository.js";
import { TypeormUserAuditRepository } from "./infrastructure/repositories/TypeormUserAuditRepository.js";
import { TypeormPasswordResetRepository } from "./infrastructure/repositories/TypeormPasswordResetRepository.js";
import { TypeormCensusPeriodRepository } from "./infrastructure/repositories/TypeormCensusPeriodRepository.js";
import { TypeormMunicipalityRepository } from "./infrastructure/repositories/TypeormMunicipalityRepository.js";
import { TypeormCorregimientoRepository } from "./infrastructure/repositories/TypeormCorregimientoRepository.js";
import { TypeormNeighborhoodRepository } from "./infrastructure/repositories/TypeormNeighborhoodRepository.js";
import { TypeormGeographyAuditRepository } from "./infrastructure/repositories/TypeormGeographyAuditRepository.js";
import { TypeormStationRepository } from "./infrastructure/repositories/TypeormStationRepository.js";
import { TypeormStationAgentRepository } from "./infrastructure/repositories/TypeormStationAgentRepository.js";
import { TypeormCensusRecordRepository } from "./infrastructure/repositories/TypeormCensusRecordRepository.js";
import { TypeormCensusAuditRepository } from "./infrastructure/repositories/TypeormCensusAuditRepository.js";

async function main(): Promise<void> {
  // Load environment
  const { env } = await import("./infrastructure/config/env.js");

  console.log(`\n🚀 Sistema de Censo de Mototaxis de Sabanalarga`);
  console.log(`   Database: ${env.dbType.toUpperCase()}`);
  console.log(`   Port: ${env.port}\n`);

  // Initialize services
  const tokenService = new JwtTokenService({
    accessSecret: env.jwt.accessSecret,
    accessExpiresInSeconds: env.jwt.accessExpiresInSeconds,
    refreshSecret: env.jwt.refreshSecret,
    refreshExpiresInDays: env.jwt.refreshExpiresInDays,
  });

  const passwordHasher = new BcryptPasswordHasher();
  const secureTokenGenerator = new CryptoSecureTokenGenerator();

  // Initialize database
  const { AppDataSource } = await import(
    "./infrastructure/database/data-source.js"
  );
  await AppDataSource.initialize();
  console.log("✅ Database connected");

  // Auto-seed: create admin user and root municipality if they don't exist
  await autoSeed();

  // Initialize ALL repositories
  const userRepo = new TypeormUserRepository(
    AppDataSource.getRepository("UserEntity") as any
  );
  const refreshTokenRepo = new TypeormRefreshTokenRepository(
    AppDataSource.getRepository("RefreshTokenEntity") as any
  );
  const auditRepo = new TypeormLoginAuditRepository(
    AppDataSource.getRepository("LoginAuditEntity") as any
  );
  const userAuditRepo = new TypeormUserAuditRepository(
    AppDataSource.getRepository("UserAuditLogEntity") as any
  );
  const passwordResetRepo = new TypeormPasswordResetRepository(
    AppDataSource.getRepository("PasswordResetTokenEntity") as any
  );
  const censusPeriodRepo = new TypeormCensusPeriodRepository(
    AppDataSource.getRepository("CensusPeriodEntity") as any
  );
  const municipalityRepo = new TypeormMunicipalityRepository(
    AppDataSource.getRepository("MunicipalityEntity") as any
  );
  const corregimientoRepo = new TypeormCorregimientoRepository(
    AppDataSource.getRepository("CorregimientoEntity") as any
  );
  const neighborhoodRepo = new TypeormNeighborhoodRepository(
    AppDataSource.getRepository("NeighborhoodEntity") as any
  );
  const geographyAuditRepo = new TypeormGeographyAuditRepository(
    AppDataSource.getRepository("GeographyAuditEntity") as any
  );
  const stationRepo = new TypeormStationRepository(
    AppDataSource.getRepository("StationEntity") as any
  );
  const stationAgentRepo = new TypeormStationAgentRepository(
    AppDataSource.getRepository("StationAgentEntity") as any
  );
  const censusRecordRepo = new TypeormCensusRecordRepository(
    AppDataSource.getRepository("CensusRecordEntity") as any
  );
  const censusAuditRepo = new TypeormCensusAuditRepository(
    AppDataSource.getRepository("CensusAuditEntity") as any
  );

  // Create and start app with ALL dependencies
  const app = createApp({
    userRepo,
    refreshTokenRepo,
    auditRepo,
    userAuditRepo,
    passwordResetRepo,
    censusPeriodRepo,
    municipalityRepo,
    corregimientoRepo,
    neighborhoodRepo,
    geographyAuditRepo,
    stationRepo,
    stationAgentRepo,
    censusRecordRepo,
    censusAuditRepo,
    passwordHasher,
    tokenService,
    secureTokenGenerator,
  });

  app.listen(env.port, () => {
    console.log(`✅ Server running on http://localhost:${env.port}`);
    console.log(`\n   Login: ${env.admin.email} / ${env.admin.password}\n`);
  });
}

/**
 * Auto-seed database with admin user and root municipality.
 * Runs silently — skips if data already exists.
 */
async function autoSeed(): Promise<void> {
  try {
    const { v4: uuidv4 } = await import("uuid");
    const bcrypt = await import("bcrypt");
    const { env } = await import("./infrastructure/config/env.js");
    const { AppDataSource } = await import("./infrastructure/database/data-source.js");
    const { UserEntity } = await import("./infrastructure/database/entities/UserEntity.js");
    const { MunicipalityEntity } = await import("./infrastructure/database/entities/MunicipalityEntity.js");

    const userRepo = AppDataSource.getRepository(UserEntity);
    const municipalityRepo = AppDataSource.getRepository(MunicipalityEntity);

    // Seed admin
    const existingAdmin = await userRepo.findOne({ where: { email: env.admin.email } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(env.admin.password, 12);
      const admin = userRepo.create({
        id: uuidv4(),
        email: env.admin.email,
        passwordHash,
        role: "admin",
        isActive: true,
        failedLoginAttempts: 0,
      });
      await userRepo.save(admin);
      console.log(`✅ Admin user created: ${env.admin.email}`);
    }

    // Seed root municipality
    const existingMunicipality = await municipalityRepo.findOne({ where: { name: "Sabanalarga" } });
    if (!existingMunicipality) {
      const municipality = municipalityRepo.create({
        id: uuidv4(),
        name: "Sabanalarga",
        department: "Atlántico",
      });
      await municipalityRepo.save(municipality);
      console.log("✅ Root municipality created: Sabanalarga, Atlántico");
    }
  } catch (error) {
    console.warn("⚠️  Auto-seed skipped (non-critical):", (error as Error).message);
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
