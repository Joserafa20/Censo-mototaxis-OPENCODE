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
