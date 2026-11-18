<script setup lang="ts">
import { computed } from "vue";
import type { Destination } from "../types/destination";

const props = defineProps<{
  stats: {
    total: number;
    wishlist: number;
    planned: number;
    visited: number;
    countries: number;
    continents: number;
    avgRating: number | null;
    nextTrip: Destination | null;
  };
}>();
const emit = defineEmits<{ open: [destination: Destination] }>();

const visitedPct = computed(() =>
  props.stats.total ? Math.round((props.stats.visited / props.stats.total) * 100) : 0
);

const daysUntilNext = computed(() => {
  const d = props.stats.nextTrip?.travelDate;
  if (!d) return null;
  const diff = new Date(`${d}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86_400_000);
});

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
</script>

<template>
  <section id="ueberblick" class="container-xl py-5">
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <p class="eyebrow mb-0"><span class="num">01</span> Dein Reise-Überblick</p>
      <h2 class="big-heading font-display mb-0">Überblick</h2>
    </div>

    <div class="bento">
      <article class="tile tile-lavender t-pct">
        <svg class="squiggle" viewBox="0 0 200 200" aria-hidden="true">
          <path d="M20 160 C 60 20, 120 200, 180 40" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" />
        </svg>
        <p class="big font-display">{{ visitedPct }}%</p>
        <p class="label"><strong>deiner Ziele</strong> hast du schon erlebt.</p>
      </article>

      <article class="tile tile-lime t-countries">
        <p class="big font-display">{{ stats.countries }}</p>
        <p class="label">
          <strong>{{ stats.countries === 1 ? "Land" : "Länder" }}</strong> auf
          {{ stats.continents }} {{ stats.continents === 1 ? "Kontinent" : "Kontinenten" }} bereist
        </p>
      </article>

      <article class="tile tile-ink t-motto">
        <p class="motto font-display">Gutes<br />Reisen.<br /><span>Gute<br />Geschichten.</span></p>
      </article>

      <article class="tile tile-sunshine t-next">
        <p class="label-top">Nächste Reise</p>
        <template v-if="stats.nextTrip">
          <button class="next-link font-display" @click="emit('open', stats.nextTrip)">
            {{ stats.nextTrip.name }} <i class="bi bi-arrow-up-right" />
          </button>
          <p class="label mb-0">
            {{ formatDate(stats.nextTrip.travelDate!) }}
            <span v-if="daysUntilNext !== null && daysUntilNext >= 0" class="chip chip-ink ms-1">
              in {{ daysUntilNext }} Tagen
            </span>
          </p>
        </template>
        <p v-else class="label mb-0">Noch keine Reise mit Datum geplant.</p>
      </article>

      <article class="tile tile-sapphire t-rating">
        <p class="big font-display">
          {{ stats.avgRating !== null ? stats.avgRating.toFixed(1).replace(".", ",") : "–" }}
          <i class="bi bi-star-fill star" />
        </p>
        <p class="label">Ø Bewertung deiner besuchten Ziele</p>
      </article>

      <article class="tile tile-white t-split">
        <div class="split-row">
          <span><i class="bi bi-stars" /> Wunschziele</span><strong>{{ stats.wishlist }}</strong>
        </div>
        <div class="split-row">
          <span><i class="bi bi-calendar2-check" /> Geplant</span><strong>{{ stats.planned }}</strong>
        </div>
        <div class="split-row">
          <span><i class="bi bi-geo-alt-fill" /> Besucht</span><strong>{{ stats.visited }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.big-heading {
  font-size: clamp(2.6rem, 8vw, 6rem);
  text-transform: uppercase;
  color: var(--sapphire);
  letter-spacing: -0.04em;
  line-height: 0.9;
  font-weight: 600;
}

.bento {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, 1fr);
  grid-template-areas:
    "pct countries motto next"
    "rating split  motto next";
}
.t-pct { grid-area: pct; }
.t-countries { grid-area: countries; }
.t-motto { grid-area: motto; }
.t-next { grid-area: next; }
.t-rating { grid-area: rating; }
.t-split { grid-area: split; }

.tile {
  position: relative;
  overflow: hidden;
  border-radius: 2rem;
  padding: 1.6rem;
  min-height: 12rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.tile-lavender { background: var(--lavender); }
.tile-lime { background: var(--lime); }
.tile-sunshine { background: var(--sunshine); }
.tile-ink { background: var(--ink); color: #fff; }
.tile-sapphire { background: var(--sapphire); color: #fff; }
.tile-white { background: #fff; border: 1px solid #ececf2; justify-content: center; }

.big {
  font-size: clamp(2.4rem, 4vw, 3.4rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  margin: 0 0 0.25rem;
  line-height: 1;
  position: relative;
}
.label {
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
  position: relative;
}
.label-top {
  font-weight: 600;
  margin-bottom: auto;
}
.star {
  font-size: 0.6em;
  color: var(--lime);
  vertical-align: 0.35em;
}
.squiggle {
  position: absolute;
  right: -10px;
  top: -10px;
  width: 9rem;
  color: var(--sapphire);
  opacity: 0.9;
}
.motto {
  font-size: clamp(1.2rem, 2.6vw, 2.3rem);
  text-transform: uppercase;
  line-height: 1.02;
  letter-spacing: -0.03em;
  margin: 0;
  span {
    color: var(--lime);
  }
}
.next-link {
  all: unset;
  cursor: pointer;
  font-size: clamp(1.6rem, 2.4vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 0.5rem;
  display: block;
  &:hover {
    color: var(--sapphire);
  }
  &:focus-visible {
    outline: 3px solid var(--sapphire);
    border-radius: 0.5rem;
  }
}
.split-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0;
  border-bottom: 1px dashed #dcdde6;
  &:last-child {
    border-bottom: 0;
  }
  i {
    color: var(--sapphire);
    margin-right: 0.35rem;
  }
  strong {
    font-family: var(--font-display);
    font-size: 1.3rem;
  }
}

@media (max-width: 991.98px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      "pct countries"
      "motto next"
      "rating split";
  }
}
@media (max-width: 575.98px) {
  .bento {
    grid-template-columns: 1fr;
    grid-template-areas: "pct" "countries" "next" "rating" "split" "motto";
  }
  .tile {
    min-height: 9rem;
  }
}
</style>
