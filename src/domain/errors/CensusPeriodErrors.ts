/**
 * Domain errors for the Census Period module.
 *
 * All errors extend Error and include a statusCode for HTTP mapping.
 */

export class OverlapCensusPeriodError extends Error {
  readonly statusCode = 409;

  constructor(message = "The new period overlaps with an existing period") {
    super(message);
    this.name = "OverlapCensusPeriodError";
  }
}

export class ActivePeriodAlreadyExistsError extends Error {
  readonly statusCode = 409;

  constructor(message = "An active census period already exists. Deactivate it first.") {
    super(message);
    this.name = "ActivePeriodAlreadyExistsError";
  }
}

export class InvalidStatusTransitionError extends Error {
  readonly statusCode = 422;

  constructor(from: string, to: string) {
    super(`Cannot transition from "${from}" to "${to}"`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class CensusPeriodNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "Census period not found") {
    super(message);
    this.name = "CensusPeriodNotFoundError";
  }
}

export class CensusPeriodNameAlreadyExistsError extends Error {
  readonly statusCode = 409;

  constructor(name: string) {
    super(`Census period name "${name}" already exists`);
    this.name = "CensusPeriodNameAlreadyExistsError";
  }
}

export class CannotEditFinalizedPeriodError extends Error {
  readonly statusCode = 422;

  constructor(message = "Cannot edit a finalized census period") {
    super(message);
    this.name = "CannotEditFinalizedPeriodError";
  }
}
