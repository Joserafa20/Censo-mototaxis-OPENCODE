/**
 * Error handler middleware
 *
 * Maps domain errors to HTTP status codes.
 * All domain errors extend Error and include a statusCode property.
 */

import type { Request, Response, NextFunction } from "express";

interface DomainError extends Error {
  statusCode: number;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = isDomainError(err) ? err.statusCode : 500;
  const message = isDomainError(err) ? err.message : "Internal server error";

  // Structured errors with code/details (422/413 habeas)
  if (err?.code && err?.details) {
    res.status(statusCode).json({
      code: err.code,
      message,
      details: err.details,
      error: err.name ?? "Error",
    });
    return;
  }

  res.status(statusCode).json({
    error: err.name ?? "Error",
    message,
    ...(err?.code ? { code: err.code } : {}),
  });
}

function isDomainError(err: Error): err is DomainError {
  return "statusCode" in err && typeof (err as DomainError).statusCode === "number";
}
