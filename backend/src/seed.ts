import type { Destination, DestinationInput } from "./models/destination.ts";
import type { User } from "./models/user.ts";
import type { Collection } from "./repository/jsonFileCollection.ts";
import type { AuthService } from "./services/authService.ts";

interface SeedFile {
  users: { email: string; displayName: string; password: string }[];
  destinations: (DestinationInput & { owner: string; createdAt: string; updatedAt: string })[];
}

/**
 * Legt beim allerersten Start Demo-Nutzer und Beispiel-Reiseziele an.
 * Passwörter laufen dabei durch denselben Hash wie bei der Registrierung.
 */
export async function seedIfEmpty(
  seedPath: string | URL,
  auth: AuthService,
  users: Collection<User>,
  destinations: Collection<Destination>,
) {
  if ((await users.findAll()).length > 0) return false;

  const seed: SeedFile = JSON.parse(await Deno.readTextFile(seedPath));
  const ids = new Map<string, string>();
  for (const u of seed.users) {
    const created = await auth.createUser(u);
    ids.set(u.email, created.id);
  }
  for (const { owner, ...d } of seed.destinations) {
    const ownerId = ids.get(owner);
    if (!ownerId) continue;
    await destinations.save({ ...d, id: crypto.randomUUID(), ownerId });
  }
  return true;
}
