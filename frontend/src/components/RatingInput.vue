<script setup lang="ts">
import { ref } from "vue";

/** Sternebewertung 1–5. Erneuter Klick auf den aktiven Stern entfernt die Bewertung. */
const rating = defineModel<number | null>({ required: true });
const props = withDefaults(defineProps<{ disabled?: boolean; size?: "md" | "lg" }>(), {
  disabled: false,
  size: "md",
});

const hover = ref<number | null>(null);

function pick(n: number) {
  if (props.disabled) return;
  rating.value = rating.value === n ? null : n;
}
</script>

<template>
  <div
    class="rating-input"
    :class="[`size-${size}`, { disabled }]"
    role="radiogroup"
    aria-label="Bewertung"
    @mouseleave="hover = null"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="rating === n"
      :aria-label="`${n} von 5 Sternen`"
      :disabled="disabled"
      class="star"
      :class="{ on: (hover ?? rating ?? 0) >= n }"
      @mouseenter="!disabled && (hover = n)"
      @click="pick(n)"
    >
      <i class="bi" :class="(hover ?? rating ?? 0) >= n ? 'bi-star-fill' : 'bi-star'" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.rating-input {
  display: inline-flex;
  gap: 2px;
}
.star {
  border: 0;
  background: transparent;
  padding: 0.15rem;
  font-size: 1.4rem;
  color: #c3c5d0;
  line-height: 1;
  transition: transform 0.12s;
  &.on {
    color: #f5b301;
  }
  &:not(:disabled):hover {
    transform: scale(1.15);
  }
}
.size-lg .star {
  font-size: 1.8rem;
}
.disabled .star {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
