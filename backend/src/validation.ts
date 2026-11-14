import type { z } from "@zod/zod";
import { ApiError } from "./errors.ts";

/** Prüft Daten gegen ein Zod-Schema; Fehler → 400 mit feldbezogener Liste. */
export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || null,
      message: issue.message,
    }));
    throw ApiError.validation("Die Anfrage enthält ungültige Daten", details);
  }
  return result.data;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw ApiError.validation("Der Request-Body ist kein gültiges JSON");
  }
}
