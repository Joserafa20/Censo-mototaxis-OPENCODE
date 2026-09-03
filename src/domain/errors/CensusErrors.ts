/**
 * Domain errors for the Census Record module.
 *
 * All errors extend Error and include a statusCode for HTTP mapping.
 */

export class DuplicateCedulaError extends Error {
  readonly statusCode = 409;

  constructor(cedula: string) {
    super(`Ya existe un registro con esta cédula: ${cedula}`);
    this.name = "DuplicateCedulaError";
  }
}

export class DuplicatePlateError extends Error {
  readonly statusCode = 409;

  constructor(plate: string) {
    super(`Ya existe un registro con esta placa: ${plate}`);
    this.name = "DuplicatePlateError";
  }
}

export class CensusRecordNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Census record with id "${id}" not found`);
    this.name = "CensusRecordNotFoundError";
  }
}

export class PeriodNotActiveError extends Error {
  readonly statusCode = 400;

  constructor(message = "No hay período de censo activo") {
    super(message);
    this.name = "PeriodNotActiveError";
  }
}

export class InactiveCorregimientoError extends Error {
  readonly statusCode = 400;

  constructor(message = "El corregimiento está inactivo") {
    super(message);
    this.name = "InactiveCorregimientoError";
  }
}

export class InactiveNeighborhoodError extends Error {
  readonly statusCode = 400;

  constructor(message = "El barrio está inactivo") {
    super(message);
    this.name = "InactiveNeighborhoodError";
  }
}

export class StationRequiredError extends Error {
  readonly statusCode = 400;

  constructor(message = "Debe asignar una estación") {
    super(message);
    this.name = "StationRequiredError";
  }
}

export class StationNotAllowedForIndependentError extends Error {
  readonly statusCode = 400;

  constructor(message = "No puede asignar estación a independiente") {
    super(message);
    this.name = "StationNotAllowedForIndependentError";
  }
}

export class InactiveStationError extends Error {
  readonly statusCode = 400;

  constructor(message = "La estación está inactiva") {
    super(message);
    this.name = "InactiveStationError";
  }
}

export class InvalidCoordinatesError extends Error {
  readonly statusCode = 422;

  constructor(message = "Coordenadas GPS inválidas") {
    super(message);
    this.name = "InvalidCoordinatesError";
  }
}

export class CensusRecordAlreadyInactiveError extends Error {
  readonly statusCode = 400;

  constructor(message = "El registro ya está inactivo") {
    super(message);
    this.name = "CensusRecordAlreadyInactiveError";
  }
}

export class InvalidConsentError extends Error {
  readonly statusCode = 422;
  readonly code = "INVALID_CONSENT";
  readonly details: Array<{ field: string; code: string }> = [{ field: "consentGiven", code: "INVALID_CONSENT" }];
  constructor(message = "El consentimiento es obligatorio (Ley 1581)") {
    super(message);
    this.name = "InvalidConsentError";
  }
}

export class InvalidSignatureError extends Error {
  readonly statusCode = 422;
  readonly code: string;
  readonly details: Array<{ field: string; code: string }>;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InvalidSignatureError";
    this.code = code;
    this.details = [{ field: "consentSignature", code }];
  }
}

export class InvalidEvidencePhotoError extends Error {
  readonly statusCode = 422;
  readonly code: string;
  readonly details: Array<{ field: string; code: string }>;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InvalidEvidencePhotoError";
    this.code = code;
    this.details = [{ field: "evidencePhotos", code }];
  }
}

export class EvidenceLimitExceededError extends InvalidEvidencePhotoError {
  constructor() { super("EVIDENCE_LIMIT_EXCEEDED", "Se excedió el límite de 5 fotos"); }
}

export class InvalidEvidenceMimeError extends InvalidEvidencePhotoError {
  constructor() { super("INVALID_EVIDENCE_MIME", "MIME no permitido"); }
}

export class PayloadTooLargeError extends Error {
  readonly statusCode = 413;
  readonly code = "PAYLOAD_TOO_LARGE";
  readonly details: Array<{ field: string; code: string }> = [{ field: "evidencePhotos", code: "PAYLOAD_TOO_LARGE" }];
  constructor(message = "Archivo excede 5 MB") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class InvalidVehicleTypeError extends Error {
  readonly statusCode = 400; readonly code = "INVALID_VEHICLE_TYPE"; readonly details = [{ field: "vehicleType", code: "INVALID_VEHICLE_TYPE" }];
  constructor(msg="Tipo de vehículo inválido"){ super(msg); this.name="InvalidVehicleTypeError"; }
}
export class InvalidTarifaError extends Error {
  readonly statusCode = 400; readonly code = "INVALID_TARIFA"; readonly details = [{ field: "tarifaValor", code: "INVALID_TARIFA" }];
  constructor(msg="Tarifa inválida"){ super(msg); this.name="InvalidTarifaError"; }
}
export class StationNotActiveError extends Error {
  readonly statusCode = 400; readonly code = "STATION_NOT_ACTIVE"; readonly details = [{ field: "stationId", code: "STATION_NOT_ACTIVE" }];
  constructor(msg="Estación no activa"){ super(msg); this.name="StationNotActiveError"; }
}
export class RequiredActividadError extends Error {
  readonly statusCode = 400; readonly code = "REQUIRED_ACTIVIDAD"; readonly details = [{ field: "actividadMotocarro", code: "REQUIRED_ACTIVIDAD" }];
  constructor(msg="Actividad requerida"){ super(msg); this.name="RequiredActividadError"; }
}
export class RequiredDocumentosError extends Error {
  readonly statusCode = 400; readonly code = "REQUIRED_DOCUMENTOS"; readonly details = [{ field: "documentosAlDia", code: "REQUIRED_DOCUMENTOS" }];
  constructor(msg="documentosAlDia requerido"){ super(msg); this.name="RequiredDocumentosError"; }
}
