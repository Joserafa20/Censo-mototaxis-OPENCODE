/**
 * Use case input/output types for Login.
 *
 * These are domain-level type definitions — the actual orchestration
 * lives in the application layer.
 */

export interface LoginInput {
  credential: string; // email or document_number
  password: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
