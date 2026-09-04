import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ApiErrorOptions = {
  context?: string;
  defaultMessage?: string;
  notFoundMessage?: string;
};

/** An error whose message and status are safe to return to an API caller. */
export class PublicApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export function apiError(error: unknown, options: ApiErrorOptions = {}) {
  const context = options.context ? `[api:${options.context}]` : "[api]";
  console.error(context, error);

  if (error instanceof PublicApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.code ? { code: error.code } : {}) },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const flattened = error.flatten();
    return NextResponse.json(
      {
        error: "Some information is missing or invalid. Check the form and try again.",
        issues: flattened.fieldErrors,
        ...(flattened.formErrors.length ? { formIssues: flattened.formErrors } : {}),
      },
      { status: 422 },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "The request body is not valid. Refresh the page and try again." },
      { status: 400 },
    );
  }

  if (error instanceof Error && error.message === "NOT_FOUND") {
    return NextResponse.json(
      { error: options.notFoundMessage ?? "The requested item could not be found." },
      { status: 404 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: options.notFoundMessage ?? "The requested item could not be found." },
        { status: 404 },
      );
    }
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? String(error.meta.target[0] ?? "")
        : String(error.meta?.target ?? "");
      const label = duplicateFieldLabel(target);
      return NextResponse.json(
        { error: label
          ? `That ${label} is already used by another record. Enter a different one and try again.`
          : "One of the entered values is already in use. Change it and try again." },
        { status: 409 },
      );
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return NextResponse.json(
        { error: "This item is still in use and cannot be changed or removed." },
        { status: 409 },
      );
    }
    if (error.code === "P2024") {
      return serviceUnavailable(options.defaultMessage);
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return serviceUnavailable(options.defaultMessage);
  }

  return NextResponse.json(
    {
      error:
        options.defaultMessage ??
        "The request could not be completed. Please try again.",
    },
    { status: 500 },
  );
}

function serviceUnavailable(message?: string) {
  return NextResponse.json(
    { error: message ?? "This service is temporarily unavailable. Please try again shortly." },
    { status: 503 },
  );
}

function duplicateFieldLabel(target: string) {
  const labels: Record<string,string> = {
    email:"email address",
    orderNumber:"order number",
    requestId:"order request",
    sku:"SKU",
    slug:"product address",
    label:"size",
  };
  return labels[target] ?? "";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
