import { ref } from "vue";
import { type User, authApi } from "../api/auth";
import { onUnauthorized } from "../api/client";

/**
 * Anmeldezustand der App (modulweit, eine Instanz).
 * `user === null` → Login-Ansicht. Ob jemand angemeldet ist, entscheidet
 * immer der Server (GET /api/auth/me) – das Frontend speichert kein Token.
 */
const user = ref<User | null>(null);
const checked = ref(false);

onUnauthorized(() => {
  user.value = null;
});

export function useAuth() {
  /** Beim Start: gibt es schon eine gültige Session (Cookie)? */
  async function restore() {
    try {
      user.value = await authApi.me();
    } catch {
      user.value = null;
    } finally {
      checked.value = true;
    }
  }

  async function login(email: string, password: string) {
    user.value = await authApi.login(email, password);
  }

  async function register(displayName: string, email: string, password: string) {
    user.value = await authApi.register(displayName, email, password);
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      user.value = null;
    }
  }

  return { user, checked, restore, login, register, logout };
}
