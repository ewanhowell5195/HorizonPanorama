<script setup>
import { computed } from "vue"

const RING = 2 * Math.PI * 28

const props = defineProps({ visible: Boolean, number: Number, count: Number, progress: Number, label: String, tip: String, hard: Boolean, countdown: Number, steps: Number, waiting: Boolean })

const bar = computed(() => ({ transform: `scaleX(${props.progress})` }))
const ring = computed(() => ({ strokeDasharray: RING, strokeDashoffset: RING * (1 - Math.max(props.countdown, 0) / props.steps) }))
const digit = computed(() => props.waiting || props.countdown <= 0 ? "" : props.countdown)
</script>

<template>
  <section class="round-intro" :class="{ visible }">
    <p class="eyebrow rise">Round<span v-if="hard" class="hard">Hard</span></p>
    <div class="number rise" style="--i: 1"><span>{{ number }}</span><small>/ {{ count }}</small></div>
    <div class="start rise" style="--i: 2">
      <div class="countdown" :class="{ waiting }">
        <span :key="`${number}-${countdown}`" class="pulse"></span>
        <svg :key="number" viewBox="0 0 64 64" width="64" height="64">
          <circle class="track" cx="32" cy="32" r="28" />
          <circle class="sweep" cx="32" cy="32" r="28" :style="waiting ? null : ring" />
        </svg>
        <span :key="`${number}-${countdown}`" class="digit">{{ digit }}</span>
      </div>
      <div class="load">
        <strong>{{ waiting ? "Almost there" : "Starting in" }}</strong>
        <span>{{ label }}</span>
        <div class="bar"><i :style="bar"></i></div>
      </div>
    </div>
    <p class="tip rise" style="--i: 3"><b>Tip</b><span>{{ tip }}</span></p>
  </section>
</template>

<style scoped>
.round-intro {
  position: fixed;
  inset: 0;
  z-index: 11;
  display: grid;
  align-content: center;
  padding: 56px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0s linear 0.5s;
}

.round-intro.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.round-intro.visible .rise {
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 80ms);
}

.hard {
  padding: 2px 8px;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #111;
  background: var(--accent);
}

.number {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 18px 0 0;
  font-family: "Hunter", "Oita Norm", sans-serif;
  font-size: clamp(110px, min(20vw, 24vh), 240px);
  line-height: 0.8;
}

.number small {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-size: 0.24em;
  color: var(--muted);
}

.start {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 40px 0 0;
}

.countdown {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  flex: none;
}

.countdown svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.14);
  stroke-width: 3;
}

.sweep {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.45s cubic-bezier(0.3, 0, 0.2, 1);
}

.waiting .sweep {
  stroke-dashoffset: 0;
  stroke-dasharray: 40 136;
  transform-origin: 32px 32px;
  transition: none;
  animation: spin 0.9s linear infinite;
}

.pulse {
  position: absolute;
  inset: 2px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: pulse 0.7s ease-out;
}

.waiting .pulse {
  display: none;
}

.digit {
  font-family: "Hunter", "Oita Norm", sans-serif;
  font-size: 30px;
  line-height: 1;
  animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes pulse {
  from {
    opacity: 0.6;
    transform: scale(0.92);
  }

  to {
    opacity: 0;
    transform: scale(1.45);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(1.5);
  }
}

.load {
  display: grid;
  gap: 6px;
  width: min(280px, 100%);
}

.load strong {
  font-size: 15px;
  letter-spacing: 0.04em;
}

.load span {
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.load .bar {
  height: 3px;
  margin: 4px 0 0;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.16);
}

.load .bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: left;
  transition: transform 0.2s linear;
}

.tip {
  max-width: 420px;
  margin: 28px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: rgba(232, 234, 237, 0.8);
}

.tip b {
  margin-right: 10px;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
}

@media (max-width: 760px) {
  .round-intro {
    align-content: end;
    padding: 28px 20px 48px;
  }
}
</style>
