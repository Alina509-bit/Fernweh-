<script setup lang="ts">
import { onMounted } from "vue";
import DestinationsPage from "./components/DestinationsPage.vue";
import LoginView from "./components/LoginView.vue";
import { useAuth } from "./composables/useAuth";

/**
 * Wurzelkomponente: entscheidet nur, ob Login oder Hauptseite gezeigt wird.
 * Beim Start fragt sie den Server, ob schon eine Session besteht (Cookie).
 * Wechselt der Nutzer, wird DestinationsPage neu aufgebaut (:key) → keine
 * Daten des vorherigen Nutzers bleiben im Speicher.
 */
const { user, checked, restore } = useAuth();
onMounted(restore);
</script>

<template>
  <div v-if="!checked" class="boot" aria-busy="true">
    <span class="spinner-border text-primary" role="status"><span class="visually-hidden">Lädt…</span></span>
  </div>
  <LoginView v-else-if="!user" />
  <DestinationsPage v-else :key="user.id" />
</template>

<style scoped>
.boot {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
</style>
