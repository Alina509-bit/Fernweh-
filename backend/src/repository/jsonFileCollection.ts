import { dirname } from "@std/path";

/**
 * Minimales Speicher-Interface für eine Sammlung von Objekten mit `id`.
 * Service-Schicht und Tests kennen nur dieses Interface – die konkrete
 * Speicherung (JSON-Datei, In-Memory, später z. B. SQLite) ist austauschbar.
 */
export interface Collection<T extends { id: string }> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | undefined>;
  save(item: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Persistenz mit Deno-Bordmitteln: eine JSON-Datei pro Sammlung.
 * - Lesen: einmal beim ersten Zugriff, danach aus dem Speicher (Cache)
 * - Schreiben: atomar (temporäre Datei + rename) und nacheinander (Queue),
 *   damit parallele Requests sich nicht gegenseitig überschreiben.
 */
export class JsonFileCollection<T extends { id: string }> implements Collection<T> {
  private cache: T[] | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async load(): Promise<T[]> {
    if (this.cache) return this.cache;
    try {
      const parsed = JSON.parse(await Deno.readTextFile(this.filePath));
      this.cache = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
      this.cache = [];
    }
    return this.cache;
  }

  private persist(items: T[]): Promise<void> {
    const run = async () => {
      await Deno.mkdir(dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      await Deno.writeTextFile(tmp, JSON.stringify(items, null, 2) + "\n");
      await Deno.rename(tmp, this.filePath);
    };
    this.writeQueue = this.writeQueue.then(run, run);
    return this.writeQueue;
  }

  async findAll(): Promise<T[]> {
    return structuredClone(await this.load());
  }

  async findById(id: string): Promise<T | undefined> {
    const item = (await this.load()).find((x) => x.id === id);
    return item ? structuredClone(item) : undefined;
  }

  async save(item: T): Promise<T> {
    const items = await this.load();
    const index = items.findIndex((x) => x.id === item.id);
    if (index >= 0) items[index] = structuredClone(item);
    else items.push(structuredClone(item));
    await this.persist(items);
    return structuredClone(item);
  }

  async delete(id: string): Promise<boolean> {
    const items = await this.load();
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) return false;
    items.splice(index, 1);
    await this.persist(items);
    return true;
  }
}

/** Für Tests: dieselbe Schnittstelle, nur im Arbeitsspeicher. */
export class MemoryCollection<T extends { id: string }> implements Collection<T> {
  private items: T[] = [];
  findAll() {
    return Promise.resolve(structuredClone(this.items));
  }
  findById(id: string) {
    return Promise.resolve(structuredClone(this.items.find((x) => x.id === id)));
  }
  save(item: T) {
    const i = this.items.findIndex((x) => x.id === item.id);
    if (i >= 0) this.items[i] = structuredClone(item);
    else this.items.push(structuredClone(item));
    return Promise.resolve(structuredClone(item));
  }
  delete(id: string) {
    const before = this.items.length;
    this.items = this.items.filter((x) => x.id !== id);
    return Promise.resolve(this.items.length < before);
  }
}
