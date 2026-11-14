<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  CONTINENT_LABELS,
  STATUS_ICONS,
  STATUS_LABELS,
  type Continent,
  type Destination,
  type DestinationInput,
  type Status,
} from "../types/destination";
import BaseModal from "./BaseModal.vue";
import RatingInput from "./RatingInput.vue";
import { coverStyle } from "./coverStyle";

/**
 * Formular zum Anlegen (destination = null) und Bearbeiten eines Reiseziels.
 * Die Komponente kennt die API nicht – sie meldet nur "save" mit den Formulardaten.
 * Fehler vom Server (Feldfehler, Geschäftsregeln) kommen über Props zurück.
 */
const props = defineProps<{
  open: boolean;
  destination: Destination | null;
  saving: boolean;
  errors: Record<string, string>;
  generalError: string | null;
}>();
const emit = defineEmits<{ close: []; save: [input: DestinationInput] }>();

const empty = (): DestinationInput => ({
  name: "",
  country: "",
  continent: "EUROPE",
  notes: "",
  status: "WISHLIST",
  travelDate: null,
  rating: null,
  imageUrl: null,
});

const form = reactive<DestinationInput>(empty());
const imageBroken = ref(false);

watch(
  () => [props.open, props.destination] as const,
  ([open, d]) => {
    if (!open) return;
    Object.assign(form, d ? { ...d } : empty());
    imageBroken.value = false;
  },
  { immediate: true },
);

const isEdit = computed(() => props.destination !== null);
const today = new Date().toISOString().slice(0, 10);
const continents = Object.keys(CONTINENT_LABELS) as Continent[];
const statuses = Object.keys(STATUS_LABELS) as Status[];

// UI spiegelt Geschäftsregel R1: nur besuchte Ziele sind bewertbar
watch(() => form.status, (s) => {
  if (s !== "VISITED") form.rating = null;
});
watch(() => form.imageUrl, () => (imageBroken.value = false));

const preview = computed(() =>
  coverStyle({ imageUrl: form.imageUrl?.trim() || null, continent: form.continent }, imageBroken.value)
);

function submit() {
  emit("save", {
    name: form.name.trim(),
    country: form.country.trim(),
    continent: form.continent,
    notes: form.notes.trim(),
    status: form.status,
    travelDate: form.travelDate || null,
    rating: form.status === "VISITED" ? form.rating : null,
    imageUrl: form.imageUrl?.trim() || null,
  });
}
</script>

<template>
  <BaseModal :open="open" size="lg" labelledby="form-title" @close="emit('close')">
    <form novalidate class="d-flex flex-column h-100 overflow-hidden" @submit.prevent="submit">
      <div class="form-head" :style="preview">
        <div class="shade" />
        <img
          v-if="form.imageUrl"
          :src="form.imageUrl"
          alt=""
          class="d-none"
          @error="imageBroken = true"
        />
        <button type="button" class="btn-close btn-close-white" aria-label="Schließen" @click="emit('close')" />
        <p class="eyebrow-light">{{ isEdit ? "Reiseziel bearbeiten" : "Neues Reiseziel" }}</p>
        <h2 id="form-title" class="title font-display">{{ form.name || "Wohin geht's?" }}</h2>
      </div>

      <div class="modal-body p-4">
        <div v-if="generalError" class="alert alert-danger rounded-4 d-flex gap-2" role="alert">
          <i class="bi bi-exclamation-octagon" /> <span>{{ generalError }}</span>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <label for="f-name" class="form-label">Name *</label>
            <input
              id="f-name"
              v-model="form.name"
              class="form-control"
              :class="{ 'is-invalid': errors.name }"
              placeholder="z. B. Lissabon oder Toskana"
              maxlength="80"
              required
            />
            <div class="invalid-feedback">{{ errors.name }}</div>
          </div>
          <div class="col-md-6">
            <label for="f-country" class="form-label">Land *</label>
            <input
              id="f-country"
              v-model="form.country"
              class="form-control"
              :class="{ 'is-invalid': errors.country }"
              placeholder="z. B. Portugal"
              maxlength="60"
              required
            />
            <div class="invalid-feedback">{{ errors.country }}</div>
          </div>

          <div class="col-md-6">
            <label for="f-continent" class="form-label">Kontinent *</label>
            <select
              id="f-continent"
              v-model="form.continent"
              class="form-select"
              :class="{ 'is-invalid': errors.continent }"
            >
              <option v-for="c in continents" :key="c" :value="c">{{ CONTINENT_LABELS[c] }}</option>
            </select>
            <div class="invalid-feedback">{{ errors.continent }}</div>
          </div>
          <div class="col-md-6">
            <label for="f-date" class="form-label">Reisedatum</label>
            <input
              id="f-date"
              v-model="form.travelDate"
              type="date"
              class="form-control"
              :class="{ 'is-invalid': errors.travelDate }"
              :max="form.status === 'VISITED' ? today : undefined"
            />
            <div class="invalid-feedback">{{ errors.travelDate }}</div>
          </div>

          <div class="col-12">
            <span class="form-label d-block" id="status-label">Status *</span>
            <div class="status-pills" role="radiogroup" aria-labelledby="status-label">
              <label v-for="s in statuses" :key="s" class="status-pill" :class="{ active: form.status === s }">
                <input v-model="form.status" type="radio" name="status" :value="s" class="visually-hidden" />
                <i class="bi" :class="STATUS_ICONS[s]" /> {{ STATUS_LABELS[s] }}
              </label>
            </div>
          </div>

          <div class="col-12">
            <span class="form-label d-block">Bewertung</span>
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <RatingInput v-model="form.rating" :disabled="form.status !== 'VISITED'" size="lg" />
              <small v-if="form.status !== 'VISITED'" class="text-secondary">
                <i class="bi bi-info-circle" /> Nur besuchte Ziele können bewertet werden.
              </small>
            </div>
            <div v-if="errors.rating" class="invalid-feedback d-block">{{ errors.rating }}</div>
          </div>

          <div class="col-12">
            <label for="f-image" class="form-label">Bild-URL <span class="text-secondary fw-normal">(optional, nur https://)</span></label>
            <input
              id="f-image"
              v-model="form.imageUrl"
              type="url"
              class="form-control"
              :class="{ 'is-invalid': errors.imageUrl }"
              placeholder="https://images.unsplash.com/…"
            />
            <div class="invalid-feedback">{{ errors.imageUrl }}</div>
            <small v-if="imageBroken" class="text-danger">Bild konnte nicht geladen werden – es wird ein Farbverlauf angezeigt.</small>
          </div>

          <div class="col-12">
            <label for="f-notes" class="form-label">Notizen</label>
            <textarea
              id="f-notes"
              v-model="form.notes"
              class="form-control"
              :class="{ 'is-invalid': errors.notes }"
              rows="3"
              maxlength="1000"
              placeholder="Was willst du dort erleben? Tipps, Ideen, Erinnerungen…"
            />
            <div class="invalid-feedback">{{ errors.notes }}</div>
          </div>
        </div>
      </div>

      <div class="modal-footer border-0 px-4 pb-4 pt-0">
        <button type="button" class="btn btn-soft rounded-pill px-4" @click="emit('close')">Abbrechen</button>
        <button type="submit" class="btn btn-lime rounded-pill px-4" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
          {{ isEdit ? "Änderungen speichern" : "Reiseziel anlegen" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped lang="scss">
.form-head {
  position: relative;
  min-height: 11rem;
  padding: 1.5rem 1.75rem;
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  isolation: isolate;
  flex-shrink: 0;
}
.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.6));
  z-index: -1;
}
.btn-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
}
.eyebrow-light {
  margin: 0 0 0.25rem;
  font-weight: 500;
  opacity: 0.9;
}
.title {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  text-transform: uppercase;
  color: var(--lime);
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.status-pill {
  cursor: pointer;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  background: var(--lavender);
  font-weight: 600;
  transition: background 0.15s;
  &:hover {
    background: #dadefd;
  }
  &.active {
    background: var(--ink);
    color: #fff;
  }
  &:focus-within {
    outline: 3px solid var(--sapphire);
    outline-offset: 2px;
  }
}
</style>
