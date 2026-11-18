<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ApiRequestError } from "../api/client";
import AppFooter from "./AppFooter.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import DestinationCard from "./DestinationCard.vue";
import DestinationDetailModal from "./DestinationDetailModal.vue";
import DestinationFormModal from "./DestinationFormModal.vue";
import FilterBar from "./FilterBar.vue";
import HeroSection from "./HeroSection.vue";
import InsightsBento from "./InsightsBento.vue";
import ToastStack from "./ToastStack.vue";
import TripCalendar from "./TripCalendar.vue";
import { useDestinations } from "../composables/useDestinations";
import { useToasts } from "../composables/useToasts";
import { STATUS_LABELS, type Destination, type DestinationInput } from "../types/destination";

/**
 * Hauptseite. Orchestriert den UI State (welches Modal ist offen?) und
 * verbindet die Komponenten mit dem Server State aus useDestinations().
 */
const store = useDestinations();
const { items, all, loading, loadError, filter, stats } = store;
const toast = useToasts();

onMounted(store.refresh);

const filterActive = computed(
  () => !!(filter.status || filter.continent || filter.q.trim() || filter.sort !== "createdAt"),
);

// --- Detail ------------------------------------------------------------------
const detailId = ref<string | null>(null);
const detail = computed(() => all.value.find((d) => d.id === detailId.value) ?? null);
const patching = ref(false);

async function patchDetail(data: Partial<Destination>) {
  if (!detail.value) return;
  patching.value = true;
  try {
    const updated = await store.patch(detail.value.id, data);
    toast.success(
      data.status ? `„${updated.name}“ ist jetzt: ${STATUS_LABELS[updated.status]}` : "Bewertung gespeichert",
    );
  } catch (err) {
    toast.error((err as Error).message);
  } finally {
    patching.value = false;
  }
}

// --- Formular (Anlegen / Bearbeiten) ----------------------------------------
const formOpen = ref(false);
const editing = ref<Destination | null>(null);
const saving = ref(false);
const fieldErrors = ref<Record<string, string>>({});
const generalError = ref<string | null>(null);

function openCreate() {
  editing.value = null;
  fieldErrors.value = {};
  generalError.value = null;
  formOpen.value = true;
}
function openEdit(d: Destination) {
  detailId.value = null;
  editing.value = d;
  fieldErrors.value = {};
  generalError.value = null;
  formOpen.value = true;
}

async function save(input: DestinationInput) {
  saving.value = true;
  fieldErrors.value = {};
  generalError.value = null;
  try {
    if (editing.value) {
      const d = await store.replace(editing.value.id, input);
      toast.success(`„${d.name}“ wurde gespeichert`);
    } else {
      const d = await store.create(input);
      toast.success(`„${d.name}“ wurde hinzugefügt`);
    }
    formOpen.value = false;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      fieldErrors.value = err.fieldErrors;
      generalError.value = err.message;
    } else {
      generalError.value = (err as Error).message;
    }
  } finally {
    saving.value = false;
  }
}

// --- Löschen -------------------------------------------------------------------
const toDelete = ref<Destination | null>(null);
const deleting = ref(false);

function askDelete(d: Destination) {
  toDelete.value = d;
}
async function confirmDelete() {
  if (!toDelete.value) return;
  deleting.value = true;
  const name = toDelete.value.name;
  try {
    await store.remove(toDelete.value.id);
    if (detailId.value === toDelete.value.id) detailId.value = null;
    toast.success(`„${name}“ wurde gelöscht`);
    toDelete.value = null;
  } catch (err) {
    toast.error((err as Error).message);
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <HeroSection
    :visited="stats.visited"
    :countries="stats.countries"
    :planned="stats.planned"
    @create="openCreate"
  />

  <main>
    <InsightsBento :stats="stats" @open="(d) => (detailId = d.id)" />

    <TripCalendar :destinations="all" @open="(d) => (detailId = d.id)" />

    <section id="reiseziele" class="container-xl pb-5">
      <div class="row align-items-end g-4 mb-4">
        <div class="col-lg-7">
          <p class="eyebrow"><span class="num">03</span> Meine Reiseziele</p>
          <h2 class="section-title font-display">
            Reise mit Plan.<br /><span class="text-sapphire">Erinnere dich an alles.</span>
          </h2>
        </div>
        <div class="col-lg-5 text-lg-end">
          <button class="btn btn-lime rounded-pill btn-lg px-4" @click="openCreate">
            <i class="bi bi-plus-lg" /> Reiseziel hinzufügen
          </button>
        </div>
      </div>

      <FilterBar
        :model-value="filter"
        :result-count="items.length"
        :active="filterActive"
        @reset="store.resetFilter"
      />

      <div v-if="loadError" class="state-box mt-4" role="alert">
        <i class="bi bi-wifi-off" />
        <h3 class="h5 font-display">Verbindung fehlgeschlagen</h3>
        <p class="text-secondary">{{ loadError }}</p>
        <button class="btn btn-ink rounded-pill px-4" @click="store.refresh">Erneut versuchen</button>
      </div>

      <div v-else-if="loading && !items.length" class="grid mt-4" aria-busy="true">
        <div v-for="n in 4" :key="n" class="skeleton" />
      </div>

      <div v-else-if="!items.length" class="state-box mt-4">
        <i class="bi bi-compass" />
        <h3 class="h5 font-display">{{ filterActive ? "Nichts gefunden" : "Noch keine Reiseziele" }}</h3>
        <p class="text-secondary">
          {{ filterActive ? "Passe die Filter an oder setze sie zurück." : "Wohin zieht es dich als Nächstes?" }}
        </p>
        <button v-if="filterActive" class="btn btn-soft rounded-pill px-4" @click="store.resetFilter">
          Filter zurücksetzen
        </button>
        <button v-else class="btn btn-lime rounded-pill px-4" @click="openCreate">Erstes Ziel anlegen</button>
      </div>

      <TransitionGroup v-else tag="div" name="list" class="grid mt-4" :class="{ dimmed: loading }">
        <DestinationCard
          v-for="d in items"
          :key="d.id"
          :destination="d"
          @open="detailId = d.id"
          @edit="openEdit(d)"
          @delete="askDelete(d)"
        />
      </TransitionGroup>
    </section>
  </main>

  <AppFooter @create="openCreate" />

  <DestinationDetailModal
    :open="!!detailId"
    :destination="detail"
    :busy="patching"
    @close="detailId = null"
    @edit="detail && openEdit(detail)"
    @delete="detail && askDelete(detail)"
    @patch="patchDetail"
  />

  <DestinationFormModal
    :open="formOpen"
    :destination="editing"
    :saving="saving"
    :errors="fieldErrors"
    :general-error="generalError"
    @close="formOpen = false"
    @save="save"
  />

  <ConfirmDialog
    :open="!!toDelete"
    title="Reiseziel löschen?"
    :message="`„${toDelete?.name ?? ''}“ wird dauerhaft entfernt.`"
    :busy="deleting"
    @cancel="toDelete = null"
    @confirm="confirmDelete"
  />

  <ToastStack />
</template>

<style scoped lang="scss">
.section-title {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  transition: opacity 0.2s;
  &.dimmed {
    opacity: 0.6;
  }
}
@media (max-width: 575.98px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
.skeleton {
  aspect-ratio: 4 / 5;
  border-radius: 2rem;
  background: linear-gradient(90deg, #eceef8 0%, #f6f7fc 50%, #eceef8 100%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
.state-box {
  text-align: center;
  padding: 3.5rem 1.5rem;
  border-radius: 2rem;
  background: var(--lavender);
  > i {
    font-size: 2.4rem;
    color: var(--sapphire);
    display: block;
    margin-bottom: 0.75rem;
  }
}
/* Nur Einblenden animieren – entfernte Karten verschwinden sofort,
   damit das Raster nie veraltete Treffer zeigt */
.list-enter-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
</style>
