/**
 * Unit test: BcryptPasswordHasher
 *
 * Tests password hashing and comparison with bcrypt.
 */

import { BcryptPasswordHasher } from "../services/BcryptPasswordHasher.js";

describe("BcryptPasswordHasher", () => {
  const hasher = new BcryptPasswordHasher();

  describe("hash", () => {
    it("should hash a password and return a bcrypt hash string", async () => {
      const hash = await hasher.hash("mySecurePassword123");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/); // bcrypt format
    });

    it("should produce different hashes for the same input (salt)", async () => {
      const hash1 = await hasher.hash("password");
      const hash2 = await hasher.hash("password");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("compare", () => {
    it("should return true for matching password and hash", async () => {
      const password = "mySecurePassword123";
      const hash = await hasher.hash(password);

      const result = await hasher.compare(password, hash);
      expect(result).toBe(true);
    });

    it("should return false for non-matching password", async () => {
      const hash = await hasher.hash("correctPassword");

      const result = await hasher.compare("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("should return false for empty string against a hash", async () => {
      const hash = await hasher.hash("password");

      const result = await hasher.compare("", hash);
      expect(result).toBe(false);
    });
  });
});
