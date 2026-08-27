/**
 * Service port: ISecureTokenGenerator
 *
 * Generates cryptographically secure random tokens and their SHA-256 hashes.
 * Used for password reset tokens, email verification tokens, etc.
 * Infrastructure layer provides the concrete implementation using Node crypto.
 */

export interface ISecureTokenGenerator {
  /**
   * Generates a cryptographically secure random token and its SHA-256 hash.
   * @returns An object containing the raw token (for sending to the user)
   *          and the tokenHash (for storing in the database).
   */
  generate(): { rawToken: string; tokenHash: string };
}
