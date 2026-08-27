/**
 * Unit test: OfflineTokenEncryption
 *
 * Tests AES-256-GCM encryption and decryption of offline tokens.
 */

import { randomBytes } from "crypto";
import { OfflineTokenEncryption } from "../services/OfflineTokenEncryption.js";

describe("OfflineTokenEncryption", () => {
  // Generate a valid 256-bit key (32 bytes hex)
  const testKey = randomBytes(32).toString("hex");
  const encryption = new OfflineTokenEncryption(testKey);

  describe("constructor", () => {
    it("should throw for invalid key length", () => {
      const shortKey = "001122"; // only 3 bytes
      expect(() => new OfflineTokenEncryption(shortKey)).toThrow(
        /Invalid encryption key length/
      );
    });

    it("should accept a valid 256-bit hex key", () => {
      expect(() => new OfflineTokenEncryption(testKey)).not.toThrow();
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a string round-trip", () => {
      const plaintext = "user-123|admin|2025-01-15T10:00:00Z";

      const encrypted = encryption.encrypt(plaintext);
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(plaintext);

      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for the same plaintext (random IV)", () => {
      const plaintext = "same-data";

      const enc1 = encryption.encrypt(plaintext);
      const enc2 = encryption.encrypt(plaintext);

      // IVs are random, so ciphertexts should differ
      expect(enc1).not.toBe(enc2);

      // But both should decrypt to the same plaintext
      expect(encryption.decrypt(enc1)).toBe(plaintext);
      expect(encryption.decrypt(enc2)).toBe(plaintext);
    });

    it("should handle empty string", () => {
      const encrypted = encryption.encrypt("");
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe("");
    });

    it("should handle unicode content", () => {
      const plaintext = "Censo Mototaxis - Usuarios: José María ññoño 🏍️";
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", () => {
      const plaintext = "A".repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("decrypt error handling", () => {
    it("should throw for invalid base64", () => {
      expect(() => encryption.decrypt("!!!invalid-base64!!!")).toThrow();
    });

    it("should throw for payload too short", () => {
      const shortPayload = Buffer.from("short").toString("base64");
      expect(() => encryption.decrypt(shortPayload)).toThrow(
        /Invalid encrypted token: payload too short/
      );
    });

    it("should throw for tampered ciphertext", () => {
      const plaintext = "sensitive-data";
      const encrypted = encryption.encrypt(plaintext);

      // Tamper with the ciphertext
      const buffer = Buffer.from(encrypted, "base64");
      buffer[buffer.length - 1] ^= 0xff; // flip bits in auth tag
      const tampered = buffer.toString("base64");

      expect(() => encryption.decrypt(tampered)).toThrow();
    });

    it("should throw for wrong key", () => {
      const plaintext = "secret-data";
      const encrypted = encryption.encrypt(plaintext);

      const wrongKey = randomBytes(32).toString("hex");
      const wrongEncryption = new OfflineTokenEncryption(wrongKey);

      expect(() => wrongEncryption.decrypt(encrypted)).toThrow();
    });
  });
});
