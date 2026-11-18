import { join } from "@std/path";
import { createApp } from "./src/app.ts";
import type { Destination } from "./src/models/destination.ts";
import { JsonFileCollection } from "./src/repository/jsonFileCollection.ts";

/**
 * Einstiegspunkt: liest die Konfiguration aus Umgebungsvariablen (.env),
 * verdrahtet die Abhängigkeiten und startet den Server – per HTTP oder HTTPS.
 *
 * HOST=127.0.0.1 (Standard): Der Server nimmt nur Verbindungen von diesem Rechner an.
 * Deshalb braucht die Single-User-Anwendung keine Anmeldung – aus dem Netzwerk
 * (z. B. WLAN) ist die API nicht erreichbar.
 *
 * Wird HTTPS verlangt (USE_HTTPS=true), müssen die Zertifikate vorhanden sein.
 * Es gibt bewusst KEINEN stillen Rückfall auf HTTP.
 */
const port = Number(Deno.env.get("PORT") ?? 8000);
const hostname = Deno.env.get("HOST") ?? "127.0.0.1";
const dataDir = Deno.env.get("DATA_DIR") ?? "./data";
const dataFile = join(dataDir, "destinations.json");
const corsOrigins = (Deno.env.get("CORS_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const useHttps = Deno.env.get("USE_HTTPS") === "true";

// Beim allerersten Start: Datendatei aus den Beispieldaten anlegen
try {
  await Deno.stat(dataFile);
} catch (err) {
  if (!(err instanceof Deno.errors.NotFound)) throw err;
  await Deno.mkdir(dataDir, { recursive: true });
  await Deno.copyFile(new URL("./data/seed.json", import.meta.url), dataFile);
  console.log(`📦 ${dataFile} aus data/seed.json angelegt`);
}

const app = createApp({
  destinations: new JsonFileCollection<Destination>(dataFile),
  corsOrigins,
  hsts: useHttps,
});

const onListen = ({ port }: { port: number }) =>
  console.log(
    `${useHttps ? "🔒" : "🌍"} Reiseziele-API läuft auf ${useHttps ? "https" : "http"}://localhost:${port}` +
      ` (nur lokal erreichbar: ${hostname})`,
  );

if (useHttps) {
  const keyPath = Deno.env.get("SSL_KEY_PATH");
  const certPath = Deno.env.get("SSL_CERT_PATH");
  if (!keyPath || !certPath) {
    throw new Error("USE_HTTPS=true, aber SSL_KEY_PATH / SSL_CERT_PATH fehlen in der .env");
  }
  Deno.serve({
    port,
    hostname,
    key: await Deno.readTextFile(keyPath),
    cert: await Deno.readTextFile(certPath),
    onListen,
  }, app.fetch);
} else {
  Deno.serve({ port, hostname, onListen }, app.fetch);
}
