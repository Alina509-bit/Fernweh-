import { assert, assertEquals, assertExists, assertMatch } from "@std/assert";
import { createApp } from "../src/app.ts";
import type { Destination } from "../src/models/destination.ts";
import type { Session, User } from "../src/models/user.ts";
import { JsonFileCollection, MemoryCollection } from "../src/repository/jsonFileCollection.ts";
import { hashPassword, verifyPassword } from "../src/services/crypto.ts";

const FIXED_NOW = () => new Date("2026-11-12T10:00:00Z");

/** Baut die echte Hono-App mit In-Memory-Speicher und liefert einen kleinen HTTP-Client. */
function setup() {
  const users = new MemoryCollection<User>();
  const sessions = new MemoryCollection<Session>();
  const destinations = new MemoryCollection<Destination>();
  const { app } = createApp({
    users,
    sessions,
    destinations,
    log: false,
    now: FIXED_NOW,
    passwordIterations: 1_000, // schnell im Test, Produktion: 600 000
  });

  const call = (method: string, path: string, body?: unknown, cookie?: string) =>
    app.request(path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  /** Registriert einen Nutzer und gibt das Session-Cookie zurück ("sid=..."). */
  async function signUp(email = "lena@test.de", password = "sehr-geheim-123") {
    const res = await call("POST", "/api/auth/register", { email, password, displayName: "Lena" });
    assertEquals(res.status, 201);
    const setCookie = res.headers.get("Set-Cookie")!;
    return setCookie.split(";")[0];
  }

  return { call, signUp, users, sessions };
}

const lisbon = { name: "Lissabon", country: "Portugal", continent: "EUROPE", status: "WISHLIST" };

// --- Anmeldung & Sessions -------------------------------------------------------

Deno.test("Registrierung setzt HttpOnly-Session-Cookie, Antwort ohne Passwort-Hash", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/auth/register", {
    email: "  Lena@Test.DE ",
    password: "sehr-geheim-123",
    displayName: "Lena",
  });
  assertEquals(res.status, 201);
  const cookie = res.headers.get("Set-Cookie")!;
  assertMatch(cookie, /^sid=/);
  assertMatch(cookie, /HttpOnly/);
  assertMatch(cookie, /SameSite=Lax/);
  const body = await res.json();
  assertEquals(body.email, "lena@test.de"); // normalisiert
  assertEquals(body.passwordHash, undefined);
});

Deno.test("Passwörter werden gesalzen gehasht, nie im Klartext gespeichert", async () => {
  const { signUp, users } = setup();
  await signUp("lena@test.de", "sehr-geheim-123");
  const [stored] = await users.findAll();
  assert(!JSON.stringify(stored).includes("sehr-geheim-123"));
  assertMatch(stored.passwordHash, /^pbkdf2-sha256\$1000\$/);
  // gleiches Passwort → anderer Hash (Salt)
  assert((await hashPassword("x", 1000)) !== (await hashPassword("x", 1000)));
  assert(await verifyPassword("sehr-geheim-123", stored.passwordHash));
  assert(!(await verifyPassword("falsch", stored.passwordHash)));
});

Deno.test("Login: richtig → 200 + Cookie; falsch → 401 mit neutraler Meldung", async () => {
  const { call, signUp } = setup();
  await signUp();
  const ok = await call("POST", "/api/auth/login", { email: "lena@test.de", password: "sehr-geheim-123" });
  assertEquals(ok.status, 200);
  assertExists(ok.headers.get("Set-Cookie"));

  const wrongPw = await call("POST", "/api/auth/login", { email: "lena@test.de", password: "nope" });
  const unknown = await call("POST", "/api/auth/login", { email: "wer@test.de", password: "nope" });
  assertEquals(wrongPw.status, 401);
  assertEquals(unknown.status, 401);
  // Gleiche Meldung → verrät nicht, ob die E-Mail existiert
  assertEquals((await wrongPw.json()).error.message, (await unknown.json()).error.message);
});

Deno.test("Registrierung: doppelte E-Mail → 409, zu kurzes Passwort → 400", async () => {
  const { call, signUp } = setup();
  await signUp();
  const dup = await call("POST", "/api/auth/register", {
    email: "lena@test.de", password: "sehr-geheim-123", displayName: "X",
  });
  assertEquals(dup.status, 409);
  const short = await call("POST", "/api/auth/register", {
    email: "neu@test.de", password: "kurz", displayName: "X",
  });
  assertEquals(short.status, 400);
});

Deno.test("Ohne Session → 401; /me liefert angemeldeten Nutzer; nach Logout wieder 401", async () => {
  const { call, signUp, sessions } = setup();
  assertEquals((await call("GET", "/api/destinations")).status, 401);
  assertEquals((await call("GET", "/api/auth/me")).status, 401);

  const cookie = await signUp();
  const me = await call("GET", "/api/auth/me", undefined, cookie);
  assertEquals((await me.json()).displayName, "Lena");

  // In der Session-Datei steht nur der Hash des Tokens
  const [session] = await sessions.findAll();
  assert(!cookie.includes(session.id));

  assertEquals((await call("POST", "/api/auth/logout", undefined, cookie)).status, 204);
  assertEquals((await call("GET", "/api/destinations", undefined, cookie)).status, 401);
});

Deno.test("Gefälschtes Session-Cookie → 401", async () => {
  const { call } = setup();
  assertEquals((await call("GET", "/api/destinations", undefined, "sid=erfunden")).status, 401);
});

// --- Datentrennung -------------------------------------------------------------

Deno.test("Datentrennung: Nutzer B sieht, ändert und löscht keine Daten von A (404)", async () => {
  const { call, signUp } = setup();
  const lena = await signUp("lena@test.de");
  const max = await signUp("max@test.de");

  const created = await (await call("POST", "/api/destinations", lisbon, lena)).json();
  assertEquals(created.ownerId, undefined); // interne Besitzer-ID wird nicht ausgeliefert

  assertEquals((await (await call("GET", "/api/destinations", undefined, max)).json()).length, 0);
  assertEquals((await call("GET", `/api/destinations/${created.id}`, undefined, max)).status, 404);
  assertEquals((await call("PATCH", `/api/destinations/${created.id}`, { notes: "x" }, max)).status, 404);
  assertEquals((await call("DELETE", `/api/destinations/${created.id}`, undefined, max)).status, 404);

  // Lena sieht ihr Ziel weiterhin unverändert
  const mine = await (await call("GET", `/api/destinations/${created.id}`, undefined, lena)).json();
  assertEquals(mine.notes, "");
  // R3 gilt pro Nutzer: Max darf ebenfalls "Lissabon" anlegen
  assertEquals((await call("POST", "/api/destinations", lisbon, max)).status, 201);
});

Deno.test("ownerId im Body wird abgelehnt (Client kann Besitzer nicht setzen)", async () => {
  const { call, signUp } = setup();
  const lena = await signUp();
  const res = await call("POST", "/api/destinations", { ...lisbon, ownerId: "fremd" }, lena);
  assertEquals(res.status, 400);
});

// --- Reiseziele (CRUD, Validierung, Regeln) -----------------------------------------

Deno.test("POST legt ein Reiseziel an (201 + Location + Defaults)", async () => {
  const { call, signUp } = setup();
  const lena = await signUp();
  const res = await call("POST", "/api/destinations", lisbon, lena);
  assertEquals(res.status, 201);
  const body = await res.json();
  assertExists(body.id);
  assertEquals(res.headers.get("Location"), `/api/destinations/${body.id}`);
  assertEquals(body.notes, "");
  assertEquals(body.rating, null);
  assertEquals(body.createdAt, "2026-11-12T10:00:00.000Z");
});

Deno.test("GET filtert nach Status, Kontinent und Suchbegriff", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  await call("POST", "/api/destinations", lisbon, c);
  await call("POST", "/api/destinations", {
    name: "Hanoi", country: "Vietnam", continent: "ASIA", status: "PLANNED", notes: "Streetfood",
  }, c);
  const get = async (qs: string) => (await call("GET", `/api/destinations${qs}`, undefined, c)).json();
  assertEquals((await get("?continent=ASIA")).length, 1);
  assertEquals((await get("?status=WISHLIST")).length, 1);
  assertEquals((await get("?q=street"))[0].name, "Hanoi");
  assertEquals((await call("GET", "/api/destinations?status=FOO", undefined, c)).status, 400);
});

Deno.test("Validierung: fehlende Pflichtfelder → 400 mit Feldliste", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  const res = await call("POST", "/api/destinations", { name: "", continent: "MARS" }, c);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  const fields = body.error.details.map((d: { field: string }) => d.field);
  for (const f of ["name", "country", "continent", "status"]) assert(fields.includes(f), f);
});

Deno.test("Validierung: kaputtes JSON, unbekannte Felder, http-Bild-URL → 400", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  assertEquals((await call("POST", "/api/destinations", undefined, c)).status, 400);
  assertEquals((await call("POST", "/api/destinations", { ...lisbon, hacker: true }, c)).status, 400);
  assertEquals(
    (await call("POST", "/api/destinations", { ...lisbon, imageUrl: "http://x.de/a.jpg" }, c)).status,
    400,
  );
});

Deno.test("Geschäftsregeln R1 (422), R2 (422), R3 (409)", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  assertEquals((await call("POST", "/api/destinations", { ...lisbon, rating: 4 }, c)).status, 422);
  assertEquals(
    (await call("POST", "/api/destinations", { ...lisbon, status: "VISITED", travelDate: "2027-01-01" }, c))
      .status,
    422,
  );
  await call("POST", "/api/destinations", lisbon, c);
  assertEquals((await call("POST", "/api/destinations", { ...lisbon, name: " lissabon " }, c)).status, 409);
});

Deno.test("PATCH: besucht + bewerten; R4 entfernt Bewertung; leerer Body → 400", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  const d = await (await call("POST", "/api/destinations", lisbon, c)).json();
  const visited = await call("PATCH", `/api/destinations/${d.id}`, { status: "VISITED", rating: 5 }, c);
  assertEquals((await visited.json()).rating, 5);
  const back = await (await call("PATCH", `/api/destinations/${d.id}`, { status: "PLANNED" }, c)).json();
  assertEquals(back.rating, null);
  assertEquals((await call("PATCH", `/api/destinations/${d.id}`, {}, c)).status, 400);
});

Deno.test("PUT ersetzt (createdAt bleibt); DELETE → 204, danach 404", async () => {
  const { call, signUp } = setup();
  const c = await signUp();
  const d = await (await call("POST", "/api/destinations", lisbon, c)).json();
  const put = await (await call("PUT", `/api/destinations/${d.id}`, { ...lisbon, name: "Porto" }, c)).json();
  assertEquals(put.name, "Porto");
  assertEquals(put.createdAt, d.createdAt);
  assertEquals((await call("DELETE", `/api/destinations/${d.id}`, undefined, c)).status, 204);
  assertEquals((await call("GET", `/api/destinations/${d.id}`, undefined, c)).status, 404);
});

Deno.test("Unbekannte Route → 404 im einheitlichen Fehlerformat", async () => {
  const { call } = setup();
  const res = await call("GET", "/api/nope");
  assertEquals(res.status, 404);
  assertEquals((await res.json()).error.code, "NOT_FOUND");
});

Deno.test("JSON-Datei-Speicher: Daten überleben einen Neustart", async () => {
  const dir = await Deno.makeTempDir();
  const file = `${dir}/data.json`;
  await new JsonFileCollection<{ id: string; v: number }>(file).save({ id: "1", v: 42 });
  const reloaded = new JsonFileCollection<{ id: string; v: number }>(file); // "Neustart"
  assertEquals((await reloaded.findById("1"))?.v, 42);
  await Deno.remove(dir, { recursive: true });
});
