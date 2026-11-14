# Vortrag & Live-Demo – Skript (8:00 min)

## Vorbereitung am Prüfungstag (vor dem Block)

- [ ] Benachrichtigungen aus (Windows: Fokus-Assistent), Akku geladen, Beamer/HDMI getestet
- [ ] Demo-Daten frisch: Backend stoppen → `backend/data/users.json`, `sessions.json`, `destinations.json` löschen → neu starten
- [ ] Terminal 1: `cd backend && deno task dev` · Terminal 2: `cd frontend && npm run dev`
- [ ] Browser: Tab 1 `http://localhost:5173` **als Lena angemeldet** (`lena@fernweh.test` / `Fernweh-Demo-2026`),
      DevTools offen → Netzwerk-Tab → Filter **Fetch/XHR**, „Preserve log“ an
- [ ] Browser: **privates Fenster** mit `http://localhost:5173`, dort Max angemeldet (`max@fernweh.test`) → eigene Cookies
- [ ] Browser-Zoom 125 %, Editor-Schrift groß, VS Code mit Repository offen (README, `destinationService.ts`)
- [ ] Folien-PDF offen: `docs/vortrag/Fernweh-Folien-Alina-Pabst.pdf`
- [ ] Fallback-Screenshots im Ordner `docs/vortrag/fallback/` (siehe unten)

## Ablauf

| Zeit      | Folie / Aktion | Was ich sage (Stichworte) |
| --------- | -------------- | ------------------------- |
| 0:00–1:00 | **Folie 1** | Problem: Reiseideen verstreut. Zielgruppe: Reisebegeisterte. Kernfunktion: eigene Reiseziele anlegen, ansehen, ändern, löschen, bewerten – jede Person sieht nur ihre Daten. |
| 1:00–2:00 | **Folie 2** | Drei Teile, klar getrennt: Vue-Frontend, Hono-REST-API, JSON-Dateien. Frontend kennt nur URLs, JSON und Statuscodes. Im Backend: Middleware → Route (Zod) → Service (Regeln, Besitzer) → Repository. Gleiche API für eine mobile App. |
| 2:00–3:00 | **Folie 3** | „Ich habe Session-Cookie statt JWT im localStorage gewählt, weil …“ (XSS, Widerruf). „JSON-Dateien statt SQLite, weil … – Konsequenz: skaliert nicht, aber austauschbar über das Interface.“ |
| 3:00–6:30 | **Folie 4 → Browser** | Live-Demo (unten) |
| 6:30–8:00 | **Folie 5** | Abweichungen: Konten + Datentrennung, `imageUrl`. Anders: SQLite, API zuerst als OpenAPI, Frontend-Tests. Größte Schwäche: kein Rate-Limiting beim Login. |

## Live-Demo (3:30 min)

1. **Anlegen → wiedersehen** (≈ 1:15)
   - „Neues Ziel“ → *Lissabon*, *Portugal*, *Europa*, Status *Geplant*, Datum *2027-05-10*,
     Notiz „Pastéis de Belém, Tram 28, Fado in der Alfama“, Bild-URL (optional, vorher kopieren):
     `https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=900&q=70`
   - Speichern → Toast, Karte erscheint, Kennzahl „Geplant“ steigt.
   - **F5 drücken** → Lissabon ist noch da ⇒ „liegt jetzt in `backend/data/destinations.json`“
     (optional die Datei im Editor kurz zeigen, `ownerId` = Lenas ID).

2. **Request im Netzwerk-Tab erklären** (≈ 0:45)
   - Request `destinations` (POST) anklicken:
     „Methode **POST**, URL **/api/destinations**, Status **201 Created**, Header **Location** mit der neuen ID,
     Request-Header **Cookie: sid=…** – das Session-Cookie, Response = JSON des neuen Reiseziels, ohne `ownerId`.“
   - Danach folgt automatisch ein **GET /api/destinations** (Liste neu laden).

3. **Fehlerfall** (≈ 0:45)
   - Lissabon öffnen → Bearbeiten → Status **Besucht**, Datum bleibt 2027 → Speichern.
   - Rot am Datumsfeld: „Ein besuchtes Reiseziel kann kein Reisedatum in der Zukunft haben“.
   - Netzwerk-Tab: **PUT → 422**, JSON `{ error: { code: "BUSINESS_RULE_VIOLATION", details: [{ field: "travelDate" … }] } }`.
     „Die Regel liegt im Backend – auch curl oder eine mobile App können sie nicht umgehen.“
   - Abbrechen.

4. **Datentrennung** (≈ 0:30)
   - Ins private Fenster wechseln: „Max ist angemeldet und sieht nur Reykjavík und Rio – Lenas Lissabon nicht.
     Fremde IDs liefern 404, die userId kommt nur aus der Session.“

(Wenn Zeit fehlt: Schritt 4 nur in einem Satz erwähnen. Alternativ zum Fehlerfall: abmelden → Seite neu laden → Login; oder im Netzwerk-Tab ein `GET /api/auth/me` mit **401** zeigen.)

## Fallback-Screenshots

Vorab aufnehmen (Win + Shift + S) und in `docs/vortrag/fallback/` ablegen:

1. Startseite als Lena (Hero + Überblick)
2. Formular mit Lissabon ausgefüllt
3. Neue Karte + Toast
4. Netzwerk-Tab: POST 201 mit Headers und Response
5. Formular mit 422-Fehler am Datum + Netzwerk-Tab
6. Max’ Ansicht mit nur 2 Zielen
7. Login-Seite mit „E-Mail oder Passwort ist falsch“ (401)

## Notfall

- **Backend startet nicht** (Port belegt): `netstat -ano | findstr :8000` → Prozess beenden, oder `PORT=8001` in `.env` + `VITE_API_URL` anpassen.
- **„Server nicht erreichbar“** im Frontend → Backend-Terminal prüfen.
- **Login klappt nicht** → Demo-Daten zurücksetzen (siehe oben) und neu starten.
- **Demo hängt** → ruhig auf Fallback-Screenshots wechseln und erklären, was passiert wäre.
