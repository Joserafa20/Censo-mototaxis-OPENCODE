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

export class LastAdminDeactivationError extends Error {
  readonly statusCode = 409;

  constructor(message = "Cannot deactivate the last active admin user") {
    super(message);
    this.name = "LastAdminDeactivationError";
  }
}

export class InsufficientPermissionsError extends Error {
  readonly statusCode = 403;

  constructor(message = "Insufficient permissions for this operation") {
    super(message);
    this.name = "InsufficientPermissionsError";
  }
}

export class UserNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class PasswordResetTokenExpiredError extends Error {
  readonly statusCode = 410;

  constructor(message = "Password reset token has expired") {
    super(message);
    this.name = "PasswordResetTokenExpiredError";
  }
}

export class PasswordResetTokenUsedError extends Error {
  readonly statusCode = 410;

  constructor(message = "Password reset token has already been used") {
    super(message);
    this.name = "PasswordResetTokenUsedError";
  }
}

export class EmailAlreadyExistsError extends Error {
  readonly statusCode = 409;

  constructor(email: string) {
    super(`Email "${email}" is already registered`);
    this.name = "EmailAlreadyExistsError";
  }
}

export class DocumentAlreadyExistsError extends Error {
  readonly statusCode = 409;

  constructor(documentNumber: string) {
    super(`Document number "${documentNumber}" is already registered`);
    this.name = "DocumentAlreadyExistsError";
  }
}
