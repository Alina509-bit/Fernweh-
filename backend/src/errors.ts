import type { ContentfulStatusCode } from "@hono/hono/utils/http-status";

/**
 * Fachlicher Fehler mit HTTP-Status und maschinenlesbarem Code.
 * Wird von der Service-Schicht geworfen und zentral in app.ts in das
 * einheitliche Fehlerformat übersetzt:
 *
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details": [...] } }
 */
export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static notFound(message: string) {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string) {
    return new ApiError(409, "CONFLICT", message);
  }

  static validation(message: string, details?: unknown) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  /** Verletzung einer Geschäftsregel (syntaktisch korrekt, fachlich unzulässig). */
  static businessRule(message: string, field?: string) {
    return new ApiError(
      422,
      "BUSINESS_RULE_VIOLATION",
      message,
      field ? [{ field, message }] : undefined,
    );
  }
}
