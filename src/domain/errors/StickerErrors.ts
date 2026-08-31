export class StickerNotEligibleError extends Error {
  readonly statusCode = 409;
  readonly code = "STICKER_NOT_ELIGIBLE";
  constructor(message = "Solo registros APROBADO/APROBADA pueden generar adhesivo") {
    super(message);
    this.name = "StickerNotEligibleError";
  }
}
export class StickerNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "STICKER_NOT_FOUND";
  constructor(folio: string) {
    super(`Folio ${folio} no encontrado`);
    this.name = "StickerNotFoundError";
  }
}
export class BatchLimitExceededError extends Error {
  readonly statusCode = 400;
  readonly code = "BATCH_LIMIT_EXCEEDED";
  constructor(limit = 100) {
    super(`Batch excede límite de ${limit}`);
    this.name = "BatchLimitExceededError";
  }
}
