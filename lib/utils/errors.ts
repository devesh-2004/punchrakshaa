import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Centralized error utilities — OPT-IN and backward compatible.
 *
 * Existing routes already use `jsonBad`/`jsonZodError` (the `{ error }` shape)
 * and are left untouched to avoid changing their response contracts. New code
 * (or routes that already use the `{ success, message }` shape, e.g. /api/reviews)
 * can throw these typed errors and call `handleApiError(err)` in the catch block
 * for consistent status codes without bespoke handling.
 */

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export class ValidationError extends AppError {
  issues?: unknown;
  constructor(message = "Validation failed", issues?: unknown) {
    super(message, 400);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Map any thrown value to a standardized `{ success, message, errors? }`
 * response. Use ONLY in handlers that already use the `{ success, message }`
 * contract — do not retrofit into routes using the `{ error }` shape.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { success: false, message: "Validation failed", errors: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { success: false, message: err.message, errors: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Server error";
  return NextResponse.json({ success: false, message }, { status: 500 });
}
