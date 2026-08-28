export class InvalidPeriodError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_PERIOD";
  constructor(message = "Período no existe") {
    super(message);
    this.name = "InvalidPeriodError";
  }
}

export class InvalidCorregimientoError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_CORREGIMIENTO";
  constructor(message = "Corregimiento no existe") {
    super(message);
    this.name = "InvalidCorregimientoError";
  }
}

export class InvalidStationError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_STATION";
  constructor(message = "Estación no existe o está inactiva") {
    super(message);
    this.name = "InvalidStationError";
  }
}

export class InvalidLocationTypeError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_LOCATION_TYPE";
  constructor(message = "locationType debe ser urban o rural") {
    super(message);
    this.name = "InvalidLocationTypeError";
  }
}

export class InvalidDateRangeError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_DATE_RANGE";
  constructor(message = "dateFrom debe ser <= dateTo") {
    super(message);
    this.name = "InvalidDateRangeError";
  }
}

export class InvalidFormatError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_FORMAT";
  constructor(message = "format debe ser csv o xlsx") {
    super(message);
    this.name = "InvalidFormatError";
  }
}

export class ExportLimitExceededError extends Error {
  readonly statusCode = 400;
  readonly code = "EXPORT_LIMIT_EXCEEDED";
  constructor(message = "Exportación excede 10.000 filas. Refine filtros") {
    super(message);
    this.name = "ExportLimitExceededError";
  }
}

export class ForbiddenIncludeInactiveError extends Error {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
  constructor(message = "Solo admin puede usar includeInactive") {
    super(message);
    this.name = "ForbiddenIncludeInactiveError";
  }
}

export class InvalidOperationTypeError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_OPERATION_TYPE";
  constructor(message = "operationType debe ser station o independent") {
    super(message);
    this.name = "InvalidOperationTypeError";
  }
}
