export class ValidationFailedError extends Error {
  readonly statusCode = 422;
  readonly code = "VALIDATION_FAILED";
  readonly details: Array<{ field: string; code: string; message?: string }>;
  constructor(details: Array<{ field: string; code: string; message?: string }>) {
    super("VALIDATION_FAILED");
    this.name = "ValidationFailedError";
    this.details = details;
  }
}

export class InvalidTransitionError extends Error {
  readonly statusCode = 409;
  readonly code = "INVALID_TRANSITION";
  constructor(message = "Transición de estado no permitida") {
    super(message);
    this.name = "InvalidTransitionError";
    (this as any).code = "INVALID_TRANSITION";
  }
}

export class NotOwnerError extends Error {
  readonly statusCode = 403;
  readonly code = "NOT_OWNER";
  constructor(message = "No es propietario del registro") { super(message); this.name = "NotOwnerError"; (this as any).code = "NOT_OWNER"; }
}

export class PeriodClosedError extends Error {
  readonly statusCode = 409;
  readonly code = "PERIOD_CLOSED";
  constructor(message = "Período cerrado, transición bloqueada") { super(message); this.name = "PeriodClosedError"; (this as any).code = "PERIOD_CLOSED"; }
}

export class PeriodHasPendingRecordsError extends Error {
  readonly statusCode = 409;
  readonly code = "PERIOD_HAS_PENDING_RECORDS";
  readonly pendingCount: number;
  readonly inProgressCount: number;
  constructor(pendingCount: number, inProgressCount: number) {
    super("PERIOD_HAS_PENDING_RECORDS");
    this.name = "PeriodHasPendingRecordsError";
    (this as any).code = "PERIOD_HAS_PENDING_RECORDS";
    this.pendingCount = pendingCount;
    this.inProgressCount = inProgressCount;
  }
}

export class PeriodAlreadyClosedError extends Error {
  readonly statusCode = 409;
  readonly code = "PERIOD_ALREADY_CLOSED";
  constructor(msg = "Período ya cerrado") { super(msg); this.name = "PeriodAlreadyClosedError"; (this as any).code = "PERIOD_ALREADY_CLOSED"; }
}

export class AlreadyApprovedError extends Error {
  readonly statusCode = 409;
  readonly code = "ALREADY_APPROVED";
  constructor(msg = "Registro ya aprobado, no admite transición") { super(msg); this.name = "AlreadyApprovedError"; (this as any).code = "ALREADY_APPROVED"; }
}

export class RejectReasonRequiredError extends Error {
  readonly statusCode = 400;
  readonly code = "REJECT_REASON_REQUIRED";
  constructor(msg = "Motivo de rechazo requerido (10-500 chars)") { super(msg); this.name = "RejectReasonRequiredError"; (this as any).code = "REJECT_REASON_REQUIRED"; }
}
