export interface AlcaldiaConfig {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  escudoPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createDefaultAlcaldiaConfig(): AlcaldiaConfig {
  const now = new Date();
  return {
    id: "alcaldia",
    nombre: "Alcaldía de Sabanalarga",
    nit: null,
    direccion: null,
    telefono: null,
    email: null,
    escudoPath: null,
    createdAt: now,
    updatedAt: now,
  };
}
