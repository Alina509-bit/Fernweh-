<script setup lang="ts">
import heroImage from "../assets/hero.webp";

defineProps<{
  visited: number;
  countries: number;
  planned: number;
}>();
const emit = defineEmits<{ create: [] }>();
</script>

<template>
  <header class="hero-wrap" id="top">
    <div class="hero" :style="{ backgroundImage: `url(${heroImage})` }">
      <!-- Navigation (schwebt über dem Cover) -->
      <nav class="hero-nav" aria-label="Hauptnavigation">
        <a href="#top" class="logo font-display" aria-label="Fernweh – Startseite">
          fernweh<span class="logo-dot" />
        </a>
        <ul class="nav-links list-unstyled d-none d-md-flex mb-0">
          <li><a href="#ueberblick">Überblick</a></li>
          <li><a href="#kalender">Kalender</a></li>
          <li><a href="#reiseziele">Reiseziele</a></li>
        </ul>
        <button class="btn btn-ink rounded-pill btn-sm px-3" @click="emit('create')">
          <i class="bi bi-plus-lg" /> <span class="d-none d-sm-inline">Neues Ziel</span>
        </button>
      </nav>

      <div class="hero-meta d-none d-md-flex">
        <span>Reisen &amp;<br />Abenteuer<br />Reiseplaner</span>
        <span>2026</span>
      </div>

      <h1 class="hero-title font-display">Fernweh</h1>

      <!-- Dekorative Linie im Locally-Stil -->
      <svg class="swoosh" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M-20 60 C 200 40, 380 330, 640 230 S 980 20, 1220 120"
          fill="none"
          stroke="currentColor"
          stroke-width="7"
          stroke-linecap="round"
        />
      </svg>

      <div class="hero-bottom">
        <div class="hero-copy">
          <p class="tagline font-display">
            Sammle Orte,<br /><span class="hl">die dich rufen.</span>
          </p>
          <p class="sub">
            Halte Wunschziele fest, plane deine nächsten Reisen und bewerte, was du erlebt hast –
            alles an einem Ort.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-lime rounded-pill btn-lg px-4" @click="emit('create')">
              Reiseziel hinzufügen <i class="bi bi-arrow-right ms-1" />
            </button>
            <a href="#reiseziele" class="btn btn-glass rounded-pill btn-lg px-4">Meine Liste</a>
          </div>
        </div>

        <dl class="hero-stats">
          <div class="stat">
            <dt>Besucht</dt>
            <dd class="font-display">{{ visited }}</dd>
          </div>
          <div class="stat">
            <dt>Länder</dt>
            <dd class="font-display">{{ countries }}</dd>
          </div>
          <div class="stat stat-lime">
            <dt>Geplant</dt>
            <dd class="font-display">{{ planned }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.hero-wrap {
  padding: 16px;
}
.hero {
  position: relative;
  min-height: min(94vh, 900px);
  border-radius: 2.5rem;
  overflow: hidden;
  background-size: cover;
  background-position: center 70%;
  background-color: #dfe2e6;
  display: flex;
  flex-direction: column;
  isolation: isolate;

  // Dunkler Verlauf unten für Lesbarkeit über dem Wald
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0) 45%,
      rgba(17, 19, 24, 0.15) 60%,
      rgba(17, 19, 24, 0.78) 100%
    );
    z-index: -1;
  }
}

.hero-nav {
  margin: 20px 20px 0;
  padding: 8px 8px 8px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 3;
}
.logo {
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--ink);
  text-decoration: none;
  letter-spacing: -0.03em;
  display: inline-flex;
  align-items: flex-end;
}
.logo-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--lime);
  border: 2px solid var(--ink);
  border-radius: 50%;
  margin-left: 2px;
  margin-bottom: 0.3rem;
}
.nav-links {
  gap: 2rem;
  a {
    color: var(--ink);
    text-decoration: none;
    font-weight: 500;
    &:hover {
      color: var(--sapphire);
    }
  }
}

.hero-meta {
  justify-content: space-between;
  padding: 2rem 2.5rem 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--sapphire);
  line-height: 1.2;
}

.hero-title {
  font-size: clamp(2.6rem, 12.5vw, 13rem);
  line-height: 0.85;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.045em;
  color: var(--sapphire);
  text-align: center;
  margin: 0.5rem 0 0;
  padding: 0 1rem;
}

.swoosh {
  position: absolute;
  left: 0;
  right: 0;
  top: 34%;
  width: 100%;
  height: 30%;
  color: var(--lime);
  z-index: 0;
  opacity: 0.95;
  pointer-events: none;
}

.hero-bottom {
  margin-top: auto;
  padding: 2.5rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  color: #fff;
  position: relative;
  z-index: 2;
}
.tagline {
  font-size: clamp(1.8rem, 3.6vw, 3rem);
  line-height: 1.05;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
  .hl {
    color: var(--lime);
  }
}
.sub {
  max-width: 30rem;
  font-size: 1.05rem;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}
.btn-glass {
  --bs-btn-color: #fff;
  --bs-btn-bg: rgba(255, 255, 255, 0.18);
  --bs-btn-border-color: rgba(255, 255, 255, 0.45);
  --bs-btn-hover-bg: rgba(255, 255, 255, 0.3);
  --bs-btn-hover-color: #fff;
  --bs-btn-hover-border-color: #fff;
  backdrop-filter: blur(10px);
}

.hero-stats {
  display: flex;
  gap: 0.75rem;
  margin: 0;
}
.stat {
  min-width: 7.5rem;
  padding: 1rem 1.25rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  dt {
    font-weight: 500;
    font-size: 0.85rem;
    opacity: 0.85;
  }
  dd {
    margin: 0;
    font-size: 2.4rem;
    font-weight: 600;
    line-height: 1.1;
  }
}
.stat-lime {
  background: var(--lime);
  color: var(--ink);
  border-color: var(--lime);
}

@media (max-width: 575.98px) {
  .hero-wrap {
    padding: 10px;
  }
  .hero {
    border-radius: 1.75rem;
  }
  .hero-nav {
    margin: 12px 12px 0;
  }
  .hero-title {
    margin-top: 2rem;
  }
  .swoosh {
    top: 20%;
    height: 16%;
  }
  .hero-bottom {
    padding: 1.5rem;
  }
  .hero-stats {
    width: 100%;
  }
  .stat {
    flex: 1;
    min-width: 0;
    padding: 0.75rem 1rem;
    dd {
      font-size: 1.8rem;
    }
  }
}
</style>
