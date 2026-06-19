import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonBad(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonZodError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation error", issues: err.issues },
      { status: 400 },
    );
  }
  return null;
}

