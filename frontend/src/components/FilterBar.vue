<script setup lang="ts">
import {
  CONTINENT_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  type Continent,
  type DestinationFilter,
  type SortKey,
  type Status,
} from "../types/destination";

/** Filter werden per v-model an den Eltern-Zustand gebunden (defineModel). */
const filter = defineModel<DestinationFilter>({ required: true });
defineProps<{ resultCount: number; active: boolean }>();
const emit = defineEmits<{ reset: [] }>();

const statusTabs: { value: Status | ""; label: string }[] = [
  { value: "", label: "Alle" },
  ...(Object.keys(STATUS_LABELS) as Status[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];
const continents = Object.keys(CONTINENT_LABELS) as Continent[];
const sorts = Object.keys(SORT_LABELS) as SortKey[];
</script>

<template>
  <div class="filter-bar">
    <div class="search">
      <i class="bi bi-search" aria-hidden="true" />
      <input
        v-model="filter.q"
        type="search"
        class="form-control"
        placeholder="Ziel, Land oder Notiz suchen…"
        aria-label="Reiseziele durchsuchen"
      />
    </div>

    <div class="tabs" role="tablist" aria-label="Nach Status filtern">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="filter.status === tab.value"
        class="tab"
        :class="{ active: filter.status === tab.value }"
        @click="filter.status = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="selects">
      <select v-model="filter.continent" class="form-select" aria-label="Nach Kontinent filtern">
        <option value="">Alle Kontinente</option>
        <option v-for="c in continents" :key="c" :value="c">{{ CONTINENT_LABELS[c] }}</option>
      </select>
      <select v-model="filter.sort" class="form-select" aria-label="Sortierung">
        <option v-for="s in sorts" :key="s" :value="s">{{ SORT_LABELS[s] }}</option>
      </select>
    </div>
  </div>

  <div class="d-flex align-items-center gap-2 mt-3 small text-secondary" aria-live="polite">
    <span>{{ resultCount }} {{ resultCount === 1 ? "Reiseziel" : "Reiseziele" }}</span>
    <button v-if="active" type="button" class="btn btn-link btn-sm p-0" @click="emit('reset')">
      Filter zurücksetzen
    </button>
  </div>
</template>

<style scoped lang="scss">
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 999px;
  padding: 8px;
}
.search {
  position: relative;
  flex: 1 1 240px;
  i {
    position: absolute;
    left: 1.1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #8a8d9a;
  }
  .form-control {
    padding-left: 2.6rem;
    background: var(--lavender);
    border-color: transparent;
  }
}
.tabs {
  display: flex;
  gap: 4px;
  background: #f1f2f8;
  padding: 4px;
  border-radius: 999px;
}
.tab {
  border: 0;
  background: transparent;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.92rem;
  color: #4a4d5a;
  transition: background 0.15s, color 0.15s;
  &:hover {
    color: var(--ink);
  }
  &.active {
    background: var(--lime);
    color: var(--ink);
  }
}
.selects {
  display: flex;
  gap: 8px;
  .form-select {
    width: auto;
    border-color: transparent;
    background-color: #f1f2f8;
    font-weight: 500;
  }
}

@media (max-width: 991.98px) {
  .filter-bar {
    border-radius: 1.75rem;
  }
  .tabs {
    flex: 1 1 100%;
    overflow-x: auto;
  }
  .tab {
    flex: 1;
    white-space: nowrap;
  }
  .selects {
    flex: 1 1 100%;
    .form-select {
      flex: 1;
    }
  }
}
</style>
