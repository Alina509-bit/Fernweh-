import { decodeBase64, encodeBase64 } from "@std/encoding/base64";
import { encodeHex } from "@std/encoding/hex";

/**
 * Passwort-Hashing mit PBKDF2-HMAC-SHA256 aus der Web Crypto API (in Deno eingebaut,
 * keine Fremdbibliothek nötig).
 *
 * - Salt: 16 zufällige Bytes pro Passwort → gleiche Passwörter ergeben verschiedene Hashes
 *   (schützt gegen Rainbow Tables).
 * - Viele Iterationen (OWASP-Empfehlung 600 000) → jeder Rateversuch ist teuer
 *   (schützt bei einem Datenleck gegen Brute Force).
 * - Gespeichert wird nur "Verfahren$Iterationen$Salt$Hash", nie das Passwort.
 */
export const DEFAULT_ITERATIONS = 600_000;

async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${encodeBase64(salt)}$${encodeBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, iter, saltB64, hashB64] = stored.split("$");
  if (algo !== "pbkdf2-sha256" || !iter || !saltB64 || !hashB64) return false;
  const expected = decodeBase64(hashB64);
  const actual = await pbkdf2(password, decodeBase64(saltB64), Number(iter));
  return timingSafeEqual(actual, expected);
}

/** Vergleich in konstanter Zeit – die Antwortzeit verrät nicht, ab welchem Byte es abweicht. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Zufälliges Session-Token (32 Byte = 256 Bit), nicht erratbar. */
export function newSessionToken(): string {
  return encodeBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Im Speicher liegt nur der SHA-256 des Tokens – ein Leck der Datei verrät keine gültigen Sessions. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeHex(new Uint8Array(digest));
}
