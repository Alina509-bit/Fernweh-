# Prüfungsgespräch – Vorbereitung (Checkliste A3)

Zu jedem Punkt: **Beschreiben → Begründen → Übertragen („Was wäre, wenn …?“)** und die Stelle im Code.

---

## 1. Weg einer Aktion durch alle Komponenten

**„Was passiert, wenn ich auf Speichern klicke?“** (Sequenzdiagramm: README → „Ablauf“, Folie 4)

1. `DestinationFormModal.vue` → `submit()` baut das Objekt, `emit("save", input)` – die Komponente kennt keine API.
2. `DestinationsPage.vue` → `save()` → `store.create(input)` bzw. `store.replace(id, input)`.
3. `useDestinations.ts` → `destinationsApi.create()` → `api/client.ts` → `fetch(POST /api/destinations, credentials: "include")`.
4. Browser schickt JSON + Cookie `sid`. CORS-Preflight (OPTIONS), weil `Content-Type: application/json` und anderer Port.
5. `app.ts` → Middleware `requireAuth` (`src/auth.ts`): Cookie → `sha256` → Session → User → `c.set("user")`, sonst 401.
6. `routes/destinations.ts` → `parseOrThrow(DestinationInputSchema, body)` → bei Fehler 400.
7. `destinationService.ts` → `create(userId, input)`: R3 (Duplikat → 409), R1/R2 (→ 422), `id`, Zeitstempel, `ownerId`.
8. `jsonFileCollection.ts` → `save()` → in `destinations.json.tmp` schreiben → `rename` (atomar).
9. Antwort `201 Created`, `Location`-Header, JSON ohne `ownerId`.
10. `useDestinations` lädt Liste + Kennzahlen neu (`GET`), Vue rendert reaktiv neue Karte, Toast.

*Was wäre, wenn* der Server 422 liefert? → `client.ts` wirft `ApiRequestError` mit `fieldErrors` → Formular zeigt Fehler am Feld, bleibt offen.

## 2. Warum entkoppelt? Was weiß das Frontend vom Backend?

- Frontend kennt nur: Basis-URL (`VITE_API_URL`), Pfade, JSON-Formate, Statuscodes, Fehlerformat (`types/destination.ts`, `api/*.ts`).
- Weiß **nicht**: Hono, Zod, Dateien, wie Passwörter gespeichert werden, wie Sessions aussehen (Token ist HttpOnly).
- *Mobile App statt Vue?* Gleiche API; App speichert Cookie (oder bekäme Token); Regeln, Validierung, Datentrennung gelten weiter, weil im Backend.
- *Persistenz auf SQLite?* Nur neue Klasse, die `Collection<T>` implementiert; `main.ts` verdrahten. Services, Routes, Frontend unverändert.

## 3. API: Endpunkte, Methoden, Statuscodes, Fehlerformat

Tabelle im README. Merksätze:
- **GET** lesen (sicher, idempotent) · **POST** anlegen → **201 + Location** · **PUT** ganz ersetzen (idempotent) ·
  **PATCH** Teil-Update · **DELETE** → **204** ohne Body.
- **400** Form falsch (Zod) · **401** nicht angemeldet / Login falsch · **404** nicht da oder fremd · **409** Konflikt
  (Duplikat) · **422** fachlich unzulässig (R1/R2) · **500** unerwartet (Details nur im Log).
- Fehlerformat überall gleich: `{ error: { code, message, details: [{ field, message }] } }` – zentral in `app.onError`.
- *Warum 404 statt 403 bei fremden Daten?* 403 würde verraten, dass die ID existiert.
- *Warum PATCH für Status?* Nur ein Feld; kein Überschreiben anderer, parallel geänderter Felder.

## 4. Wo und wie werden Daten gespeichert? Datentrennung?

- `backend/data/users.json`, `sessions.json`, `destinations.json` (`JsonFileCollection`), beim ersten Start aus `seed.json`.
- Lesen einmal in den Cache; Schreiben über eine Promise-Queue nacheinander, atomar mit `tmp` + `rename` (kein halb geschriebenes JSON bei Absturz).
- Datentrennung (`destinationService.ts`): jede Methode bekommt `userId` aus `c.get("user")`; `ownedBy()` filtert, `find()` prüft `ownerId === userId` → sonst 404. `ownerId` im Body → 400 (`strict()`).
- Test: `tests/api_test.ts` → „Datentrennung: Nutzer B sieht, ändert und löscht keine Daten von A“.
- *Schwäche:* keine Transaktionen über mehrere Dateien, alles im Speicher gefiltert → bei vielen Nutzern SQLite mit `WHERE owner_id = ?` und Index.

## 5. Anmeldung, Session, Cookie, Passwörter

- **Registrierung** (`authService.register`): E-Mail normalisiert (trim, lowercase), Passwort ≥ 10 Zeichen, E-Mail eindeutig (409).
- **Passwort-Speicherung** (`services/crypto.ts`): PBKDF2-HMAC-SHA256, 600 000 Iterationen, 16 Byte Salt.
  Format `pbkdf2-sha256$600000$salt$hash`. Warum nicht SHA-256 direkt? Zu schnell → GPU probiert Milliarden pro Sekunde.
  Warum Salt? Gleiche Passwörter → verschiedene Hashes, Rainbow Tables nutzlos. Vergleich in konstanter Zeit.
- **Login** (`authService.login`): Hash prüfen; Fehlermeldung immer gleich; bei unbekannter E-Mail trotzdem hashen (gleiche Antwortzeit).
- **Session:** 32 zufällige Bytes als Token; gespeichert nur `SHA-256(Token)` + `userId` + `expiresAt` (7 Tage).
- **Cookie** (`src/auth.ts`): `Set-Cookie: sid=…; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` (+ `Secure` bei HTTPS).
  - HttpOnly → JS kann es nicht lesen (XSS). In der Demo: `document.cookie` ist leer.
  - SameSite=Lax → fremde Seiten können keine POST/PUT/DELETE mit dem Cookie auslösen (CSRF).
  - Browser schickt es automatisch, weil `fetch` `credentials: "include"` nutzt; CORS erlaubt das nur für `http://localhost:5173` (`credentials: true`).
- **Logout:** Session serverseitig löschen + Cookie löschen → Token sofort wertlos.
- *Warum nicht JWT?* → ADR-003 (XSS im localStorage, kein Widerruf).
- *Was wäre bei gestohlener `sessions.json`?* Nur Hashes – daraus lässt sich kein gültiges Cookie bauen.
- *Was fehlt?* Rate-Limiting, Passwort-Reset, Aufräumen abgelaufener Sessions (passiert nur beim Zugriff).

## 6. Welche Eingaben werden wo validiert – und warum nicht nur im Frontend?

| Ebene | Was | Datei |
| ----- | --- | ----- |
| Frontend | `maxlength`, Input-Typen, Sterne deaktiviert wenn nicht „besucht“, `max`-Datum | `DestinationFormModal.vue` |
| Backend Zod | Pflichtfelder, Längen, Enums, Datumsformat + echtes Datum, nur `https://`-URLs, keine unbekannten Felder, Query-Parameter | `models/*.ts`, `validation.ts` |
| Backend Service | R1–R4, Eindeutigkeit, Besitz | `destinationService.ts`, `authService.ts` |

Frontend-Prüfung ist nur Komfort: Jeder kann mit curl/DevTools direkt Requests schicken. **Verbindlich ist nur das Backend.**
HTTPS-URL-Zwang (Vorlesung): kein Mixed Content, kein `javascript:`/`http:`; kein vollständiger SSRF-Schutz (Server lädt die Bilder aber auch nicht selbst).
XSS: Vue escaped `{{ }}` automatisch; kein `v-html` im Projekt.

## 7. Komponentenstruktur im Frontend und wo der Zustand liegt

```
App.vue                         → Login oder Hauptseite (useAuth)
├─ LoginView.vue                → Formular Anmelden/Registrieren
└─ DestinationsPage.vue         → UI State: welches Modal offen, Formularfehler
   ├─ HeroSection.vue           → Props: Kennzahlen, Name · Events: create, logout
   ├─ InsightsBento.vue         → Props: stats · Event: open
   ├─ FilterBar.vue             → :model-value="filter" (defineModel, ändert filter.q/status/…)
   ├─ DestinationCard.vue ×n    → Props: destination · Events: open, edit, delete
   ├─ DestinationDetailModal    → Event patch (Status, Bewertung)
   ├─ DestinationFormModal      → Event save
   └─ ConfirmDialog, ToastStack, AppFooter
BaseModal.vue, RatingInput.vue  → wiederverwendbar
```

- **Server State:** `useDestinations` (items, all, stats, filter) · **Auth State:** `useAuth` (user) · **UI State:** lokal (`ref`).
- Daten fließen über **Props nach unten, Events nach oben**; nur Composables rufen die API.
- `DestinationsPage :key="user.id"` → bei Nutzerwechsel wird alles neu aufgebaut, keine Daten des Vorgängers im Speicher.
- *Warum eigene Komponente für die Karte?* Wiederholt (v-for), eigene Darstellung/Events, testbar, App bleibt übersichtlich.
- *Warum kein Pinia?* ADR-007 – zwei Composables reichen; bei mehr Seiten/geteiltem Zustand würde ich Pinia nehmen.

## 8. Die drei wichtigsten Entscheidungen (mit Alternative)

1. **Session-Cookie statt JWT** (ADR-003) – Sicherheit (XSS), Widerrufbarkeit.
2. **JSON-Dateien hinter `Collection`-Interface statt SQLite** (ADR-002) – einfach & sichtbar, aber austauschbar.
3. **Regeln + Validierung im Backend (Zod + Service) statt nur im Frontend** (ADR-005) – gilt für jeden Client.

(Weitere: Deno/Hono statt Quarkus, PBKDF2 statt Argon2, PUT vs. PATCH, kein Router/Pinia, Bootstrap über Sass.)

## 9. Jede Zeile in groben Zügen – Stellen, die oft gefragt werden

| Frage | Stelle |
| ----- | ------ |
| Wo wird der Server gestartet, HTTPS? | `backend/main.ts` (`Deno.serve`, `USE_HTTPS`, kein Fallback auf HTTP) |
| Wo ist CORS konfiguriert? Warum `credentials: true`? | `src/app.ts` |
| Wo wird geprüft, ob jemand angemeldet ist? | `src/auth.ts` → `requireAuth` |
| Wo steht eine Geschäftsregel? | `destinationService.ts` → `applyRules()` |
| Wo wird ins Dateisystem geschrieben? | `jsonFileCollection.ts` → `persist()` |
| Wo wird der Fehler am Formularfeld angezeigt? | `DestinationFormModal.vue` (`errors.name` …) ← `ApiRequestError.fieldErrors` |
| Wo wird nach 401 zum Login gewechselt? | `client.ts` `onUnauthorized` → `useAuth.ts` setzt `user = null` → `App.vue` |
| Wie funktioniert die Suche? | `FilterBar` → `filter.q` → `useDestinations` (watch, 250 ms Debounce, veraltete Antworten verwerfen) → `?q=` → Service filtert |

## Mögliche kleine Änderungsaufgaben (max. 3 min) – Lösungsweg

- **Neues Feld „Budget“:** `models/destination.ts` (Zod: `z.number().min(0).nullable().default(null)`, auch im Patch-Schema) →
  `types/destination.ts` → Formularfeld in `DestinationFormModal.vue` (+ `empty()` und `submit()`) → optional Anzeige in der Karte.
- **Neuer Status „Abgesagt“:** `STATUSES` im Backend, `Status`-Typ + `STATUS_LABELS`/`STATUS_ICONS` im Frontend.
- **Notizen max. 500 statt 1000:** Zod in `models/destination.ts` (verbindlich) + `maxlength` im Formular.
- **Neue Regel „Bewertung 1 nur mit Notiz“:** in `applyRules()` → `ApiError.businessRule(…, "notes")` + Test.
- **Neuer Sortier-Modus „Land“:** `DestinationQuerySchema.sort` + `case "country"` im Service + `SORT_LABELS`.
- **Session-Dauer 1 Tag:** `SESSION_DAYS` in `authService.ts` (Cookie-Max-Age nutzt dieselbe Konstante).

## „Was wäre, wenn …?“

- **… zwei Requests gleichzeitig speichern?** Schreib-Queue in `JsonFileCollection` serialisiert; Lesen/Ändern/Schreiben im
  Service ist aber nicht transaktional → mit SQLite-Transaktion lösen.
- **… der Server neu startet?** Daten und Sessions liegen in Dateien → Nutzer bleiben angemeldet.
- **… HTTPS in Produktion?** Reverse Proxy (z. B. nginx/Caddy mit Let’s Encrypt) terminiert TLS, `Secure`-Cookie, HSTS.
- **… Frontend und Backend auf verschiedenen Domains?** Cookie wäre cross-site → `SameSite=None; Secure` + CSRF-Token, oder
  besser: gleiche Domain über Reverse Proxy (`/api` → Backend).
- **… sehr viele Reiseziele?** Pagination (`?limit=&offset=`), Filtern in der DB.
- **… XSS-Lücke?** Angreifer kann im Namen des Nutzers Requests senden, aber das Token nicht stehlen (HttpOnly).
