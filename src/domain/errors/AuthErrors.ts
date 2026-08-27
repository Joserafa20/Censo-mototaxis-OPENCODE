/**
 * Domain errors for the Authentication module.
 *
 * All errors extend Error and include a statusCode for HTTP mapping.
 */

export class InvalidCredentialsError extends Error {
  readonly statusCode = 401;

  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class AccountLockedError extends Error {
  readonly statusCode = 423;
  readonly lockedUntil: Date;

  constructor(lockedUntil: Date, message?: string) {
    super(message ?? `Account locked until ${lockedUntil.toISOString()}`);
    this.name = "AccountLockedError";
    this.lockedUntil = lockedUntil;
  }
}

export class TokenExpiredError extends Error {
  readonly statusCode = 401;

  constructor(message = "Token has expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export class TokenReuseDetectedError extends Error {
  readonly statusCode = 401;

  constructor(message = "Refresh token reuse detected — all sessions revoked") {
    super(message);
    this.name = "TokenReuseDetectedError";
  }
}

export class PasswordPolicyViolationError extends Error {
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyViolationError";
  }
}
