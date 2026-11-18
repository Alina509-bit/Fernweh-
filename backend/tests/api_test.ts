import { assert, assertEquals, assertExists } from "@std/assert";
import { createApp } from "../src/app.ts";
import type { Destination } from "../src/models/destination.ts";
import { JsonFileCollection, MemoryCollection } from "../src/repository/jsonFileCollection.ts";

const FIXED_NOW = () => new Date("2026-11-12T10:00:00Z");

/** Baut die echte Hono-App mit In-Memory-Speicher und liefert einen kleinen HTTP-Client. */
function setup() {
  const destinations = new MemoryCollection<Destination>();
  const app = createApp({ destinations, log: false, now: FIXED_NOW });
  const call = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  return { call, destinations };
}

const lisbon = { name: "Lissabon", country: "Portugal", continent: "EUROPE", status: "WISHLIST" };

Deno.test("POST legt ein Reiseziel an (201 + Location + Defaults)", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/destinations", lisbon);
  assertEquals(res.status, 201);
  const body = await res.json();
  assertExists(body.id);
  assertEquals(res.headers.get("Location"), `/api/destinations/${body.id}`);
  assertEquals(body.notes, "");
  assertEquals(body.rating, null);
  assertEquals(body.travelDate, null);
  assertEquals(body.createdAt, "2026-11-12T10:00:00.000Z");
});

Deno.test("GET liefert Liste und einzelnes Reiseziel", async () => {
  const { call } = setup();
  const created = await (await call("POST", "/api/destinations", lisbon)).json();
  assertEquals((await (await call("GET", "/api/destinations")).json()).length, 1);
  const one = await call("GET", `/api/destinations/${created.id}`);
  assertEquals(one.status, 200);
  assertEquals((await one.json()).name, "Lissabon");
});

Deno.test("GET filtert nach Status, Kontinent, Suchbegriff und sortiert nach Reisedatum", async () => {
  const { call } = setup();
  await call("POST", "/api/destinations", { ...lisbon, status: "PLANNED", travelDate: "2027-05-10" });
  await call("POST", "/api/destinations", {
    name: "Hanoi", country: "Vietnam", continent: "ASIA", status: "PLANNED",
    travelDate: "2027-02-01", notes: "Streetfood",
  });
  const get = async (qs: string) => (await call("GET", `/api/destinations${qs}`)).json();
  assertEquals((await get("?continent=ASIA")).length, 1);
  assertEquals((await get("?status=PLANNED")).length, 2);
  assertEquals((await get("?q=street"))[0].name, "Hanoi");
  assertEquals((await get("?sort=travelDate")).map((d: Destination) => d.name), ["Hanoi", "Lissabon"]);
  assertEquals((await call("GET", "/api/destinations?status=FOO")).status, 400);
});

Deno.test("Validierung: fehlende Pflichtfelder → 400 mit Feldliste", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/destinations", { name: "", continent: "MARS" });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  const fields = body.error.details.map((d: { field: string }) => d.field);
  for (const f of ["name", "country", "continent", "status"]) assert(fields.includes(f), f);
});

Deno.test("Validierung: kaputtes JSON, unbekannte Felder, ungültiges Datum → 400", async () => {
  const { call } = setup();
  assertEquals((await call("POST", "/api/destinations", undefined)).status, 400);
  assertEquals((await call("POST", "/api/destinations", { ...lisbon, hacker: true })).status, 400);
  assertEquals((await call("POST", "/api/destinations", { ...lisbon, travelDate: "2027-02-30" })).status, 400);
});

Deno.test("Validierung: Bild-URL muss HTTPS sein", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/destinations", { ...lisbon, imageUrl: "http://x.de/a.jpg" });
  assertEquals(res.status, 400);
});

Deno.test("R1: Bewertung nur für besuchte Ziele → 422", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/destinations", { ...lisbon, rating: 4 });
  assertEquals(res.status, 422);
  assertEquals((await res.json()).error.code, "BUSINESS_RULE_VIOLATION");
});

Deno.test("R2: besucht + Datum in der Zukunft → 422", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/destinations", {
    ...lisbon, status: "VISITED", travelDate: "2027-01-01",
  });
  assertEquals(res.status, 422);
});

Deno.test("R3: Name + Land doppelt → 409", async () => {
  const { call } = setup();
  await call("POST", "/api/destinations", lisbon);
  const res = await call("POST", "/api/destinations", { ...lisbon, name: "  lissabon " });
  assertEquals(res.status, 409);
});

Deno.test("PATCH: als besucht markieren und bewerten; R4 entfernt Bewertung", async () => {
  const { call } = setup();
  const d = await (await call("POST", "/api/destinations", lisbon)).json();
  const visited = await call("PATCH", `/api/destinations/${d.id}`, { status: "VISITED", rating: 5 });
  assertEquals(visited.status, 200);
  assertEquals((await visited.json()).rating, 5);
  const back = await (await call("PATCH", `/api/destinations/${d.id}`, { status: "PLANNED" })).json();
  assertEquals(back.rating, null);
});

Deno.test("PATCH mit leerem Body → 400", async () => {
  const { call } = setup();
  const d = await (await call("POST", "/api/destinations", lisbon)).json();
  assertEquals((await call("PATCH", `/api/destinations/${d.id}`, {})).status, 400);
});

Deno.test("PUT ersetzt, behält createdAt", async () => {
  const { call } = setup();
  const d = await (await call("POST", "/api/destinations", lisbon)).json();
  const res = await call("PUT", `/api/destinations/${d.id}`, { ...lisbon, name: "Porto", notes: "Francesinha!" });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, "Porto");
  assertEquals(body.createdAt, d.createdAt);
});

Deno.test("DELETE → 204, danach 404", async () => {
  const { call } = setup();
  const d = await (await call("POST", "/api/destinations", lisbon)).json();
  assertEquals((await call("DELETE", `/api/destinations/${d.id}`)).status, 204);
  assertEquals((await call("GET", `/api/destinations/${d.id}`)).status, 404);
  assertEquals((await call("DELETE", `/api/destinations/${d.id}`)).status, 404);
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
