/**
 * Repository port: IUserRepository
 *
 * Persistence interface for User entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { User } from "../entities/User.js";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByDocument(documentNumber: string): Promise<User | null>;
  incrementFailedAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
}
