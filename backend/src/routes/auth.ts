import { Hono } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";
import { type AppEnv, clearSessionCookie, requireAuth, SESSION_COOKIE, setSessionCookie } from "../auth.ts";
import { LoginSchema, RegisterSchema } from "../models/user.ts";
import type { AuthService } from "../services/authService.ts";
import { parseOrThrow, readJson } from "../validation.ts";

/**
 * /api/auth – Registrierung, Anmeldung, Abmeldung, "Wer bin ich?"
 * Das Session-Token steht nur im HttpOnly-Cookie, nie im JSON-Body.
 */
export function authRoutes(auth: AuthService, secureCookies: boolean) {
  const router = new Hono<AppEnv>();

  router.post("/register", async (c) => {
    const input = parseOrThrow(RegisterSchema, await readJson(c.req.raw));
    const { user, token } = await auth.register(input);
    setSessionCookie(c, token, secureCookies);
    return c.json(user, 201);
  });

  router.post("/login", async (c) => {
    const input = parseOrThrow(LoginSchema, await readJson(c.req.raw));
    const { user, token } = await auth.login(input);
    setSessionCookie(c, token, secureCookies);
    return c.json(user);
  });

  router.post("/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await auth.logout(token);
    clearSessionCookie(c);
    return c.body(null, 204);
  });

  router.get("/me", requireAuth(auth), (c) => c.json(c.get("user")));

  return router;
}
