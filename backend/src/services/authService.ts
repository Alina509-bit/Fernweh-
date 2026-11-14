import { ApiError } from "../errors.ts";
import {
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type Session,
  toPublicUser,
  type User,
} from "../models/user.ts";
import type { Collection } from "../repository/jsonFileCollection.ts";
import {
  DEFAULT_ITERATIONS,
  hashPassword,
  newSessionToken,
  sha256Hex,
  verifyPassword,
} from "./crypto.ts";

export const SESSION_DAYS = 7;

/**
 * Anmeldung und Sessions (serverseitige Sessions, Token im HttpOnly-Cookie).
 *
 * Ablauf Login:
 *  1. Nutzer per E-Mail suchen, Passwort gegen den gespeicherten Hash prüfen
 *  2. zufälliges Token erzeugen, SHA-256(Token) als Session speichern
 *  3. das Token selbst geht nur einmal als Cookie an den Browser
 * Jeder weitere Request schickt das Cookie mit → authenticate() findet den Nutzer.
 */
export class AuthService {
  /** Dummy-Hash: auch bei unbekannter E-Mail wird gehasht → gleiche Antwortzeit. */
  private dummyHash: Promise<string>;

  constructor(
    private readonly users: Collection<User>,
    private readonly sessions: Collection<Session>,
    private readonly iterations = DEFAULT_ITERATIONS,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.dummyHash = hashPassword("dummy-password", iterations);
  }

  async createUser(input: RegisterInput): Promise<PublicUser> {
    const all = await this.users.findAll();
    if (all.some((u) => u.email === input.email)) {
      throw ApiError.conflict("Für diese E-Mail-Adresse gibt es bereits ein Konto");
    }
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password, this.iterations),
      createdAt: this.now().toISOString(),
    };
    await this.users.save(user);
    return toPublicUser(user);
  }

  async register(input: RegisterInput) {
    const user = await this.createUser(input);
    return { user, token: await this.startSession(user.id) };
  }

  async login(input: LoginInput) {
    const user = (await this.users.findAll()).find((u) => u.email === input.email);
    const ok = await verifyPassword(input.password, user?.passwordHash ?? await this.dummyHash);
    if (!user || !ok) {
      // Bewusst unspezifisch: nicht verraten, ob die E-Mail existiert
      throw new ApiError(401, "INVALID_CREDENTIALS", "E-Mail oder Passwort ist falsch");
    }
    return { user: toPublicUser(user), token: await this.startSession(user.id) };
  }

  async logout(token: string) {
    await this.sessions.delete(await sha256Hex(token));
  }

  /** Liefert den Nutzer zum Token – oder null, wenn Session fehlt/abgelaufen. */
  async authenticate(token: string): Promise<PublicUser | null> {
    const id = await sha256Hex(token);
    const session = await this.sessions.findById(id);
    if (!session) return null;
    if (session.expiresAt <= this.now().toISOString()) {
      await this.sessions.delete(id);
      return null;
    }
    const user = await this.users.findById(session.userId);
    return user ? toPublicUser(user) : null;
  }

  private async startSession(userId: string): Promise<string> {
    const token = newSessionToken();
    const created = this.now();
    await this.sessions.save({
      id: await sha256Hex(token),
      userId,
      createdAt: created.toISOString(),
      expiresAt: new Date(created.getTime() + SESSION_DAYS * 86_400_000).toISOString(),
    });
    return token;
  }
}
