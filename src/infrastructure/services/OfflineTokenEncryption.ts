/**
 * Service: OfflineTokenEncryption
 *
 * Encrypts and decrypts offline tokens using AES-256-GCM.
 * Used for tokens that need to work without server-side validation.
 * The IV is prepended to the ciphertext (12 bytes IV + ciphertext + auth tag).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

export class OfflineTokenEncryption {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    // Key must be 32 bytes (256 bits) in hex
    const keyBuffer = Buffer.from(hexKey, "hex");
    if (keyBuffer.length !== 32) {
      throw new Error(
        `Invalid encryption key length: expected 32 bytes (256-bit hex), got ${keyBuffer.length} bytes`
      );
    }
    this.key = keyBuffer;
  }

  /**
   * Encrypts a plaintext string and returns a base64-encoded ciphertext.
   * Format: base64(iv + ciphertext + authTag)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Pack: iv (12) + encrypted + authTag (16)
    const payload = Buffer.concat([iv, encrypted, authTag]);
    return payload.toString("base64");
  }

  /**
   * Decrypts a base64-encoded ciphertext back to plaintext.
   * Expects format: base64(iv + ciphertext + authTag)
   */
  decrypt(encoded: string): string {
    const payload = Buffer.from(encoded, "base64");

    // Minimum: 12 (IV) + 16 (authTag) = 28 bytes
    if (payload.length < 28) {
      throw new Error("Invalid encrypted token: payload too short");
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(payload.length - 16);
    const encrypted = payload.subarray(IV_LENGTH, payload.length - 16);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
