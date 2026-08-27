/**
 * Repository port: IUserRepository
 *
 * Persistence interface for User entities.
 * Infrastructure adapters implement this; use cases depend on it.
 */

import type { User, UserRole } from "../entities/User.js";

export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  searchTerm?: string; // matches email or documentNumber
}

export interface UserListOptions {
  filters?: UserListFilters;
  limit?: number;
  offset?: number;
}

export interface IUserRepository {
  // Auth methods
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByDocument(documentNumber: string): Promise<User | null>;
  incrementFailedAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;

  // User management methods
  save(user: User): Promise<void>;
  countActiveAdmins(): Promise<number>;
  findAll(options?: UserListOptions): Promise<User[]>;
  countAll(filters?: UserListFilters): Promise<number>;
}
