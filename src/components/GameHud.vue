<script setup>
import { computed } from "vue"

const PIXELS_PER_DEGREE = 3
const LABELS = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" }

const props = defineProps({ round: Number, count: Number, score: Number, heading: Number, hidden: Boolean, hard: Boolean })

const marks = []
for (let degrees = -360; degrees <= 720; degrees += 15) {
  const heading = ((degrees % 360) + 360) % 360
  marks.push({ degrees, label: LABELS[heading] || "·", cardinal: heading % 90 === 0, left: `${(degrees + 360) * PIXELS_PER_DEGREE}px` })
}

const strip = computed(() => ({ transform: `translateX(${-(props.heading + 360) * PIXELS_PER_DEGREE}px)` }))
</script>

<template>
  <div class="hud" :class="{ hidden }">
    <div class="stats">
      <div class="stat"><span>Round</span><strong>{{ round }} / {{ count }}</strong></div>
      <div class="stat"><span>Score</span><strong>{{ score.toLocaleString() }}</strong></div>
      <div v-if="hard" class="stat"><span>Mode</span><strong class="hard">Hard</strong></div>
    </div>
    <div class="compass">
      <div class="compass-strip" :style="strip">
        <span v-for="mark in marks" :key="mark.degrees" :class="{ cardinal: mark.cardinal }" :style="{ left: mark.left }">{{ mark.label }}</span>
      </div>
    </div>
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

.compass {
  position: relative;
  width: min(360px, 50vw);
  height: 32px;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  backdrop-filter: blur(6px);
}

.compass-strip {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  white-space: nowrap;
}

.compass-strip span {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  font-weight: 600;
  color: var(--muted);
}

.compass-strip span.cardinal {
  color: var(--text);
}

.compass::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 2px;
  height: 8px;
  background: var(--accent);
  transform: translateX(-50%);
}

@media (hover: none), (max-width: 640px) {
  .stats {
    gap: 12px;
    padding: 6px 10px;
  }

  .compass {
    width: 40vw;
  }
}
</style>
