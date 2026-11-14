import type { Continent, Destination } from "../types/destination";

/** Fallback-Farbverläufe, wenn ein Reiseziel kein Bild hat (nach Kontinent). */
const GRADIENTS: Record<Continent, string> = {
  AFRICA: "linear-gradient(150deg, #bc4749 0%, #ffb35c 100%)",
  ANTARCTICA: "linear-gradient(150deg, #9fb4ff 0%, #e9ebff 100%)",
  ASIA: "linear-gradient(150deg, #586eff 0%, #c8ff32 120%)",
  EUROPE: "linear-gradient(150deg, #2b2f8f 0%, #586eff 100%)",
  NORTH_AMERICA: "linear-gradient(150deg, #1f6f5c 0%, #c8ff32 130%)",
  OCEANIA: "linear-gradient(150deg, #0e8fb3 0%, #ffffa0 130%)",
  SOUTH_AMERICA: "linear-gradient(150deg, #bc4749 0%, #586eff 120%)",
};

export function coverStyle(d: Pick<Destination, "imageUrl" | "continent">, broken = false) {
  if (d.imageUrl && !broken) {
    return { backgroundImage: `url("${d.imageUrl.replace(/"/g, "%22")}")` };
  }
  return { backgroundImage: GRADIENTS[d.continent] };
}
