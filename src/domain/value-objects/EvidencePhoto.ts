/**
 * Evidence photo helpers — MIME allowlist, size, and count validation.
 */

export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = typeof ALLOWED_MIMES[number];

export const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EVIDENCE_COUNT = 5;

export function isValidEvidenceMime(mime: string): boolean {
  return (ALLOWED_MIMES as readonly string[]).includes(mime);
}

export function isValidEvidenceSize(bytes: number): boolean {
  return bytes <= MAX_EVIDENCE_SIZE_BYTES;
}

export function validateEvidenceCount(current: number, incoming: number): boolean {
  return current + incoming <= MAX_EVIDENCE_COUNT;
}

export function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return "bin";
  }
}
