export type AgeRangeLabel = "18-25" | "26-35" | "36-45" | "46-55" | "56+";

export function calculateAgeRange(birthdate: Date | string | null | undefined): AgeRangeLabel | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  if (isNaN(bd.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  if (age < 18) return "18-25"; // youngest bucket includes <18 per spec
  if (age <= 25) return "18-25";
  if (age <= 35) return "26-35";
  if (age <= 45) return "36-45";
  if (age <= 55) return "46-55";
  return "56+";
}
