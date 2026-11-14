import { ApiError } from "../errors.ts";
import type {
  Destination,
  DestinationDto,
  DestinationInput,
  DestinationPatch,
  DestinationQuery,
} from "../models/destination.ts";
import type { Collection } from "../repository/jsonFileCollection.ts";

/**
 * Anwendungs- und Geschäftslogik für Reiseziele.
 *
 * Datentrennung: JEDE Methode bekommt die userId aus der Session (nie aus dem
 * Request-Body). Fremde Reiseziele verhalten sich wie nicht vorhandene → 404.
 * So verrät die API nicht einmal, dass eine fremde ID existiert.
 *
 * Geschäftsregeln (Invarianten):
 *  R1  Eine Bewertung (1–5) ist nur für besuchte Reiseziele erlaubt.
 *  R2  Ein besuchtes Reiseziel kann kein Reisedatum in der Zukunft haben.
 *  R3  Name + Land sind pro Nutzer eindeutig (ohne Groß-/Kleinschreibung).
 *  R4  Wechselt ein Ziel weg von "besucht", wird die Bewertung entfernt.
 */
export class DestinationService {
  constructor(
    private readonly repo: Collection<Destination>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async ownedBy(userId: string): Promise<Destination[]> {
    return (await this.repo.findAll()).filter((d) => d.ownerId === userId);
  }

  async list(userId: string, query: DestinationQuery = {}): Promise<DestinationDto[]> {
    let items = await this.ownedBy(userId);

    if (query.status) items = items.filter((d) => d.status === query.status);
    if (query.continent) items = items.filter((d) => d.continent === query.continent);
    if (query.q) {
      const needle = query.q.toLocaleLowerCase("de");
      items = items.filter((d) =>
        [d.name, d.country, d.notes].some((f) => f.toLocaleLowerCase("de").includes(needle))
      );
    }

    const sort = query.sort ?? "createdAt";
    items.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "travelDate":
          return (a.travelDate ?? "9999").localeCompare(b.travelDate ?? "9999");
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return items.map(toDto);
  }

  async get(userId: string, id: string): Promise<DestinationDto> {
    return toDto(await this.find(userId, id));
  }

  async create(userId: string, input: DestinationInput): Promise<DestinationDto> {
    await this.assertUnique(userId, input.name, input.country);
    this.applyRules(input);
    const timestamp = this.now().toISOString();
    const saved = await this.repo.save({
      id: crypto.randomUUID(),
      ownerId: userId,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return toDto(saved);
  }

  /** PUT: ersetzt alle fachlichen Felder. */
  async replace(userId: string, id: string, input: DestinationInput): Promise<DestinationDto> {
    const existing = await this.find(userId, id);
    await this.assertUnique(userId, input.name, input.country, id);
    this.applyRules(input);
    return toDto(await this.repo.save({
      ...input,
      id,
      ownerId: userId,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString(),
    }));
  }

  /** PATCH: ändert nur die übergebenen Felder. */
  async update(userId: string, id: string, patch: DestinationPatch): Promise<DestinationDto> {
    const existing = await this.find(userId, id);
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

    // R4
    if (merged.status !== "VISITED" && patch.status && patch.rating === undefined) {
      merged.rating = null;
    }
    if (patch.name !== undefined || patch.country !== undefined) {
      await this.assertUnique(userId, merged.name, merged.country, id);
    }
    this.applyRules(merged);
    return toDto(await this.repo.save({
      ...merged,
      id,
      ownerId: userId,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString(),
    }));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.find(userId, id); // wirft 404, wenn nicht vorhanden oder fremd
    await this.repo.delete(id);
  }

  // --- intern ----------------------------------------------------------------

  private async find(userId: string, id: string): Promise<Destination> {
    const item = await this.repo.findById(id);
    if (!item || item.ownerId !== userId) {
      throw ApiError.notFound(`Reiseziel mit ID "${id}" wurde nicht gefunden`);
    }
    return item;
  }

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

  private async assertUnique(userId: string, name: string, country: string, ignoreId?: string) {
    const key = (s: string) => s.trim().toLocaleLowerCase("de");
    const duplicate = (await this.ownedBy(userId)).find(
      (d) => d.id !== ignoreId && key(d.name) === key(name) && key(d.country) === key(country),
    );
    if (duplicate) {
      throw ApiError.conflict(`"${name}" (${country}) ist bereits in Ihrer Liste`);
    }
  }
}

function toDto({ ownerId: _, ...rest }: Destination): DestinationDto {
  return rest;
}
