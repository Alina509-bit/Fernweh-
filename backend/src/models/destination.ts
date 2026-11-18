import { z } from "@zod/zod";

/**
 * Fachliches Modell: ein Reiseziel.
 *
 * Die Zod-Schemas sind die einzige Quelle der Wahrheit für die Validierung.
 * Die TypeScript-Typen werden daraus abgeleitet, damit Typ und Laufzeitprüfung
 * nicht auseinanderlaufen können.
 */

export const CONTINENTS = [
  "AFRICA",
  "ANTARCTICA",
  "ASIA",
  "EUROPE",
  "NORTH_AMERICA",
  "OCEANIA",
  "SOUTH_AMERICA",
] as const;

export const STATUSES = ["WISHLIST", "PLANNED", "VISITED"] as const;

export const ContinentSchema = z.enum(CONTINENTS);
export const StatusSchema = z.enum(STATUSES);

export type Continent = z.infer<typeof ContinentSchema>;
export type Status = z.infer<typeof StatusSchema>;

/** ISO-Datum im Format YYYY-MM-DD, das auch ein echtes Kalenderdatum ist. */
const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format JJJJ-MM-TT angegeben werden")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Ungültiges Kalenderdatum");

/** Bild-URLs werden nur über HTTPS akzeptiert (vgl. Vorlesung "Von http zu https"). */
const HttpsUrlSchema = z
  .string()
  .trim()
  .max(500, "URL darf höchstens 500 Zeichen lang sein")
  .url("Ungültige URL")
  .refine((url) => url.startsWith("https://"), {
    message: "Aus Sicherheitsgründen sind nur HTTPS-URLs erlaubt",
  });

/** Felder, die ein Client senden darf (ohne serverseitig verwaltete Felder). */
export const DestinationFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(80, "Name: max. 80 Zeichen"),
  country: z.string().trim().min(1, "Land ist erforderlich").max(60, "Land: max. 60 Zeichen"),
  continent: ContinentSchema,
  notes: z.string().trim().max(1000, "Notizen: max. 1000 Zeichen").default(""),
  status: StatusSchema,
  travelDate: IsoDateSchema.nullable().default(null),
  rating: z.number().int("Bewertung muss ganzzahlig sein").min(1).max(5).nullable().default(null),
  imageUrl: HttpsUrlSchema.nullable().default(null),
});

/** POST und PUT: vollständige Repräsentation. */
export const DestinationInputSchema = DestinationFieldsSchema.strict();

/** PATCH: jedes Feld optional, aber mindestens eines muss vorhanden sein. */
export const DestinationPatchSchema = z
  .object({
    name: DestinationFieldsSchema.shape.name,
    country: DestinationFieldsSchema.shape.country,
    continent: ContinentSchema,
    notes: z.string().trim().max(1000, "Notizen: max. 1000 Zeichen"),
    status: StatusSchema,
    travelDate: IsoDateSchema.nullable(),
    rating: z.number().int().min(1).max(5).nullable(),
    imageUrl: HttpsUrlSchema.nullable(),
  })
  .partial()
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, "Mindestens ein Feld muss geändert werden");

/** Query-Parameter für GET /api/destinations. */
export const DestinationQuerySchema = z.object({
  status: StatusSchema.optional(),
  continent: ContinentSchema.optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["name", "travelDate", "rating", "createdAt"]).optional(),
});

export type DestinationInput = z.infer<typeof DestinationInputSchema>;
export type DestinationPatch = z.infer<typeof DestinationPatchSchema>;
export type DestinationQuery = z.infer<typeof DestinationQuerySchema>;

/** Gespeicherte Form: die Eingabe plus serverseitig verwaltete Felder. */
export interface Destination extends DestinationInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}
