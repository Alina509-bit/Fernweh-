import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";
import { ApiError } from "./errors.ts";
import type { Destination } from "./models/destination.ts";
import type { Collection } from "./repository/jsonFileCollection.ts";
import { destinationRoutes } from "./routes/destinations.ts";
import { DestinationService } from "./services/destinationService.ts";

export interface AppOptions {
  destinations: Collection<Destination>;
  /** Erlaubte Origins für CORS (das Vue-Frontend läuft auf einem anderen Port). */
  corsOrigins?: string[];
  /** Setzt den HSTS-Header – nur sinnvoll, wenn der Server per HTTPS erreichbar ist. */
  hsts?: boolean;
  /** Request-Logging (in Tests ausgeschaltet). */
  log?: boolean;
  now?: () => Date;
}

/**
 * Erzeugt die Hono-Anwendung. Abhängigkeiten (Speicher, Uhr) werden hereingereicht
 * (Konstruktor-Injection), damit die App ohne echte Datei und mit fester Zeit testbar ist.
 *
 * Bewusst ohne Anmeldung: Fernweh ist eine persönliche Single-User-Anwendung,
 * der Server ist nur auf diesem Rechner erreichbar (siehe main.ts, HOST=127.0.0.1).
 */
export function createApp(options: AppOptions) {
  const app = new Hono();
  const service = new DestinationService(options.destinations, options.now);

  if (options.log !== false) app.use("*", logger());

  app.use(
    "/api/*",
    cors({
      origin: options.corsOrigins ?? ["http://localhost:5173"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      exposeHeaders: ["Location"],
    }),
  );

  if (options.hsts) {
    app.use("*", async (c, next) => {
      await next();
      c.header("Strict-Transport-Security", "max-age=31536000");
    });
  }

  app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));
  app.route("/api/destinations", destinationRoutes(service));

  app.notFound((c) =>
    c.json(
      { error: { code: "NOT_FOUND", message: `Route ${c.req.method} ${c.req.path} existiert nicht` } },
      404,
    )
  );

  // Zentrale Fehlerbehandlung → einheitliches Fehlerformat für alle Clients
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        err.status,
      );
    }
    console.error("Unerwarteter Fehler:", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Ein unerwarteter Serverfehler ist aufgetreten" } },
      500,
    );
  });

  return app;
}
