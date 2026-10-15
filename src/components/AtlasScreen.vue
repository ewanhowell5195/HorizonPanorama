<script setup>
defineProps({ visible: Boolean, ready: Boolean, found: Number, total: Number, tab: String })
const emit = defineEmits(["tab"])
const TABS = [{ id: "map", name: "Map" }, { id: "photospheres", name: "Photospheres" }]
</script>

<template>
  <section class="atlas" :class="{ visible, ready }">
    <header class="atlas-top">
      <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>Horizon Wayfinder</span>
    </header>
    <nav class="atlas-tabs" role="tablist">
      <button v-for="option in TABS" :key="option.id" type="button" role="tab" :class="{ selected: tab === option.id }" :aria-selected="tab === option.id" @click="emit('tab', option.id)">{{ option.name }}</button>
    </nav>
    <div class="atlas-card" :class="{ hidden: tab !== 'photospheres' }">
      <p class="eyebrow">Photospheres</p>
      <strong>{{ found }} / {{ total }} found</strong>
    </div>
  </section>
</template>

<style scoped>
.atlas {
  position: fixed;
  inset: 0;
  z-index: 6;
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: start;
  gap: 18px;
  padding: clamp(20px, 3.6vh, 34px) 56px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.45s ease, visibility 0s linear 0.45s;
}

.atlas.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.45s ease;
}

.atlas-top {
  display: flex;
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.mark {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  pointer-events: auto;
}

.atlas-card {
  position: fixed;
  top: clamp(20px, 3.6vh, 34px);
  right: 56px;
  display: grid;
  gap: 6px;
  padding: 14px 20px 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity 0.45s ease;
}

.atlas.ready .atlas-card {
  opacity: 1;
}

.atlas.ready .atlas-card.hidden {
  opacity: 0;
}

.atlas-tabs {
  position: fixed;
  top: clamp(14px, 2.8vh, 26px);
  left: 50%;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  translate: -50% 0;
  pointer-events: auto;
}

.atlas-tabs button {
  padding: 8px 16px;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--muted);
  background: none;
  border-radius: 7px;
  transition: color 0.2s ease, background 0.2s ease;
}

.atlas-tabs button:hover {
  color: var(--text);
  filter: none;
}

.atlas-tabs button.selected {
  color: var(--text);
  background: rgba(255, 255, 255, 0.12);
}

.atlas-card .eyebrow {
  margin: 0;
}

.atlas-card strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 24px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .atlas {
    padding: 22px 20px 24px;
  }

  .atlas-card {
    top: 22px;
    right: 20px;
  }
}
</style>
