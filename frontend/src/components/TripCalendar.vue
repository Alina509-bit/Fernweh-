<script setup lang="ts">
import { computed, ref } from "vue";
import { STATUS_LABELS, type Destination } from "../types/destination";

/**
 * Reisekalender: zeigt, WANN Reisen stattfinden.
 *
 * Reine Darstellungskomponente – sie bekommt die Reiseziele als Prop (dieselben Daten wie
 * die Karten) und sortiert sie nach `travelDate` in eine Monatsansicht ein.
 * Dafür ist keine neue API nötig: Das Frontend stellt vorhandene Daten anders dar.
 */
const props = defineProps<{ destinations: Destination[] }>();
const emit = defineEmits<{ open: [destination: Destination] }>();

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const pad = (n: number) => String(n).padStart(2, "0");
/** Datum als "JJJJ-MM-TT" – dasselbe Format wie travelDate in der API. */
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const now = new Date();
const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

// Angezeigter Monat (UI State, nur in dieser Komponente)
const year = ref(now.getFullYear());
const month = ref(now.getMonth()); // 0 = Januar
const highlight = ref<string | null>(null);

/** Alle Reiseziele mit Datum, chronologisch. */
const dated = computed(() =>
  props.destinations
    .filter((d) => d.travelDate)
    .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!))
);

/** Nachschlagetabelle: Datum → Reiseziele an diesem Tag. */
const byDay = computed(() => {
  const map = new Map<string, Destination[]>();
  for (const d of dated.value) {
    map.set(d.travelDate!, [...(map.get(d.travelDate!) ?? []), d]);
  }
  return map;
});

const monthTitle = computed(() =>
  new Date(year.value, month.value, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" })
);

interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  trips: Destination[];
}

/** Kalenderraster: volle Wochen von Montag bis Sonntag rund um den Monat. */
const cells = computed<Cell[]>(() => {
  const first = new Date(year.value, month.value, 1);
  const offset = (first.getDay() + 6) % 7; // getDay(): 0 = Sonntag → Montag soll 0 sein
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year.value, month.value, 1 - offset + i);
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    return {
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month.value,
      isToday: key === todayKey,
      trips: byDay.value.get(key) ?? [],
    };
  });
});

/** Anzahl Reisen pro Monat im angezeigten Jahr (für die Monatsleiste). */
const monthCounts = computed(() =>
  MONTHS_SHORT.map((_, m) =>
    dated.value.filter((d) => d.travelDate!.startsWith(`${year.value}-${pad(m + 1)}`)).length
  )
);

/** Geplante Reisen ab heute – die nächsten fünf. */
const upcoming = computed(() =>
  dated.value.filter((d) => d.status === "PLANNED" && d.travelDate! >= todayKey).slice(0, 5)
);
const plannedWithoutDate = computed(
  () => props.destinations.filter((d) => d.status === "PLANNED" && !d.travelDate).length,
);

function shift(delta: number) {
  const d = new Date(year.value, month.value + delta, 1);
  year.value = d.getFullYear();
  month.value = d.getMonth();
}

function goToday() {
  year.value = now.getFullYear();
  month.value = now.getMonth();
}

/** Springt zum Monat einer Reise und hebt den Tag kurz hervor. */
function showTrip(d: Destination) {
  const [y, m] = d.travelDate!.split("-").map(Number);
  year.value = y;
  month.value = m - 1;
  highlight.value = d.travelDate;
  setTimeout(() => (highlight.value = null), 1600);
}

function daysUntil(iso: string) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - start) / 86_400_000);
}

function formatLong(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
</script>

<template>
  <section id="kalender" class="container-xl pb-5">
    <div class="row align-items-end g-3 mb-4">
      <div class="col-lg-7">
        <p class="eyebrow"><span class="num">02</span> Reisekalender</p>
        <h2 class="title font-display">
          Wann geht's los?<br /><span class="text-sapphire">Alle Reisen auf einen Blick.</span>
        </h2>
      </div>
      <div class="col-lg-5 d-flex gap-2 flex-wrap justify-content-lg-end">
        <span class="legend"><i class="dot PLANNED" /> {{ STATUS_LABELS.PLANNED }}</span>
        <span class="legend"><i class="dot VISITED" /> {{ STATUS_LABELS.VISITED }}</span>
        <span class="legend"><i class="dot WISHLIST" /> {{ STATUS_LABELS.WISHLIST }}</span>
      </div>
    </div>

    <div class="layout">
      <!-- Monatsansicht -->
      <div class="cal-card">
        <div class="toolbar">
          <h3 class="month font-display" aria-live="polite">{{ monthTitle }}</h3>
          <div class="d-flex gap-2">
            <button type="button" class="round-btn" aria-label="Vorheriger Monat" @click="shift(-1)">
              <i class="bi bi-chevron-left" />
            </button>
            <button type="button" class="btn btn-soft btn-sm rounded-pill px-3" @click="goToday">Heute</button>
            <button type="button" class="round-btn" aria-label="Nächster Monat" @click="shift(1)">
              <i class="bi bi-chevron-right" />
            </button>
          </div>
        </div>

        <div class="months" aria-label="Monat wählen">
          <button
            v-for="(label, m) in MONTHS_SHORT"
            :key="label"
            type="button"
            class="month-pill"
            :class="{ active: m === month, has: monthCounts[m] > 0 }"
            :aria-pressed="m === month"
            :aria-label="`${label} ${year}: ${monthCounts[m]} Reisen`"
            @click="month = m"
          >
            {{ label }}<span v-if="monthCounts[m]" class="count">{{ monthCounts[m] }}</span>
          </button>
        </div>

        <div class="grid" role="grid" :aria-label="`Kalender ${monthTitle}`">
          <div v-for="w in WEEKDAYS" :key="w" class="weekday" role="columnheader">{{ w }}</div>
          <div
            v-for="cell in cells"
            :key="cell.key"
            class="cell"
            role="gridcell"
            :class="{ out: !cell.inMonth, today: cell.isToday, flash: cell.key === highlight }"
          >
            <span class="day">{{ cell.day }}</span>
            <button
              v-for="trip in cell.trips"
              :key="trip.id"
              type="button"
              class="trip"
              :class="trip.status"
              :title="`${trip.name} (${trip.country}) – ${STATUS_LABELS[trip.status]}`"
              :aria-label="`${trip.name}, ${STATUS_LABELS[trip.status]}, ${formatLong(trip.travelDate!)} – Details öffnen`"
              @click="emit('open', trip)"
            >
              <span class="trip-label">{{ trip.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Nächste Reisen -->
      <aside class="upcoming">
        <h3 class="font-display">Nächste Reisen</h3>
        <ol v-if="upcoming.length" class="list-unstyled mb-0">
          <li v-for="trip in upcoming" :key="trip.id">
            <button type="button" class="up-item" @click="showTrip(trip)">
              <span class="date-box">
                <b class="font-display">{{ Number(trip.travelDate!.slice(8, 10)) }}</b>
                <small>{{ MONTHS_SHORT[Number(trip.travelDate!.slice(5, 7)) - 1] }} {{ trip.travelDate!.slice(2, 4) }}</small>
              </span>
              <span class="up-text">
                <strong>{{ trip.name }}</strong>
                <small>{{ trip.country }}</small>
              </span>
              <span class="countdown">
                {{ daysUntil(trip.travelDate!) === 0 ? "heute" : `in ${daysUntil(trip.travelDate!)} Tagen` }}
              </span>
            </button>
          </li>
        </ol>
        <p v-else class="empty mb-0">
          Noch keine Reise mit Datum geplant. Lege ein Ziel mit Status „Geplant“ und Reisedatum an.
        </p>
        <p v-if="plannedWithoutDate" class="hint mb-0">
          <i class="bi bi-info-circle" />
          {{ plannedWithoutDate }} geplante{{ plannedWithoutDate === 1 ? "s Ziel hat" : " Ziele haben" }}
          noch kein Datum.
        </p>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.title {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  display: inline-block;
}

// Farben je Status (wie im Rest der App)
.PLANNED {
  --trip-bg: var(--lime);
  --trip-fg: var(--ink);
}
.VISITED {
  --trip-bg: var(--sapphire);
  --trip-fg: #fff;
}
.WISHLIST {
  --trip-bg: var(--sunshine);
  --trip-fg: var(--ink);
}
.dot.PLANNED,
.dot.VISITED,
.dot.WISHLIST {
  background: var(--trip-bg);
  border: 1px solid rgba(17, 19, 24, 0.15);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(0, 1fr);
  gap: 16px;
}

.cal-card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 2rem;
  padding: 1.5rem;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.month {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.8rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  text-transform: capitalize;
}
.round-btn {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 50%;
  border: 0;
  background: var(--lavender);
  display: grid;
  place-items: center;
  &:hover {
    background: #dadefd;
  }
}

.months {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  margin-bottom: 1rem;
}
.month-pill {
  position: relative;
  border: 0;
  border-radius: 999px;
  padding: 0.4rem 0;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f4f5fa;
  color: #8a8d9a;
  &.has {
    color: var(--ink);
    background: var(--lavender);
  }
  &.active {
    background: var(--ink);
    color: #fff;
  }
  .count {
    position: absolute;
    top: -6px;
    right: -2px;
    min-width: 1.15rem;
    height: 1.15rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: var(--lime);
    color: var(--ink);
    font-size: 0.7rem;
    line-height: 1.15rem;
    border: 2px solid #fff;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}
.weekday {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: #8a8d9a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 0.25rem;
}
.cell {
  min-height: 5.6rem;
  border-radius: 1rem;
  background: #f7f8fc;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  transition: box-shadow 0.3s, background 0.3s;
  &.out {
    background: transparent;
    .day {
      color: #c3c5d0;
    }
  }
  &.today .day {
    background: var(--ink);
    color: var(--lime);
  }
  &.flash {
    background: var(--lavender);
    box-shadow: 0 0 0 3px var(--sapphire);
  }
}
.day {
  font-size: 0.8rem;
  font-weight: 600;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.trip {
  border: 0;
  border-radius: 0.6rem;
  padding: 0.2rem 0.45rem;
  background: var(--trip-bg);
  color: var(--trip-fg);
  font-size: 0.76rem;
  font-weight: 600;
  text-align: left;
  min-width: 0;
  &:hover {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }
}
.trip-label {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming {
  background: var(--ink);
  color: #fff;
  border-radius: 2rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  h3 {
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--lime);
    margin: 0 0 0.25rem;
  }
}
.up-item {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem;
  border-radius: 1.25rem;
  margin-bottom: 0.35rem;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  &:focus-visible {
    outline: 3px solid var(--lime);
  }
}
.date-box {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 1rem;
  background: var(--lime);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  b {
    font-size: 1.3rem;
  }
  small {
    font-size: 0.7rem;
    font-weight: 600;
    margin-top: 0.15rem;
  }
}
.up-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    opacity: 0.7;
  }
}
.countdown {
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  white-space: nowrap;
}
.empty,
.hint {
  font-size: 0.9rem;
  opacity: 0.8;
}
.hint {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

@media (max-width: 991.98px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 575.98px) {
  .cal-card {
    padding: 1rem;
    border-radius: 1.5rem;
  }
  .months {
    grid-template-columns: repeat(6, 1fr);
  }
  .cell {
    min-height: 3.2rem;
    padding: 0.25rem;
    border-radius: 0.7rem;
  }
  // Auf dem Handy nur farbige Balken statt Namen
  .trip {
    height: 0.45rem;
    padding: 0;
  }
  .trip-label {
    display: none;
  }
}
</style>
