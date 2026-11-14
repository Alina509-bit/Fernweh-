<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

/**
 * Wiederverwendbares Modal auf Basis der Bootstrap-CSS-Klassen.
 * Bewusst ohne Bootstrap-JavaScript: Vue steuert den Zustand (open) selbst,
 * so gibt es nur eine Quelle der Wahrheit.
 */
const props = withDefaults(
  defineProps<{ open: boolean; size?: "sm" | "lg" | "xl"; labelledby?: string }>(),
  { size: "lg" },
);
const emit = defineEmits<{ close: [] }>();

const dialog = ref<HTMLElement | null>(null);
let lastFocus: HTMLElement | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocus = document.activeElement as HTMLElement | null;
      document.body.classList.add("modal-open");
      document.addEventListener("keydown", onKey);
      await nextTick();
      dialog.value?.focus();
    } else {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      lastFocus?.focus?.();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-root">
        <div class="modal-backdrop show" @click="emit('close')" />
        <div
          class="modal d-block"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledby"
          @click.self="emit('close')"
        >
          <div
            ref="dialog"
            class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            :class="`modal-${size}`"
            tabindex="-1"
          >
            <div class="modal-content">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Eigener Stacking-Context: ein später geöffnetes Modal liegt komplett über dem vorherigen */
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 1050;
}
.modal-backdrop {
  --bs-backdrop-opacity: 0.55;
  backdrop-filter: blur(4px);
}
.modal-dialog:focus {
  outline: none;
}
.modal-content {
  border: 0;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(17, 19, 24, 0.3);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-dialog,
.modal-leave-active .modal-dialog {
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-dialog {
  transform: translateY(24px) scale(0.97);
}
</style>
