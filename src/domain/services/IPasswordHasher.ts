/**
 * Service port: IPasswordHasher
 *
 * Abstracts password hashing strategy (bcrypt, argon2, etc.).
 * Infrastructure layer provides the concrete implementation.
 */

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
