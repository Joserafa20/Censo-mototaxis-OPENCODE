/**
 * Server entry point
 *
 * Bootstraps the application with real infrastructure dependencies.
 * Loads environment config, initializes database, and starts listening.
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

async function main(): Promise<void> {
  // Load environment
  const { env } = await import("./infrastructure/config/env.js");

  // Initialize services
  const tokenService = new JwtTokenService({
    accessSecret: env.jwt.accessSecret,
    accessExpiresInSeconds: env.jwt.accessExpiresInSeconds,
    refreshSecret: env.jwt.refreshSecret,
    refreshExpiresInDays: env.jwt.refreshExpiresInDays,
  });

  const passwordHasher = new BcryptPasswordHasher();
  const secureTokenGenerator = new CryptoSecureTokenGenerator();

  // Initialize repositories (using TypeORM data source)
  const { AppDataSource } = await import(
    "./infrastructure/database/data-source.js"
  );
  await AppDataSource.initialize();

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

  // Create and start app
  const app = createApp({
    userRepo,
    refreshTokenRepo,
    auditRepo,
    userAuditRepo,
    passwordResetRepo,
    passwordHasher,
    tokenService,
    secureTokenGenerator,
  });

  const port = parseInt(process.env["PORT"] ?? "3000", 10);
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
