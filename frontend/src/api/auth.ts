import { request } from "./client";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

/**
 * REST-Aufrufe für /api/auth.
 * Das Session-Token sieht das Frontend nie: der Server setzt es als HttpOnly-Cookie,
 * der Browser schickt es automatisch mit.
 */
export const authApi = {
  me: () => request<User>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (displayName: string, email: string, password: string) =>
    request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ displayName, email, password }),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
};
