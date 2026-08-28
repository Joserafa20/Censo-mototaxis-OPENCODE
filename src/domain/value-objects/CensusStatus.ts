export type CensusValidationStatus =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "EN_REVISION"
  | "APROBADO"
  | "RECHAZADO";

export const CENSUS_STATUSES: CensusValidationStatus[] = [
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADO",
  "EN_REVISION",
  "APROBADO",
  "RECHAZADO",
];

/**
 * Matriz de transiciones permitidas.
 * Key = origen, value = destinos permitidos.
 */
const ALLOWED: Record<CensusValidationStatus, CensusValidationStatus[]> = {
  PENDIENTE: ["EN_PROCESO"],
  EN_PROCESO: ["COMPLETADO"],
  COMPLETADO: ["EN_REVISION"],
  EN_REVISION: ["APROBADO", "RECHAZADO"],
  APROBADO: [],
  RECHAZADO: ["EN_PROCESO"],
};

/**
 * Verifica si una transición es válida considerando rol, propiedad y período.
 * @param from origen
 * @param to destino
 * @param role rol del actor (censista | admin)
 * @param isOwner true si el actor es dueño del registro (para submit)
 * @param periodStatus estado del período (ACTIVO | CERRADO)
 */
export function canTransition(
  from: CensusValidationStatus,
  to: CensusValidationStatus,
  role: string,
  isOwner: boolean,
  periodStatus: string
): boolean {
  if (periodStatus === "CERRADO" || periodStatus === "FINALIZADO") return false;
  if (!ALLOWED[from]?.includes(to)) return false;

  // Role checks
  if (from === "PENDIENTE" && to === "EN_PROCESO") {
    return role === "censista" || role === "admin";
  }
  if (from === "EN_PROCESO" && to === "COMPLETADO") {
    return role === "censista" && isOwner;
  }
  if (from === "COMPLETADO" && to === "EN_REVISION") {
    return role === "admin";
  }
  if (from === "EN_REVISION" && (to === "APROBADO" || to === "RECHAZADO")) {
    return role === "admin";
  }
  if (from === "RECHAZADO" && to === "EN_PROCESO") {
    return true; // automática post-rechazo, sistema
  }
  return false;
}

export function isValidCensusStatus(s: string): s is CensusValidationStatus {
  return (CENSUS_STATUSES as string[]).includes(s);
}
