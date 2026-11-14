import type { Context } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "@hono/hono/cookie";
import { createMiddleware } from "@hono/hono/factory";
import { ApiError } from "./errors.ts";
import type { PublicUser } from "./models/user.ts";
import { type AuthService, SESSION_DAYS } from "./services/authService.ts";

/** Typ der Hono-Kontextvariablen: nach requireAuth steht der Nutzer in c.get("user"). */
export type AppEnv = { Variables: { user: PublicUser } };

export const SESSION_COOKIE = "sid";

/**
 * Session-Cookie:
 *  - HttpOnly  → JavaScript im Browser kann das Token nicht lesen (Schutz bei XSS)
 *  - SameSite=Lax → wird bei Requests von fremden Websites nicht mitgeschickt (CSRF-Schutz)
 *  - Secure    → nur über HTTPS (wenn HTTPS aktiv)
 *  - Max-Age   → 7 Tage, passend zur serverseitigen Ablaufzeit
 */
export function setSessionCookie(c: Context, token: string, secure: boolean) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

/** Middleware: lässt nur Requests mit gültiger Session durch, sonst 401. */
export function requireAuth(auth: AuthService) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? await auth.authenticate(token) : null;
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Bitte melden Sie sich an");
    }
    c.set("user", user);
    await next();
  });
}
