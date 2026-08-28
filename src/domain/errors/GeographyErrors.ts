/**
 * Domain errors for the Geography module.
 *
 * All errors extend Error and include a statusCode for HTTP mapping.
 */

export class DuplicateGeographyNameError extends Error {
  readonly statusCode = 409;

  constructor(name: string, context: string) {
    super(`A ${context} with name "${name}" already exists in this scope`);
    this.name = "DuplicateGeographyNameError";
  }
}

export class InactiveParentError extends Error {
  readonly statusCode = 422;

  constructor(parentType: string, parentName: string) {
    super(`Cannot create child under inactive ${parentType} "${parentName}"`);
    this.name = "InactiveParentError";
  }
}

export class ReactivateRequiresActiveParentError extends Error {
  readonly statusCode = 422;

  constructor(childType: string, childName: string, parentType: string, parentName: string) {
    super(
      `Cannot reactivate ${childType} "${childName}" because its parent ${parentType} "${parentName}" is inactive`
    );
    this.name = "ReactivateRequiresActiveParentError";
  }
}

export class InvalidCoordinatesError extends Error {
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
    this.name = "InvalidCoordinatesError";
  }
}

export class GeographyNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(type: string, id: string) {
    super(`${type} with id "${id}" not found`);
    this.name = "GeographyNotFoundError";
  }
}

export class MunicipalityNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Municipality with id "${id}" not found`);
    this.name = "MunicipalityNotFoundError";
  }
}

export class CorregimientoNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Corregimiento with id "${id}" not found`);
    this.name = "CorregimientoNotFoundError";
  }
}

export class NeighborhoodNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Neighborhood with id "${id}" not found`);
    this.name = "NeighborhoodNotFoundError";
  }
}
