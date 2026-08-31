import type { Request, Response, NextFunction } from "express";
import type { GetAlcaldiaConfigUseCase } from "../../application/use-cases/GetAlcaldiaConfigUseCase.js";
import type { UpdateAlcaldiaConfigUseCase } from "../../application/use-cases/UpdateAlcaldiaConfigUseCase.js";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

export class AlcaldiaController {
  constructor(
    private readonly getUseCase: GetAlcaldiaConfigUseCase,
    private readonly updateUseCase: UpdateAlcaldiaConfigUseCase
  ) {}

  get = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.getUseCase.execute();
      res.status(200).json(config);
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;

      let escudoPath: string | undefined;
      if (file) {
        const ext = path.extname(file.originalname) || this.extFromMime(file.mimetype);
        const dir = path.join(process.cwd(), "uploads", "alcaldia");
        fs.mkdirSync(dir, { recursive: true });
        const filename = `escudo-${randomUUID()}${ext}`;
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, file.buffer);
        escudoPath = `/uploads/alcaldia/${filename}`;
      }

      const body = req.body ?? {};
      // body fields come as strings from multipart; convert empty strings to null handling
      const input: any = {};
      if (body.nombre !== undefined) input.nombre = body.nombre;
      if (body.nit !== undefined) input.nit = body.nit === "" ? null : body.nit;
      if (body.direccion !== undefined) input.direccion = body.direccion === "" ? null : body.direccion;
      if (body.telefono !== undefined) input.telefono = body.telefono === "" ? null : body.telefono;
      if (body.email !== undefined) input.email = body.email === "" ? null : body.email;
      if (escudoPath) input.escudoPath = escudoPath;
      if (file) input.escudoFile = { mimetype: file.mimetype, size: file.size };

      const updated = await this.updateUseCase.execute(input);
      res.status(200).json(updated);
    } catch (e) {
      next(e);
    }
  };

  private extFromMime(mime: string): string {
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg") return ".jpg";
    if (mime === "image/webp") return ".webp";
    return "";
  }
}
