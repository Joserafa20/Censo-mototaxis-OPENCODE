/**
 * Use case: ListCorregimientosUseCase
 *
 * Lists corregimientos with optional filters and pagination.
 * Returns corregimientos with their neighborhood count.
 */

import type { Corregimiento } from "../../domain/entities/Corregimiento.js";
import type {
  ICorregimientoRepository,
  CorregimientoListFilters,
} from "../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";

export interface ListCorregimientosInput {
  filters?: CorregimientoListFilters;
  page?: number;
  pageSize?: number;
}

export interface ListCorregimientosOutput {
  corregimientos: (Corregimiento & { neighborhoodCount: number })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ListCorregimientosUseCase {
  constructor(
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly neighborhoodRepo: INeighborhoodRepository
  ) {}

  async execute(input: ListCorregimientosInput = {}): Promise<ListCorregimientosOutput> {
    const { filters, page = 1, pageSize = 20 } = input;

    // 1. Get all matching corregimientos
    const allCorregimientos = await this.corregimientoRepo.findAll(filters);

    // 2. Get neighborhood counts for each corregimiento
    const corregimientosWithCounts = await Promise.all(
      allCorregimientos.map(async (corregimiento) => {
        const neighborhoodCount = await this.neighborhoodRepo.countByCorregimientoId(
          corregimiento.id
        );
        return { ...corregimiento, neighborhoodCount };
      })
    );

    // 3. Apply pagination
    const total = corregimientosWithCounts.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedCorregimientos = corregimientosWithCounts.slice(offset, offset + pageSize);

    return {
      corregimientos: paginatedCorregimientos,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
