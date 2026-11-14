<script setup lang="ts">
import { computed } from "vue";
import { CONTINENT_LABELS, STATUS_ICONS, STATUS_LABELS, type Destination } from "../types/destination";
import { coverStyle } from "./coverStyle";

const props = defineProps<{ destination: Destination }>();
const emit = defineEmits<{ open: []; edit: []; delete: [] }>();

const cover = computed(() => coverStyle(props.destination));
const dateLabel = computed(() => {
  const d = props.destination.travelDate;
  return d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("de-DE", { month: "short", year: "numeric" })
    : null;
});
</script>

<template>
  <article class="dest-card" :style="cover" @click="emit('open')">
    <div class="shade" />

    <div class="top">
      <span class="chip chip-glass">
        <i class="bi" :class="STATUS_ICONS[destination.status]" />
        {{ STATUS_LABELS[destination.status] }}
      </span>
      <div class="actions">
        <button
          type="button"
          class="icon-btn"
          :aria-label="`${destination.name} bearbeiten`"
          title="Bearbeiten"
          @click.stop="emit('edit')"
        >
          <i class="bi bi-pencil" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="`${destination.name} löschen`"
          title="Löschen"
          @click.stop="emit('delete')"
        >
          <i class="bi bi-trash3" />
        </button>
      </div>
    </div>

    <div class="bottom">
      <h3 class="name font-display">{{ destination.name }}</h3>
      <div class="meta">
        <span v-if="destination.rating" class="rating">
          <i class="bi bi-star-fill" /> {{ destination.rating.toFixed(1) }}
        </span>
        <span><i class="bi bi-geo-alt" /> {{ destination.country }}</span>
        <span v-if="dateLabel" class="d-none d-sm-inline"><i class="bi bi-calendar3" /> {{ dateLabel }}</span>
      </div>
      <p class="continent">{{ CONTINENT_LABELS[destination.continent] }}</p>
      <button
        type="button"
        class="arrow"
        :aria-label="`Details zu ${destination.name} öffnen`"
        @click.stop="emit('open')"
      >
        <i class="bi bi-arrow-right" />
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.dest-card {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 2rem;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  isolation: isolate;
  box-shadow: 0 1px 0 rgba(17, 19, 24, 0.04);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-size 0.6s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 22px 40px -18px rgba(17, 19, 24, 0.45);
  }
  &:hover .arrow {
    background: var(--lime);
    color: var(--ink);
    transform: rotate(-45deg);
  }
}
.shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.7) 100%);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.dest-card:hover .actions,
.dest-card:focus-within .actions {
  opacity: 1;
}
@media (hover: none) {
  .actions {
    opacity: 1;
  }
}
.icon-btn {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(17, 19, 24, 0.35);
  backdrop-filter: blur(10px);
  color: #fff;
  display: grid;
  place-items: center;
  &:hover {
    background: #fff;
    color: var(--ink);
  }
}
.bottom {
  position: relative;
  padding: 0 0.4rem 0.2rem;
  text-align: center;
}
.name {
  font-size: clamp(1.5rem, 2.3vw, 2.1rem);
  line-height: 0.95;
  text-transform: uppercase;
  color: var(--lime);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.6rem;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35);
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.85rem;
  font-size: 0.88rem;
  font-weight: 500;
  .rating i {
    color: #ffd84d;
  }
}
.continent {
  font-size: 0.78rem;
  opacity: 0.75;
  margin: 0.25rem 0 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.arrow {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.85);
  color: var(--ink);
  display: grid;
  place-items: center;
  transition: transform 0.25s, background 0.2s;
}
@media (max-width: 575.98px) {
  .arrow {
    display: none;
  }
}
</style>
