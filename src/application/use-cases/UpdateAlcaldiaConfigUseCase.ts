import type { IAlcaldiaConfigRepository } from "../../domain/repositories/IAlcaldiaConfigRepository.js";
import type { AlcaldiaConfig } from "../../domain/entities/AlcaldiaConfig.js";

export interface UpdateAlcaldiaConfigInput {
  nombre?: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  escudoPath?: string | null;
  escudoFile?: { mimetype: string; size: number } | null;
}

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024;

export class UpdateAlcaldiaConfigUseCase {
  constructor(private readonly repo: IAlcaldiaConfigRepository) {}

  async execute(input: UpdateAlcaldiaConfigInput): Promise<AlcaldiaConfig> {
    if (input.nombre !== undefined) {
      const trimmed = input.nombre.trim();
      if (trimmed.length < 3 || trimmed.length > 100) {
        const err: any = new Error("nombre debe tener entre 3 y 100 caracteres");
        err.statusCode = 400;
        err.code = "VALIDATION_ERROR";
        throw err;
      }
    }

    if (input.escudoFile) {
      if (!ALLOWED_MIME.has(input.escudoFile.mimetype)) {
        const err: any = new Error("MIME no permitido. Use png, jpeg o webp");
        err.statusCode = 400;
        err.code = "INVALID_MIME";
        throw err;
      }
      if (input.escudoFile.size > MAX_SIZE) {
        const err: any = new Error("Archivo excede 2MB");
        err.statusCode = 400;
        err.code = "FILE_TOO_LARGE";
        throw err;
      }
    }

    const current = await this.repo.get();

    const updated: AlcaldiaConfig = {
      ...current,
      nombre: input.nombre !== undefined ? input.nombre.trim() : current.nombre,
      nit: input.nit !== undefined ? input.nit : current.nit,
      direccion: input.direccion !== undefined ? input.direccion : current.direccion,
      telefono: input.telefono !== undefined ? input.telefono : current.telefono,
      email: input.email !== undefined ? input.email : current.email,
      escudoPath: input.escudoPath !== undefined ? input.escudoPath : current.escudoPath,
    };

    return this.repo.save(updated);
  }
}
