/**
 * Use case: ListUsersUseCase
 *
 * Lists users with filtering and pagination:
 * - Filter by role, active status, or search term
 * - Paginated results with total count
 * - Returns user list and metadata
 */

import type { User, UserRole } from "../../domain/entities/User.js";
import type { IUserRepository, UserListFilters } from "../../domain/repositories/IUserRepository.js";

export interface ListUsersInput {
  filters?: UserListFilters;
  page?: number;
  pageSize?: number;
}

export interface ListUsersOutput {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: ListUsersInput = {}): Promise<ListUsersOutput> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.userRepo.findAll({
        filters: input.filters,
        limit: pageSize,
        offset,
      }),
      this.userRepo.countAll(input.filters),
    ]);

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
