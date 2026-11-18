import { ApiError } from "../errors.ts";
import type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationQuery,
} from "../models/destination.ts";
import type { Collection } from "../repository/jsonFileCollection.ts";

/**
 * Anwendungs- und Geschäftslogik für Reiseziele.
 *
 * Geschäftsregeln (Invarianten), die hier – und nur hier – durchgesetzt werden:
 *  R1  Eine Bewertung (1–5) ist nur für besuchte Reiseziele erlaubt.
 *  R2  Ein besuchtes Reiseziel kann kein Reisedatum in der Zukunft haben.
 *  R3  Die Kombination aus Name und Land ist eindeutig (ohne Groß-/Kleinschreibung).
 *  R4  Wechselt ein Ziel von "besucht" auf einen anderen Status, wird die Bewertung entfernt.
 *
 * Die Regeln liegen im Backend, damit jeder Client (Vue, mobile App, curl)
 * dieselben Garantien bekommt.
 */
export class DestinationService {
  constructor(
    private readonly repo: Collection<Destination>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(query: DestinationQuery = {}): Promise<Destination[]> {
    let items = await this.repo.findAll();

    if (query.status) items = items.filter((d) => d.status === query.status);
    if (query.continent) items = items.filter((d) => d.continent === query.continent);
    if (query.q) {
      const needle = query.q.toLocaleLowerCase("de");
      items = items.filter((d) =>
        [d.name, d.country, d.notes].some((f) => f.toLocaleLowerCase("de").includes(needle))
      );
    }

    const sort = query.sort ?? "createdAt";
    return items.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "travelDate":
          // Ziele ohne Datum ans Ende
          return (a.travelDate ?? "9999").localeCompare(b.travelDate ?? "9999");
        default:
          return b.createdAt.localeCompare(a.createdAt); // neueste zuerst
      }
    });
  }

  async get(id: string): Promise<Destination> {
    const item = await this.repo.findById(id);
    if (!item) throw ApiError.notFound(`Reiseziel mit ID "${id}" wurde nicht gefunden`);
    return item;
  }

  async create(input: DestinationInput): Promise<Destination> {
    await this.assertUnique(input.name, input.country);
    this.applyRules(input);
    const timestamp = this.now().toISOString();
    return await this.repo.save({
      id: crypto.randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  /** PUT: ersetzt alle fachlichen Felder. */
  async replace(id: string, input: DestinationInput): Promise<Destination> {
    const existing = await this.get(id);
    await this.assertUnique(input.name, input.country, id);
    this.applyRules(input);
    return await this.repo.save({
      ...input,
      id,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString(),
    });
  }

  /** PATCH: ändert nur die übergebenen Felder. */
  async update(id: string, patch: DestinationPatch): Promise<Destination> {
    const existing = await this.get(id);
    const merged: DestinationInput = {
      name: patch.name ?? existing.name,
      country: patch.country ?? existing.country,
      continent: patch.continent ?? existing.continent,
      notes: patch.notes ?? existing.notes,
      status: patch.status ?? existing.status,
      travelDate: patch.travelDate !== undefined ? patch.travelDate : existing.travelDate,
      rating: patch.rating !== undefined ? patch.rating : existing.rating,
      imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : existing.imageUrl,
    };

    // R4: Statuswechsel weg von "besucht" entfernt implizit die Bewertung,
    // sofern der Client nicht ausdrücklich eine Bewertung mitschickt.
    if (merged.status !== "VISITED" && patch.status && patch.rating === undefined) {
      merged.rating = null;
    }
    if (patch.name !== undefined || patch.country !== undefined) {
      await this.assertUnique(merged.name, merged.country, id);
    }
    this.applyRules(merged);
    return await this.repo.save({
      ...merged,
      id,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString(),
    });
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw ApiError.notFound(`Reiseziel mit ID "${id}" wurde nicht gefunden`);
  }

  // --- Geschäftsregeln -----------------------------------------------------

  private applyRules(input: DestinationInput) {
    // R1
    if (input.rating !== null && input.status !== "VISITED") {
      throw ApiError.businessRule("Nur besuchte Reiseziele können bewertet werden", "rating");
    }
    // R2
    if (input.status === "VISITED" && input.travelDate) {
      const today = this.now().toISOString().slice(0, 10);
      if (input.travelDate > today) {
        throw ApiError.businessRule(
          "Ein besuchtes Reiseziel kann kein Reisedatum in der Zukunft haben",
          "travelDate",
        );
      }
    }
  }

  private async assertUnique(name: string, country: string, ignoreId?: string) {
    const key = (s: string) => s.trim().toLocaleLowerCase("de");
    const duplicate = (await this.repo.findAll()).find(
      (d) => d.id !== ignoreId && key(d.name) === key(name) && key(d.country) === key(country),
    );
    if (duplicate) {
      throw ApiError.conflict(`"${name}" (${country}) ist bereits in Ihrer Liste`);
    }
  }
}
