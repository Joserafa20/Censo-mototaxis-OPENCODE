import type { Repository } from "typeorm";
import type { IAlcaldiaConfigRepository } from "../../domain/repositories/IAlcaldiaConfigRepository.js";
import type { AlcaldiaConfig } from "../../domain/entities/AlcaldiaConfig.js";
import { AlcaldiaConfigEntity } from "../database/entities/AlcaldiaConfigEntity.js";
import { createDefaultAlcaldiaConfig } from "../../domain/entities/AlcaldiaConfig.js";

export class TypeormAlcaldiaConfigRepository implements IAlcaldiaConfigRepository {
  constructor(private readonly repo: Repository<AlcaldiaConfigEntity>) {}

  async get(): Promise<AlcaldiaConfig> {
    let entity = await this.repo.findOneBy({ id: "alcaldia" });
    if (!entity) {
      const def = createDefaultAlcaldiaConfig();
      entity = this.repo.create({
        id: def.id,
        nombre: def.nombre,
        nit: def.nit,
        direccion: def.direccion,
        telefono: def.telefono,
        email: def.email,
        escudoPath: def.escudoPath,
      });
      await this.repo.save(entity);
    }
    return this.toDomain(entity);
  }

  async save(config: AlcaldiaConfig): Promise<AlcaldiaConfig> {
    const entity = this.repo.create({
      id: config.id,
      nombre: config.nombre,
      nit: config.nit,
      direccion: config.direccion,
      telefono: config.telefono,
      email: config.email,
      escudoPath: config.escudoPath,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(e: AlcaldiaConfigEntity): AlcaldiaConfig {
    return {
      id: e.id,
      nombre: e.nombre,
      nit: e.nit,
      direccion: e.direccion,
      telefono: e.telefono,
      email: e.email,
      escudoPath: e.escudoPath,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
