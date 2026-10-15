<script setup>
defineProps({ visible: Boolean, ready: Boolean, found: Number, total: Number, tab: String })
const emit = defineEmits(["tab"])
const TABS = [{ id: "map", name: "Map" }, { id: "photospheres", name: "Photospheres" }]
</script>

<template>
  <section class="atlas" :class="{ visible, ready }">
    <header class="screen-top">
      <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>Horizon Wayfinder</span>
    </header>
    <div class="panel atlas-card">
      <nav class="atlas-tabs" role="tablist">
        <button v-for="option in TABS" :key="option.id" type="button" role="tab" :class="{ selected: tab === option.id }" :aria-selected="tab === option.id" @click="emit('tab', option.id)">{{ option.name }}</button>
      </nav>
      <div class="atlas-extra" :class="{ open: tab === 'photospheres' }">
        <div>
          <strong>{{ found }} / {{ total }} found</strong>
        </div>
      </div>
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

.atlas-card {
  position: fixed;
  top: clamp(20px, 3.6vh, 34px);
  right: 56px;
  display: grid;
  padding: 4px;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.45s ease;
}

.atlas.ready .atlas-card {
  opacity: 1;
}

.atlas-tabs {
  display: flex;
  gap: 4px;
}

.atlas-tabs button {
  flex: 1;
  padding: 8px 16px;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--muted);
  background: none;
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

.atlas-extra {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}

.atlas-extra.open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.atlas-extra > div {
  min-height: 0;
  overflow: hidden;
}

.atlas-extra strong {
  display: block;
  padding: 12px 12px 8px;
  font-family: var(--font-condensed);
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
    top: 64px;
    left: 20px;
    right: 20px;
  }
}
</style>
