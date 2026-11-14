/**
 * Datentypen des REST-Vertrags (siehe README → API).
 * Das Frontend kennt nur die Schnittstelle, nicht die Implementierung im Backend.
 */

export type Continent =
  | "AFRICA"
  | "ANTARCTICA"
  | "ASIA"
  | "EUROPE"
  | "NORTH_AMERICA"
  | "OCEANIA"
  | "SOUTH_AMERICA";

export type Status = "WISHLIST" | "PLANNED" | "VISITED";

export interface DestinationInput {
  name: string;
  country: string;
  continent: Continent;
  notes: string;
  status: Status;
  travelDate: string | null;
  rating: number | null;
  imageUrl: string | null;
}

export interface Destination extends DestinationInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type SortKey = "createdAt" | "name" | "travelDate" | "rating";

export interface DestinationFilter {
  status: Status | "";
  continent: Continent | "";
  q: string;
  sort: SortKey;
}

export const CONTINENT_LABELS: Record<Continent, string> = {
  AFRICA: "Afrika",
  ANTARCTICA: "Antarktis",
  ASIA: "Asien",
  EUROPE: "Europa",
  NORTH_AMERICA: "Nordamerika",
  OCEANIA: "Ozeanien",
  SOUTH_AMERICA: "Südamerika",
};

export const STATUS_LABELS: Record<Status, string> = {
  WISHLIST: "Wunschziel",
  PLANNED: "Geplant",
  VISITED: "Besucht",
};

export const STATUS_ICONS: Record<Status, string> = {
  WISHLIST: "bi-stars",
  PLANNED: "bi-calendar2-check",
  VISITED: "bi-geo-alt-fill",
};

export const SORT_LABELS: Record<SortKey, string> = {
  createdAt: "Neueste zuerst",
  name: "Name A–Z",
  travelDate: "Reisedatum",
  rating: "Beste Bewertung",
};
