<script setup lang="ts">
const emit = defineEmits<{ create: [] }>();
</script>

<template>
  <footer class="footer-wrap">
    <div class="footer">
      <svg class="loop" viewBox="0 0 600 300" aria-hidden="true">
        <path
          d="M-10 250 C 120 40, 260 40, 300 150 S 470 280, 610 60"
          fill="none"
          stroke="currentColor"
          stroke-width="10"
          stroke-linecap="round"
        />
      </svg>
      <p class="claim font-display">Mehr entdecken.<br />Tiefer reisen.</p>
      <button class="btn btn-ink rounded-pill btn-lg px-4" @click="emit('create')">
        Nächstes Ziel festhalten <i class="bi bi-arrow-right ms-1" />
      </button>
      <div class="meta">
        <span class="font-display fw-bold">fernweh</span>
        <span>Prüfungsprojekt T4 · DHBW Mosbach · Vue 3 + Deno/Hono</span>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer-wrap {
  padding: 16px;
}
.footer {
  position: relative;
  overflow: hidden;
  background: var(--lime);
  border-radius: 2.5rem;
  padding: clamp(2rem, 6vw, 4.5rem);
  isolation: isolate;
}
.loop {
  position: absolute;
  right: -40px;
  top: -20px;
  width: min(60%, 640px);
  color: var(--sapphire);
  z-index: -1;
}
.claim {
  font-size: clamp(2.2rem, 7vw, 5.5rem);
  line-height: 0.92;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.045em;
  margin-bottom: 2rem;
  color: var(--ink);
}
.meta {
  margin-top: 3rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
  border-top: 1px solid rgba(17, 19, 24, 0.2);
  padding-top: 1.25rem;
}
</style>
