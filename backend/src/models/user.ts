import { z } from "@zod/zod";

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "E-Mail: max. 120 Zeichen")
  .email("Bitte eine gültige E-Mail-Adresse angeben");

export const LoginSchema = z
  .object({
    email: EmailSchema,
    // Beim Login keine Längenregeln verraten – nur "nicht leer"
    password: z.string().min(1, "Passwort ist erforderlich").max(128),
  })
  .strict();

export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: z
      .string()
      .min(10, "Passwort: mindestens 10 Zeichen")
      .max(128, "Passwort: max. 128 Zeichen"),
    displayName: z.string().trim().min(1, "Name ist erforderlich").max(40, "Name: max. 40 Zeichen"),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Format: pbkdf2-sha256$<iterationen>$<salt base64>$<hash base64> – nie das Passwort selbst */
  passwordHash: string;
  createdAt: string;
}

/** Nach außen sichtbare Nutzerdaten (ohne Passwort-Hash). */
export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  /** SHA-256 des Session-Tokens. Das Token selbst steht nur im Cookie des Browsers. */
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export function toPublicUser({ passwordHash: _, ...rest }: User): PublicUser {
  return rest;
}
