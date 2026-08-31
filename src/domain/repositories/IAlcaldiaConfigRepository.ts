import type { AlcaldiaConfig } from "../entities/AlcaldiaConfig.js";

export interface IAlcaldiaConfigRepository {
  get(): Promise<AlcaldiaConfig>;
  save(config: AlcaldiaConfig): Promise<AlcaldiaConfig>;
}
