/**
 * Dünner Wrapper um die Fetch API.
 * Übersetzt das einheitliche Fehlerformat des Backends
 *   { error: { code, message, details } }
 * in eine typisierte Exception, die die UI anzeigen kann.
 */

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface FieldError {
  field: string | null;
  message: string;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }

  /** Feldfehler als Map, z. B. { name: "Name ist erforderlich" } */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const d of this.details) if (d.field && !map[d.field]) map[d.field] = d.message;
    return map;
  }
}

/** Wird aufgerufen, wenn der Server 401 meldet (Session abgelaufen) → zurück zum Login. */
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      // Session-Cookie (HttpOnly) mitsenden, obwohl die API auf einem anderen Port läuft
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      0,
      "NETWORK_ERROR",
      "Server nicht erreichbar. Läuft das Backend auf " + API_URL + "?",
    );
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const err = body?.error;
    if (response.status === 401 && err?.code === "UNAUTHORIZED") unauthorizedHandler?.();
    throw new ApiRequestError(
      response.status,
      err?.code ?? "HTTP_ERROR",
      err?.message ?? `Unerwartete Antwort (${response.status})`,
      Array.isArray(err?.details) ? err.details : [],
    );
  }
  return body as T;
}
