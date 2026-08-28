/**
 * Domain errors for the Station module.
 *
 * All errors extend Error and include a statusCode for HTTP mapping.
 */

export class DuplicateStationNameError extends Error {
  readonly statusCode = 409;

  constructor(name: string, corregimientoId: string) {
    super(
      `A station with name "${name}" already exists in this corregimiento (${corregimientoId})`
    );
    this.name = "DuplicateStationNameError";
  }
}

export class StationNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Station with id "${id}" not found`);
    this.name = "StationNotFoundError";
  }
}

export class AgentAlreadyAssignedError extends Error {
  readonly statusCode = 409;

  constructor(censusRecordId: string) {
    super(
      `Agent with census record "${censusRecordId}" is already assigned to an active station`
    );
    this.name = "AgentAlreadyAssignedError";
  }
}

export class InactiveStationError extends Error {
  readonly statusCode = 422;

  constructor(stationId: string) {
    super(`Cannot perform action on inactive station "${stationId}"`);
    this.name = "InactiveStationError";
  }
}

export class AgentNotAssignedError extends Error {
  readonly statusCode = 404;

  constructor(censusRecordId: string, stationId: string) {
    super(
      `Agent "${censusRecordId}" is not assigned to station "${stationId}"`
    );
    this.name = "AgentNotAssignedError";
  }
}
