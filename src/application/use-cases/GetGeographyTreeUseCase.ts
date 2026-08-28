/**
 * Use case: GetGeographyTreeUseCase
 *
 * Returns the complete geographic hierarchy tree:
 * - Municipality (root)
 *   - Corregimientos
 *     - Neighborhoods
 *
 * Optionally filters by active status.
 */

import type { IMunicipalityRepository } from "../../domain/repositories/IMunicipalityRepository.js";
import type { ICorregimientoRepository } from "../../domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "../../domain/repositories/INeighborhoodRepository.js";
import type { Municipality } from "../../domain/entities/Municipality.js";
import type { Corregimiento } from "../../domain/entities/Corregimiento.js";
import type { Neighborhood } from "../../domain/entities/Neighborhood.js";

export interface GeographyTreeCorregimiento extends Corregimiento {
  neighborhoods: Neighborhood[];
}

export interface GeographyTreeMunicipality extends Municipality {
  corregimientos: GeographyTreeCorregimiento[];
}

export interface GetGeographyTreeInput {
  includeInactive?: boolean;
}

export interface GetGeographyTreeOutput {
  municipality: GeographyTreeMunicipality | null;
}

export class GetGeographyTreeUseCase {
  constructor(
    private readonly municipalityRepo: IMunicipalityRepository,
    private readonly corregimientoRepo: ICorregimientoRepository,
    private readonly neighborhoodRepo: INeighborhoodRepository
  ) {}

  async execute(input: GetGeographyTreeInput = {}): Promise<GetGeographyTreeOutput> {
    const { includeInactive = false } = input;

    // 1. Get the root municipality
    const municipality = await this.municipalityRepo.findRoot();
    if (!municipality) {
      return { municipality: null };
    }

    // 2. Get all corregimientos
    const corregimientos = await this.corregimientoRepo.findByMunicipality(municipality.id);

    // 3. Get all neighborhoods
    const allNeighborhoods = await this.neighborhoodRepo.findAll({
      municipalityId: municipality.id,
    });

    // 4. Build the tree
    const corregimientosWithNeighborhoods: GeographyTreeCorregimiento[] = corregimientos
      .filter((c) => includeInactive || c.isActive)
      .map((corregimiento) => ({
        ...corregimiento,
        neighborhoods: allNeighborhoods
          .filter((n) => n.corregimientoId === corregimiento.id)
          .filter((n) => includeInactive || n.isActive),
      }));

    return {
      municipality: {
        ...municipality,
        corregimientos: corregimientosWithNeighborhoods,
      },
    };
  }
}
