<script setup lang="ts">
import BaseModal from "./BaseModal.vue";

defineProps<{ open: boolean; title: string; message: string; busy?: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <BaseModal :open="open" size="sm" labelledby="confirm-title" @close="emit('cancel')">
    <div class="p-4 text-center">
      <div class="icon-wrap mx-auto mb-3"><i class="bi bi-trash3" /></div>
      <h2 id="confirm-title" class="h5 font-display mb-2">{{ title }}</h2>
      <p class="text-secondary mb-4">{{ message }}</p>
      <div class="d-flex gap-2 justify-content-center">
        <button type="button" class="btn btn-soft rounded-pill px-4" @click="emit('cancel')">Abbrechen</button>
        <button type="button" class="btn btn-danger rounded-pill px-4" :disabled="busy" @click="emit('confirm')">
          <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
          Löschen
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.icon-wrap {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: #f7e3e3;
  color: var(--brick);
  display: grid;
  place-items: center;
  font-size: 1.4rem;
}
</style>
