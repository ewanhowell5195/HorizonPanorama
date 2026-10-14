<script setup>
import { computed } from "vue"
import { cauldronFor } from "../lib/cauldrons.js"
import HudCompass from "./HudCompass.vue"

const props = defineProps({ round: Number, count: Number, score: Number, heading: Number, hidden: Boolean, mode: String, compass: Boolean, swapped: Boolean, faded: Boolean })

const emblem = computed(() => `/cauldrons/round-${cauldronFor(props.round)}.png`)
</script>

<template>
  <div class="hud" :class="{ hidden }">
    <div class="stats">
      <img class="emblem" :src="emblem" alt="">
      <div class="stat"><span>Round</span><strong>{{ round }} / {{ count }}</strong></div>
      <div class="stat"><span>Score</span><strong>{{ score.toLocaleString() }}</strong></div>
      <div v-if="mode !== 'normal'" class="stat"><span>Mode</span><strong class="mode">{{ mode === "hard" ? "Hard" : "Custom" }}</strong></div>
    </div>
    <Teleport to="#sphere-box" defer :disabled="!swapped">
      <HudCompass v-if="compass" :heading="heading" :boxed="swapped" :faded="faded" />
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

.emblem {
  align-self: center;
  height: 30px;
  margin-right: -4px;
}

.stat .mode {
  color: var(--accent);
}

@media (hover: none), (max-width: 640px) {
  .stats {
    gap: 12px;
    padding: 6px 10px;
  }
}
</style>
