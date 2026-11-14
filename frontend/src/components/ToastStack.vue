<script setup lang="ts">
import { useToasts } from "../composables/useToasts";

const { toasts, dismiss } = useToasts();
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.kind" role="status">
        <i class="bi" :class="t.kind === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'" />
        <span>{{ t.message }}</span>
        <button type="button" class="btn-close btn-close-white btn-sm ms-auto" aria-label="Schließen" @click="dismiss(t.id)" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(440px, calc(100vw - 32px));
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1rem 0.85rem 1.2rem;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-weight: 500;
  box-shadow: 0 16px 40px -12px rgba(17, 19, 24, 0.5);
  &.success i.bi {
    color: var(--lime);
  }
  &.error {
    background: var(--brick);
    border-radius: 1.25rem;
  }
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
