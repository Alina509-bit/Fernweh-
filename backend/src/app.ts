import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";
import { type AppEnv, requireAuth } from "./auth.ts";
import { ApiError } from "./errors.ts";
import type { Destination } from "./models/destination.ts";
import type { Session, User } from "./models/user.ts";
import type { Collection } from "./repository/jsonFileCollection.ts";
import { authRoutes } from "./routes/auth.ts";
import { destinationRoutes } from "./routes/destinations.ts";
import { AuthService } from "./services/authService.ts";
import { DestinationService } from "./services/destinationService.ts";

export interface AppOptions {
  destinations: Collection<Destination>;
  users: Collection<User>;
  sessions: Collection<Session>;
  /** Erlaubte Origins für CORS (das Vue-Frontend läuft auf einem anderen Port). */
  corsOrigins?: string[];
  /** HTTPS aktiv → HSTS-Header und Secure-Cookies. */
  https?: boolean;
  /** PBKDF2-Iterationen (in Tests klein, damit sie schnell laufen). */
  passwordIterations?: number;
  log?: boolean;
  now?: () => Date;
}

/**
 * Erzeugt die Hono-Anwendung. Alle Abhängigkeiten werden hereingereicht
 * (Konstruktor-Injection), damit die App mit In-Memory-Daten testbar ist.
 */
export function createApp(options: AppOptions) {
  const app = new Hono<AppEnv>();
  const auth = new AuthService(
    options.users,
    options.sessions,
    options.passwordIterations,
    options.now,
  );
  const destinations = new DestinationService(options.destinations, options.now);

  if (options.log !== false) app.use("*", logger());

  app.use(
    "/api/*",
    cors({
      origin: options.corsOrigins ?? ["http://localhost:5173"],
      credentials: true, // Cookies dürfen vom Frontend-Origin mitgeschickt werden
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      exposeHeaders: ["Location"],
    }),
  );

  if (options.https) {
    app.use("*", async (c, next) => {
      await next();
      c.header("Strict-Transport-Security", "max-age=31536000");
    });
  }

  app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));
  app.route("/api/auth", authRoutes(auth, !!options.https));

  // Alles unter /api/destinations nur mit gültiger Session
  app.use("/api/destinations/*", requireAuth(auth));
  app.use("/api/destinations", requireAuth(auth));
  app.route("/api/destinations", destinationRoutes(destinations));

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

  return { app, auth };
}
