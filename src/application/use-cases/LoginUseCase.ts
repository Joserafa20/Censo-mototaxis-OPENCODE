/**
 * Use case: LoginUseCase
 *
 * Orchestrates user authentication:
 * 1. Resolve user by email (admin) or document_number (censista)
 * 2. Check account lock
 * 3. Validate password
 * 4. Generate tokens
 * 5. Register audit
 * 6. Handle failed attempts and lockout
 */

import type { User } from "../../domain/entities/User.js";
import { isAccountLocked } from "../../domain/entities/User.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "../../domain/repositories/ILoginAuditRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import {
  InvalidCredentialsError,
  AccountLockedError,
} from "../../domain/errors/AuthErrors.js";
import type { AuthTokens, LoginInput } from "../../domain/use-cases/types.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditRepo: ILoginAuditRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService
  ) {}

  async execute(input: LoginInput): Promise<AuthTokens> {
    // 1. Find user by email or document number
    const user = await this.findUser(input.credential);

    if (!user) {
      await this.registerAudit({
        userId: "unknown",
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "User not found",
      });
      throw new InvalidCredentialsError();
    }

    // 2. Check if account is locked
    if (isAccountLocked(user)) {
      await this.registerAudit({
        userId: user.id,
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "Account locked",
      });
      throw new AccountLockedError(user.lockedUntil!);
    }

    // 3. Validate password
    const passwordValid = await this.passwordHasher.compare(
      input.password,
      user.passwordHash
    );

    if (!passwordValid) {
      await this.handleFailedLogin(user, input);
      throw new InvalidCredentialsError();
    }

    // 4. Reset failed attempts on successful login
    await this.userRepo.resetFailedAttempts(user.id);

    // 5. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      id: user.id,
      role: user.role,
    });
    const { rawToken, tokenHash } = this.tokenService.generateRefreshToken(
      user.id
    );

    // 6. Persist refresh token
    const { createRefreshToken } = await import(
      "../../domain/entities/RefreshToken.js"
    );
    const refreshTokenEntity = createRefreshToken({
      id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      tokenHash,
      deviceInfo: input.userAgent,
      ipAddress: input.ipAddress,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    // 7. Register successful audit
    await this.registerAudit({
      userId: user.id,
      success: true,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: 900, // 15 minutes
    };
  }

  private async findUser(credential: string): Promise<User | null> {
    // Try email first (contains @)
    if (credential.includes("@")) {
      return this.userRepo.findByEmail(credential);
    }
    // Otherwise treat as document number
    return this.userRepo.findByDocument(credential);
  }

  private async handleFailedLogin(
    user: User,
    input: LoginInput
  ): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;

    await this.userRepo.incrementFailedAttempts(user.id);

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + LOCKOUT_MINUTES * 60 * 1000
      );
      await this.userRepo.lockAccount(user.id, lockedUntil);

      await this.registerAudit({
        userId: user.id,
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "Account locked after max attempts",
      });
    } else {
      await this.registerAudit({
        userId: user.id,
        success: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "Invalid password",
      });
    }
  }

  private async registerAudit(entry: {
    userId: string;
    success: boolean;
    ipAddress: string;
    userAgent: string;
    failureReason?: string;
  }): Promise<void> {
    await this.auditRepo.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
      failureReason: entry.failureReason ?? null,
    });
  }
}
