export function maskCedula(cedula: string): string {
  if (!cedula) return cedula;
  const visible = cedula.slice(-4);
  return "***" + visible;
}

export function maskPhone(phone: string | null): string | null {
  if (!phone) return phone;
  const visible = phone.slice(-3);
  return "***" + visible;
}

export function maskName(firstName: string, lastName: string): { firstName: string; lastName: string } {
  const mask = (s: string) => (s ? s[0] + "***" : s);
  return { firstName: mask(firstName), lastName: mask(lastName) };
}

export const LEY_1581_NOTICE =
  "Datos tratados conforme a Ley 1581 de 2012 — Uso exclusivo para fines estadísticos del Censo de Mototaxis de Sabanalarga. Prohibida su divulgación.";
