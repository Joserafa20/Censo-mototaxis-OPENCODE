/**
 * Tests: ListUsersUseCase
 *
 * TDD: These tests define the expected behavior.
 * Coverage: default pagination, custom filters, page bounds,
 * total count, empty results.
 */

import { ListUsersUseCase, ListUsersInput } from "../ListUsersUseCase.js";
import type { IUserRepository, UserListFilters } from "../../../domain/repositories/IUserRepository.js";
import { createUser } from "../../../domain/entities/User.js";

// ── Mock factories ──────────────────────────────────────────────────

function makeUserRepo(): IUserRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByDocument: jest.fn().mockResolvedValue(null),
    incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
    lockAccount: jest.fn().mockResolvedValue(undefined),
    resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    countActiveAdmins: jest.fn().mockResolvedValue(1),
    findAll: jest.fn().mockResolvedValue([]),
    countAll: jest.fn().mockResolvedValue(0),
  };
}

// ── Test suite ──────────────────────────────────────────────────────

describe("ListUsersUseCase", () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let useCase: ListUsersUseCase;

  const sampleUsers = [
    createUser({ id: "u1", passwordHash: "$2b$12$h", role: "admin", email: "a1@test.com" }),
    createUser({ id: "u2", passwordHash: "$2b$12$h", role: "censista", email: "c1@test.com" }),
    createUser({ id: "u3", passwordHash: "$2b$12$h", role: "censista", email: "c2@test.com" }),
  ];

  beforeEach(() => {
    userRepo = makeUserRepo();
    useCase = new ListUsersUseCase(userRepo);
    (userRepo.findAll as jest.Mock).mockResolvedValue(sampleUsers);
    (userRepo.countAll as jest.Mock).mockResolvedValue(3);
  });

  // ── Default pagination ───────────────────────────────────────────

  it("should return default page 1 with 20 items per page", async () => {
    const result = await useCase.execute();

    expect(result).toEqual({
      users: sampleUsers,
      total: 3,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(userRepo.findAll).toHaveBeenCalledWith({
      filters: undefined,
      limit: 20,
      offset: 0,
    });
  });

  // ── Custom pagination ────────────────────────────────────────────

  it("should respect custom page and pageSize", async () => {
    (userRepo.findAll as jest.Mock).mockResolvedValue([]);
    (userRepo.countAll as jest.Mock).mockResolvedValue(50);

    const result = await useCase.execute({ page: 3, pageSize: 10 });

    expect(result).toEqual({
      users: [],
      total: 50,
      page: 3,
      pageSize: 10,
      totalPages: 5,
    });
    expect(userRepo.findAll).toHaveBeenCalledWith({
      filters: undefined,
      limit: 10,
      offset: 20,
    });
  });

  // ── Page bounds ──────────────────────────────────────────────────

  it("should clamp page to minimum 1", async () => {
    await useCase.execute({ page: -5 });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 })
    );
  });

  it("should clamp pageSize to max 100", async () => {
    await useCase.execute({ pageSize: 999 });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it("should clamp pageSize to minimum 1", async () => {
    await useCase.execute({ pageSize: 0 });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 })
    );
  });

  // ── Filters ──────────────────────────────────────────────────────

  it("should pass role filter to repository", async () => {
    await useCase.execute({ filters: { role: "admin" } });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { role: "admin" } })
    );
    expect(userRepo.countAll).toHaveBeenCalledWith({ role: "admin" });
  });

  it("should pass isActive filter to repository", async () => {
    await useCase.execute({ filters: { isActive: false } });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { isActive: false } })
    );
  });

  it("should pass searchTerm filter to repository", async () => {
    await useCase.execute({ filters: { searchTerm: "admin" } });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { searchTerm: "admin" } })
    );
  });

  it("should combine multiple filters", async () => {
    const filters: UserListFilters = {
      role: "censista",
      isActive: true,
      searchTerm: "test",
    };
    await useCase.execute({ filters });

    expect(userRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ filters })
    );
    expect(userRepo.countAll).toHaveBeenCalledWith(filters);
  });

  // ── Empty results ────────────────────────────────────────────────

  it("should handle empty results correctly", async () => {
    (userRepo.findAll as jest.Mock).mockResolvedValue([]);
    (userRepo.countAll as jest.Mock).mockResolvedValue(0);

    const result = await useCase.execute();

    expect(result).toEqual({
      users: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  // ── Total pages calculation ──────────────────────────────────────

  it("should calculate totalPages correctly", async () => {
    (userRepo.countAll as jest.Mock).mockResolvedValue(45);

    const result = await useCase.execute({ pageSize: 10 });

    expect(result.totalPages).toBe(5);
  });
});
