import {
  InvalidCredentialsError,
  AccountLockedError,
  TokenExpiredError,
  TokenReuseDetectedError,
  PasswordPolicyViolationError,
} from "../errors/AuthErrors.js";

describe("Auth Errors", () => {
  it("InvalidCredentialsError should have statusCode 401", () => {
    const err = new InvalidCredentialsError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("InvalidCredentialsError");
    expect(err.message).toBe("Invalid credentials");
    expect(err).toBeInstanceOf(Error);
  });

  it("InvalidCredentialsError should accept custom message", () => {
    const err = new InvalidCredentialsError("Wrong email or password");
    expect(err.message).toBe("Wrong email or password");
  });

  it("AccountLockedError should have statusCode 423", () => {
    const lockedUntil = new Date("2025-06-01T12:00:00Z");
    const err = new AccountLockedError(lockedUntil);
    expect(err.statusCode).toBe(423);
    expect(err.name).toBe("AccountLockedError");
    expect(err.lockedUntil).toBe(lockedUntil);
    expect(err.message).toContain("2025-06-01");
  });

  it("AccountLockedError should accept custom message", () => {
    const err = new AccountLockedError(new Date(), "Too many attempts");
    expect(err.message).toBe("Too many attempts");
  });

  it("TokenExpiredError should have statusCode 401", () => {
    const err = new TokenExpiredError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("TokenExpiredError");
    expect(err.message).toBe("Token has expired");
  });

  it("TokenReuseDetectedError should have statusCode 401", () => {
    const err = new TokenReuseDetectedError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("TokenReuseDetectedError");
    expect(err.message).toContain("reuse detected");
  });

  it("PasswordPolicyViolationError should have statusCode 422", () => {
    const err = new PasswordPolicyViolationError("Password too short");
    expect(err.statusCode).toBe(422);
    expect(err.name).toBe("PasswordPolicyViolationError");
    expect(err.message).toBe("Password too short");
  });
});
