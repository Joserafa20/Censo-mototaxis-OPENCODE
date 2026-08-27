/**
 * Service adapter: BcryptPasswordHasher
 *
 * Implements IPasswordHasher using bcrypt with cost factor 12.
 * Provides secure password hashing and comparison.
 */

import bcrypt from "bcrypt";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";

const BCRYPT_ROUNDS = 12;

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
