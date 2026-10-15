<script setup>
defineProps({ visible: Boolean, ready: Boolean, found: Number, total: Number })
const emit = defineEmits(["back"])
</script>

<template>
  <section class="atlas" :class="{ visible, ready }">
    <header class="atlas-top">
      <a class="mark" href="/" title="Main menu" @click.exact.prevent="emit('back')"><i class="mark-emblem"></i>Horizon Wayfinder</a>
    </header>
    <div class="atlas-card">
      <p class="eyebrow">Map</p>
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
