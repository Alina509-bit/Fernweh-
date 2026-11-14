<script setup lang="ts">
import { computed } from "vue";
import {
  CONTINENT_LABELS,
  STATUS_ICONS,
  STATUS_LABELS,
  type Destination,
  type Status,
} from "../types/destination";
import BaseModal from "./BaseModal.vue";
import RatingInput from "./RatingInput.vue";
import { coverStyle } from "./coverStyle";

/**
 * Detailansicht. Statuswechsel und Bewertung lösen PATCH-Requests aus
 * (Teil-Update statt das ganze Objekt erneut zu senden).
 */
const props = defineProps<{ open: boolean; destination: Destination | null; busy: boolean }>();
const emit = defineEmits<{
  close: [];
  edit: [];
  delete: [];
  patch: [data: Partial<Pick<Destination, "status" | "rating">>];
}>();

const statuses = Object.keys(STATUS_LABELS) as Status[];
const cover = computed(() => (props.destination ? coverStyle(props.destination) : {}));

const rating = computed({
  get: () => props.destination?.rating ?? null,
  set: (value: number | null) => emit("patch", { rating: value }),
});

function fmt(iso: string | null, withDay = true) {
  if (!iso) return "–";
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("de-DE", {
    day: withDay ? "numeric" : undefined,
    month: "long",
    year: "numeric",
  });
}
</script>

<template>
  <BaseModal :open="open && !!destination" size="lg" labelledby="detail-title" @close="emit('close')">
    <template v-if="destination">
      <div class="detail-head" :style="cover">
        <div class="shade" />
        <button type="button" class="btn-close btn-close-white" aria-label="Schließen" @click="emit('close')" />
        <span class="chip chip-glass align-self-start mb-auto">
          <i class="bi" :class="STATUS_ICONS[destination.status]" /> {{ STATUS_LABELS[destination.status] }}
        </span>
        <h2 id="detail-title" class="title font-display">{{ destination.name }}</h2>
        <p class="sub mb-0">
          <i class="bi bi-geo-alt" /> {{ destination.country }} · {{ CONTINENT_LABELS[destination.continent] }}
        </p>
      </div>

      <div class="modal-body p-4">
        <div class="facts">
          <div class="fact">
            <span>Reisedatum</span>
            <strong>{{ fmt(destination.travelDate) }}</strong>
          </div>
          <div class="fact">
            <span>Bewertung</span>
            <RatingInput
              v-model="rating"
              :disabled="destination.status !== 'VISITED' || busy"
            />
          </div>
          <div class="fact">
            <span>Hinzugefügt</span>
            <strong>{{ fmt(destination.createdAt) }}</strong>
          </div>
        </div>
        <small v-if="destination.status !== 'VISITED'" class="text-secondary d-block mt-2">
          <i class="bi bi-info-circle" /> Markiere das Ziel als „Besucht“, um es zu bewerten.
        </small>

        <h3 class="h6 mt-4 mb-2 fw-bold font-body">Notizen</h3>
        <p class="notes">{{ destination.notes || "Noch keine Notizen." }}</p>

        <h3 class="h6 mt-4 mb-2 fw-bold">Status ändern</h3>
        <div class="d-flex flex-wrap gap-2">
          <button
            v-for="s in statuses"
            :key="s"
            type="button"
            class="btn rounded-pill"
            :class="destination.status === s ? 'btn-ink' : 'btn-soft'"
            :disabled="busy"
            :aria-pressed="destination.status === s"
            @click="destination.status !== s && emit('patch', { status: s })"
          >
            <i class="bi" :class="STATUS_ICONS[s]" /> {{ STATUS_LABELS[s] }}
          </button>
        </div>
      </div>

      <div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-between">
        <button type="button" class="btn btn-outline-danger rounded-pill px-4" @click="emit('delete')">
          <i class="bi bi-trash3" /> Löschen
        </button>
        <button type="button" class="btn btn-lime rounded-pill px-4" @click="emit('edit')">
          <i class="bi bi-pencil" /> Bearbeiten
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.detail-head {
  position: relative;
  min-height: 18rem;
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
  z-index: -1;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.7));
}
.btn-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
}
.title {
  font-size: clamp(2rem, 6vw, 3.4rem);
  text-transform: uppercase;
  color: var(--lime);
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 0 0 0.4rem;
  overflow-wrap: anywhere;
}
.facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.fact {
  background: var(--lavender);
  border-radius: 1.25rem;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  span {
    font-size: 0.8rem;
    color: #5b5f70;
  }
}
.notes {
  white-space: pre-line;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 1.25rem;
  padding: 1rem 1.15rem;
  margin: 0;
}
@media (max-width: 575.98px) {
  .facts {
    grid-template-columns: 1fr;
  }
}
</style>
