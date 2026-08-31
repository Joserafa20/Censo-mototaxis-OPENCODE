import type { IAlcaldiaConfigRepository } from "../../domain/repositories/IAlcaldiaConfigRepository.js";
import type { AlcaldiaConfig } from "../../domain/entities/AlcaldiaConfig.js";

export class GetAlcaldiaConfigUseCase {
  constructor(private readonly repo: IAlcaldiaConfigRepository) {}

  async execute(): Promise<AlcaldiaConfig> {
    return this.repo.get();
  }
}
