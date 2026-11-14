import { computed, reactive, ref, watch } from "vue";
import { destinationsApi } from "../api/destinations";
import type { Destination, DestinationFilter, DestinationInput } from "../types/destination";

/**
 * Server State der Anwendung.
 *
 * - `items`   : gefilterte Liste – Filter/Suche/Sortierung übernimmt das Backend (Query-Parameter)
 * - `all`     : ungefilterte Liste für die Kennzahlen im Überblick
 *
 * Nach jeder Änderung wird neu geladen, damit die UI immer den Stand des
 * Servers zeigt (der Server ist die "Single Source of Truth").
 */
export function useDestinations() {
  const items = ref<Destination[]>([]);
  const all = ref<Destination[]>([]);
  const loading = ref(false);
  const loadError = ref<string | null>(null);

  const filter = reactive<DestinationFilter>({
    status: "",
    continent: "",
    q: "",
    sort: "createdAt",
  });

  let requestId = 0;
  async function refresh() {
    const current = ++requestId;
    loading.value = true;
    loadError.value = null;
    try {
      const [filtered, everything] = await Promise.all([
        destinationsApi.list({ ...filter, q: filter.q.trim() }),
        destinationsApi.list(),
      ]);
      // Antworten veralteter Requests verwerfen (schnelles Tippen in der Suche)
      if (current !== requestId) return;
      items.value = filtered;
      all.value = everything;
    } catch (err) {
      if (current === requestId) loadError.value = (err as Error).message;
    } finally {
      if (current === requestId) loading.value = false;
    }
  }

  // Suche entprellen, andere Filter sofort anwenden
  let debounce: ReturnType<typeof setTimeout> | undefined;
  watch(() => filter.q, () => {
    clearTimeout(debounce);
    debounce = setTimeout(refresh, 250);
  });
  watch(() => [filter.status, filter.continent, filter.sort], refresh);

  const stats = computed(() => {
    const list = all.value;
    const visited = list.filter((d) => d.status === "VISITED");
    const rated = visited.filter((d) => d.rating !== null);
    return {
      total: list.length,
      wishlist: list.filter((d) => d.status === "WISHLIST").length,
      planned: list.filter((d) => d.status === "PLANNED").length,
      visited: visited.length,
      countries: new Set(visited.map((d) => d.country.toLowerCase())).size,
      continents: new Set(visited.map((d) => d.continent)).size,
      avgRating: rated.length
        ? rated.reduce((s, d) => s + (d.rating ?? 0), 0) / rated.length
        : null,
      nextTrip: list
        .filter((d) => d.status === "PLANNED" && d.travelDate)
        .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!))[0] ?? null,
    };
  });

  async function create(input: DestinationInput) {
    const created = await destinationsApi.create(input);
    await refresh();
    return created;
  }

  async function replace(id: string, input: DestinationInput) {
    const updated = await destinationsApi.replace(id, input);
    await refresh();
    return updated;
  }

  async function patch(id: string, data: Partial<DestinationInput>) {
    const updated = await destinationsApi.patch(id, data);
    await refresh();
    return updated;
  }

  async function remove(id: string) {
    await destinationsApi.remove(id);
    await refresh();
  }

  function resetFilter() {
    filter.status = "";
    filter.continent = "";
    filter.q = "";
    filter.sort = "createdAt";
  }

  return {
    items, all, loading, loadError, filter, stats,
    refresh, create, replace, patch, remove, resetFilter,
  };
}
