/**
 * Value Object helpers for Habeas Data consent.
 * Validates that consent is explicitly given and signature length is 3..200 trimmed.
 */

export function isValidConsent(given: unknown, signature: unknown): boolean {
  if (given !== true) return false;
  if (typeof signature !== "string") return false;
  const trimmed = signature.trim();
  return trimmed.length >= 3 && trimmed.length <= 200;
}

export function getConsentErrorCode(given: unknown, signature: unknown): string | null {
  if (given !== true) return "INVALID_CONSENT";
  if (typeof signature !== "string") return "INVALID_SIGNATURE";
  const trimmed = signature.trim();
  if (trimmed.length === 0) return "INVALID_SIGNATURE";
  if (trimmed.length < 3) return "INVALID_SIGNATURE_TOO_SHORT";
  if (trimmed.length > 200) return "INVALID_SIGNATURE_TOO_LONG";
  return null;
}
