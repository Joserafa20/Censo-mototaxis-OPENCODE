export const RURAL_CORREGIMIENTOS = [
  "Cascajal",
  "Colombia",
  "Isabel López",
  "Molineros",
  "Aguada de Pablo",
  "Gallego",
  "La Peña",
] as const;

export type CorregimientoName = (typeof RURAL_CORREGIMIENTOS)[number];
