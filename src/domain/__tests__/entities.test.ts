import { createUser, isAccountLocked, User } from "../entities/User.js";
import { createRefreshToken, isRefreshTokenActive, RefreshToken } from "../entities/RefreshToken.js";
import { createLoginAudit } from "../entities/LoginAudit.js";

describe("User Entity", () => {
  const baseUserProps = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    passwordHash: "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12",
    role: "censista" as const,
  };

  it("should create a user with safe defaults", () => {
    const user = createUser(baseUserProps);
    expect(user.id).toBe(baseUserProps.id);
    expect(user.role).toBe("censista");
    expect(user.email).toBeNull();
    expect(user.documentType).toBeNull();
    expect(user.documentNumber).toBeNull();
    expect(user.phoneNumber).toBeNull();
    expect(user.isActive).toBe(true);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it("should allow overriding defaults", () => {
    const user = createUser({
      ...baseUserProps,
      email: "admin@example.com",
      documentNumber: "1234567890",
      isActive: false,
    });
    expect(user.email).toBe("admin@example.com");
    expect(user.documentNumber).toBe("1234567890");
    expect(user.isActive).toBe(false);
  });

  it("should create admin role users", () => {
    const user = createUser({ ...baseUserProps, role: "admin" });
    expect(user.role).toBe("admin");
  });
});

describe("isAccountLocked", () => {
  it("should return false when lockedUntil is null", () => {
    const user = createUser({
      id: "1",
      passwordHash: "hash",
      role: "censista",
      lockedUntil: null,
    });
    expect(isAccountLocked(user)).toBe(false);
  });

  it("should return true when lockedUntil is in the future", () => {
    const future = new Date(Date.now() + 15 * 60 * 1000);
    const user = createUser({
      id: "1",
      passwordHash: "hash",
      role: "censista",
      lockedUntil: future,
    });
    expect(isAccountLocked(user)).toBe(true);
  });

  it("should return false when lockedUntil is in the past", () => {
    const past = new Date(Date.now() - 15 * 60 * 1000);
    const user = createUser({
      id: "1",
      passwordHash: "hash",
      role: "censista",
      lockedUntil: past,
    });
    expect(isAccountLocked(user)).toBe(false);
  });
});

describe("RefreshToken Entity", () => {
  it("should create a refresh token with safe defaults", () => {
    const token = createRefreshToken({
      id: "tok-1",
      userId: "user-1",
      tokenHash: "abc123hash",
      deviceInfo: "Chrome/120",
      ipAddress: "192.168.1.1",
    });
    expect(token.id).toBe("tok-1");
    expect(token.userId).toBe("user-1");
    expect(token.revokedAt).toBeNull();
    expect(token.expiresAt).toBeInstanceOf(Date);
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(token.createdAt).toBeInstanceOf(Date);
  });

  it("should allow overriding expiresAt", () => {
    const customExpiry = new Date("2025-12-31");
    const token = createRefreshToken({
      id: "tok-2",
      userId: "user-1",
      tokenHash: "def456hash",
      deviceInfo: "Firefox/121",
      ipAddress: "10.0.0.1",
      expiresAt: customExpiry,
    });
    expect(token.expiresAt).toBe(customExpiry);
  });
});

describe("isRefreshTokenActive", () => {
  it("should return true for non-revoked, non-expired token", () => {
    const token = createRefreshToken({
      id: "1",
      userId: "u1",
      tokenHash: "h",
      deviceInfo: "d",
      ipAddress: "1.1.1.1",
      expiresAt: new Date(Date.now() + 86400000),
    });
    expect(isRefreshTokenActive(token)).toBe(true);
  });

  it("should return false for revoked token", () => {
    const token = createRefreshToken({
      id: "2",
      userId: "u1",
      tokenHash: "h",
      deviceInfo: "d",
      ipAddress: "1.1.1.1",
      revokedAt: new Date(),
    });
    expect(isRefreshTokenActive(token)).toBe(false);
  });

  it("should return false for expired token", () => {
    const token = createRefreshToken({
      id: "3",
      userId: "u1",
      tokenHash: "h",
      deviceInfo: "d",
      ipAddress: "1.1.1.1",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(isRefreshTokenActive(token)).toBe(false);
  });
});

describe("LoginAudit Entity", () => {
  it("should create a successful login audit", () => {
    const audit = createLoginAudit({
      id: "audit-1",
      userId: "user-1",
      success: true,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
    });
    expect(audit.id).toBe("audit-1");
    expect(audit.success).toBe(true);
    expect(audit.failureReason).toBeNull();
    expect(audit.createdAt).toBeInstanceOf(Date);
  });

  it("should create a failed login audit with reason", () => {
    const audit = createLoginAudit({
      id: "audit-2",
      userId: "user-1",
      success: false,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      failureReason: "Invalid password",
    });
    expect(audit.success).toBe(false);
    expect(audit.failureReason).toBe("Invalid password");
  });
});
