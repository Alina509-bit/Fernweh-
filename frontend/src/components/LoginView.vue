<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import heroImage from "../assets/hero.webp";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../composables/useAuth";

const { login, register } = useAuth();

const mode = ref<"login" | "register">("login");
const form = reactive({ displayName: "", email: "", password: "" });
const busy = ref(false);
const error = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});

const isRegister = computed(() => mode.value === "register");

function switchMode(m: "login" | "register") {
  mode.value = m;
  error.value = null;
  fieldErrors.value = {};
}

async function submit() {
  busy.value = true;
  error.value = null;
  fieldErrors.value = {};
  try {
    if (isRegister.value) await register(form.displayName, form.email, form.password);
    else await login(form.email, form.password);
  } catch (err) {
    error.value = (err as Error).message;
    if (err instanceof ApiRequestError) fieldErrors.value = err.fieldErrors;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <section class="visual" :style="{ backgroundImage: `url(${heroImage})` }" aria-hidden="true">
      <p class="brand font-display">Fernweh</p>
      <svg class="swoosh" viewBox="0 0 600 300" preserveAspectRatio="none">
        <path d="M-10 220 C 140 60, 300 300, 420 150 S 560 40, 620 90" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
      </svg>
      <p class="claim font-display">Sammle Orte,<br /><span>die dich rufen.</span></p>
    </section>

    <section class="panel">
      <div class="card-login">
        <a class="logo font-display" href="#">fernweh<span class="logo-dot" /></a>

        <h1 class="title font-display">{{ isRegister ? "Konto erstellen" : "Willkommen zurück" }}</h1>
        <p class="text-secondary mb-4">
          {{ isRegister ? "Deine Reiseziele – nur für dich sichtbar." : "Melde dich an, um deine Reiseziele zu sehen." }}
        </p>

        <div class="tabs mb-4" role="tablist">
          <button type="button" role="tab" class="tab" :class="{ active: !isRegister }" :aria-selected="!isRegister" @click="switchMode('login')">
            Anmelden
          </button>
          <button type="button" role="tab" class="tab" :class="{ active: isRegister }" :aria-selected="isRegister" @click="switchMode('register')">
            Registrieren
          </button>
        </div>

        <div v-if="error" class="alert alert-danger rounded-4 py-2 d-flex gap-2" role="alert">
          <i class="bi bi-exclamation-octagon" /><span>{{ error }}</span>
        </div>

        <form novalidate @submit.prevent="submit">
          <div v-if="isRegister" class="mb-3">
            <label for="l-name" class="form-label">Name</label>
            <input id="l-name" v-model="form.displayName" class="form-control" :class="{ 'is-invalid': fieldErrors.displayName }" autocomplete="name" />
            <div class="invalid-feedback">{{ fieldErrors.displayName }}</div>
          </div>
          <div class="mb-3">
            <label for="l-email" class="form-label">E-Mail</label>
            <input id="l-email" v-model="form.email" type="email" class="form-control" :class="{ 'is-invalid': fieldErrors.email }" autocomplete="email" />
            <div class="invalid-feedback">{{ fieldErrors.email }}</div>
          </div>
          <div class="mb-4">
            <label for="l-pw" class="form-label">Passwort</label>
            <input
              id="l-pw"
              v-model="form.password"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': fieldErrors.password }"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
            />
            <div class="invalid-feedback">{{ fieldErrors.password }}</div>
            <small v-if="isRegister" class="text-secondary">Mindestens 10 Zeichen.</small>
          </div>
          <button type="submit" class="btn btn-lime rounded-pill btn-lg w-100" :disabled="busy">
            <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
            {{ isRegister ? "Konto erstellen" : "Anmelden" }} <i class="bi bi-arrow-right ms-1" />
          </button>
        </form>

        <p class="demo-hint mt-4 mb-0">
          <i class="bi bi-info-circle" /> Demo-Konten: siehe <code>backend/data/seed.json</code>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
  padding: 16px;
}
.visual {
  position: relative;
  border-radius: 2.5rem;
  overflow: hidden;
  background-size: cover;
  background-position: center 70%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2.5rem;
  isolation: isolate;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 50%, rgba(17, 19, 24, 0.75));
    z-index: -1;
  }
}
.brand {
  font-size: clamp(2.6rem, 6.4vw, 6.5rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.045em;
  color: var(--sapphire);
  line-height: 0.85;
  margin: 0;
}
.swoosh {
  position: absolute;
  left: 0;
  top: 32%;
  width: 100%;
  height: 26%;
  color: var(--lime);
  z-index: 0;
}
.claim {
  color: #fff;
  font-size: clamp(1.6rem, 3vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
  position: relative;
  span {
    color: var(--lime);
  }
}
.panel {
  display: grid;
  place-items: center;
  background: var(--lavender);
  border-radius: 2.5rem;
  padding: 2rem 1rem;
}
.card-login {
  width: min(420px, 100%);
}
.logo {
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--ink);
  text-decoration: none;
  letter-spacing: -0.03em;
  display: inline-flex;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}
.logo-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--lime);
  border: 2px solid var(--ink);
  border-radius: 50%;
  margin-left: 2px;
  margin-bottom: 0.3rem;
}
.title {
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  letter-spacing: -0.035em;
  margin-bottom: 0.5rem;
}
.tabs {
  display: flex;
  background: #fff;
  border-radius: 999px;
  padding: 4px;
}
.tab {
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  color: #4a4d5a;
  &.active {
    background: var(--ink);
    color: #fff;
  }
}
.form-control {
  background: #fff;
}
.demo-hint {
  font-size: 0.85rem;
  color: #5b5f70;
}

@media (max-width: 860px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .visual {
    min-height: 260px;
    border-radius: 1.75rem;
    padding: 1.75rem;
  }
  .panel {
    border-radius: 1.75rem;
  }
}
</style>
