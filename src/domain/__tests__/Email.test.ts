import { Email } from "../value-objects/Email.js";

describe("Email Value Object", () => {
  describe("create", () => {
    it("should create a valid email with lowercase normalization", () => {
      const email = Email.create("User@Example.COM");
      expect(email.value).toBe("user@example.com");
    });

    it("should trim whitespace", () => {
      const email = Email.create("  user@example.com  ");
      expect(email.value).toBe("user@example.com");
    });

    it("should accept email with subdomain", () => {
      const email = Email.create("user@mail.example.com");
      expect(email.value).toBe("user@mail.example.com");
    });

    it("should accept email with plus addressing", () => {
      const email = Email.create("user+tag@example.com");
      expect(email.value).toBe("user+tag@example.com");
    });

    it("should accept email with dots in local part", () => {
      const email = Email.create("first.last@example.com");
      expect(email.value).toBe("first.last@example.com");
    });

    it("should throw on empty string", () => {
      expect(() => Email.create("")).toThrow("Email cannot be empty");
    });

    it("should throw on whitespace-only string", () => {
      expect(() => Email.create("   ")).toThrow("Email cannot be empty");
    });

    it("should throw on missing @ symbol", () => {
      expect(() => Email.create("userexample.com")).toThrow("Invalid email format");
    });

    it("should throw on missing domain", () => {
      expect(() => Email.create("user@")).toThrow("Invalid email format");
    });

    it("should throw on missing local part", () => {
      expect(() => Email.create("@example.com")).toThrow("Invalid email format");
    });

    it("should throw on domain without TLD", () => {
      expect(() => Email.create("user@example")).toThrow("Invalid email format");
    });

    it("should throw on email exceeding 254 characters", () => {
      const longLocal = "a".repeat(250);
      expect(() => Email.create(`${longLocal}@example.com`)).toThrow(
        "exceeds maximum length"
      );
    });
  });

  describe("tryCreate", () => {
    it("should return Email for valid input", () => {
      const email = Email.tryCreate("user@example.com");
      expect(email).toBeInstanceOf(Email);
    });

    it("should return null for invalid input", () => {
      const email = Email.tryCreate("not-an-email");
      expect(email).toBeNull();
    });

    it("should return null for empty input", () => {
      const email = Email.tryCreate("");
      expect(email).toBeNull();
    });
  });

  describe("domain and localPart", () => {
    it("should extract the domain", () => {
      const email = Email.create("user@example.com");
      expect(email.domain).toBe("example.com");
    });

    it("should extract the local part", () => {
      const email = Email.create("user@example.com");
      expect(email.localPart).toBe("user");
    });
  });

  describe("equals", () => {
    it("should return true for same normalized email", () => {
      const a = Email.create("User@Example.COM");
      const b = Email.create("user@example.com");
      expect(a.equals(b)).toBe(true);
    });

    it("should return false for different emails", () => {
      const a = Email.create("user1@example.com");
      const b = Email.create("user2@example.com");
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return the normalized value", () => {
      const email = Email.create("User@Example.COM");
      expect(email.toString()).toBe("user@example.com");
    });
  });
});
