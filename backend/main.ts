import { join } from "@std/path";
import { createApp } from "./src/app.ts";
import type { Destination } from "./src/models/destination.ts";
import type { Session, User } from "./src/models/user.ts";
import { JsonFileCollection } from "./src/repository/jsonFileCollection.ts";
import { seedIfEmpty } from "./src/seed.ts";

/**
 * Einstiegspunkt: liest die Konfiguration aus Umgebungsvariablen (.env),
 * verdrahtet die Abhängigkeiten und startet den Server – per HTTP oder HTTPS.
 *
 * Wird HTTPS verlangt (USE_HTTPS=true), müssen die Zertifikate vorhanden sein.
 * Es gibt bewusst KEINEN stillen Rückfall auf HTTP.
 */
const port = Number(Deno.env.get("PORT") ?? 8000);
const dataDir = Deno.env.get("DATA_DIR") ?? "./data";
const corsOrigins = (Deno.env.get("CORS_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const useHttps = Deno.env.get("USE_HTTPS") === "true";

const users = new JsonFileCollection<User>(join(dataDir, "users.json"));
const sessions = new JsonFileCollection<Session>(join(dataDir, "sessions.json"));
const destinations = new JsonFileCollection<Destination>(join(dataDir, "destinations.json"));

const { app, auth } = createApp({ users, sessions, destinations, corsOrigins, https: useHttps });

if (await seedIfEmpty(new URL("./data/seed.json", import.meta.url), auth, users, destinations)) {
  console.log("📦 Demo-Nutzer und Beispieldaten aus data/seed.json angelegt");
}

if (useHttps) {
  const keyPath = Deno.env.get("SSL_KEY_PATH");
  const certPath = Deno.env.get("SSL_CERT_PATH");
  if (!keyPath || !certPath) {
    throw new Error("USE_HTTPS=true, aber SSL_KEY_PATH / SSL_CERT_PATH fehlen in der .env");
  }
  Deno.serve({
    port,
    key: await Deno.readTextFile(keyPath),
    cert: await Deno.readTextFile(certPath),
    onListen: ({ port }) => console.log(`🔒 Reiseziele-API läuft auf https://localhost:${port}`),
  }, app.fetch);
} else {
  Deno.serve({
    port,
    onListen: ({ port }) => console.log(`🌍 Reiseziele-API läuft auf http://localhost:${port}`),
  }, app.fetch);
}
