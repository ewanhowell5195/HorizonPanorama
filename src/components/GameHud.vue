<script setup>
import HudCompass from "./HudCompass.vue"

defineProps({ round: Number, count: Number, score: Number, heading: Number, hidden: Boolean, hard: Boolean, swapped: Boolean, faded: Boolean })
</script>

<template>
  <div class="hud" :class="{ hidden }">
    <div class="stats">
      <div class="stat"><span>Round</span><strong>{{ round }} / {{ count }}</strong></div>
      <div class="stat"><span>Score</span><strong>{{ score.toLocaleString() }}</strong></div>
      <div v-if="hard" class="stat"><span>Mode</span><strong class="hard">Hard</strong></div>
    </div>
    <Teleport to="#sphere-box" defer :disabled="!swapped">
      <HudCompass :heading="heading" :boxed="swapped" :faded="faded" />
    </Teleport>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  pointer-events: none;
}

.hud.hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.stats {
  display: flex;
  gap: 18px;
  padding: 8px 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  backdrop-filter: blur(6px);
}

.stat span {
  display: block;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.stat .hard {
  color: var(--accent);
}

@media (hover: none), (max-width: 640px) {
  .stats {
    gap: 12px;
    padding: 6px 10px;
  }
}
</style>
