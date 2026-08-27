/**
 * Service adapter: CryptoSecureTokenGenerator
 *
 * Implements ISecureTokenGenerator using Node.js crypto module.
 * Generates cryptographically secure random tokens and their SHA-256 hashes.
 * Used for password reset tokens, email verification tokens, etc.
 */

import { createHash, randomBytes } from "crypto";
import type { ISecureTokenGenerator } from "../../domain/services/ISecureTokenGenerator.js";

export class CryptoSecureTokenGenerator implements ISecureTokenGenerator {
  /**
   * Generates a cryptographically secure random token and its SHA-256 hash.
   * @returns An object containing the raw token (for sending to the user)
   *          and the tokenHash (for storing in the database).
   */
  generate(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
  }
}
