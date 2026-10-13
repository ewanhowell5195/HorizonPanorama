<script setup>
import { onMounted, ref, watch } from "vue"
import { SLIDE_MS, createBackdrop } from "../lib/backdrop.js"

const props = defineProps({ active: Boolean, timer: Boolean })
const canvas = ref(null)
const game = ref("")
const label = ref("Screenshot")
const slide = ref(0)
const cycling = ref(false)
const timerStyle = { "--slide-ms": `${SLIDE_MS}ms` }
let mounted
const ready = new Promise(resolve => mounted = resolve).then(() => createBackdrop(canvas.value, {
  onSlide(entry) {
    game.value = entry.game
    label.value = entry.label || "Screenshot"
    slide.value++
  }
})).then(backdrop => {
  backdrop.setActive(props.active)
  return backdrop
})

onMounted(() => mounted())

watch(() => props.active, active => ready.then(backdrop => backdrop.setActive(active)))

defineExpose({
  ready,
  next: () => ready.then(backdrop => backdrop.next()),
  useMaps: (game, title) => ready.then(backdrop => backdrop.useMaps(game, title)),
  useScreenshots: () => ready.then(backdrop => backdrop.useScreenshots()),
  cycle(on) {
    cycling.value = on
    return ready.then(backdrop => backdrop.cycle(on))
  },
  preload: count => ready.then(backdrop => backdrop.preload(count))
})
</script>

<template>
  <div class="backdrop" :class="{ shown: active }">
    <canvas ref="canvas"></canvas>
    <div class="shade"></div>
    <div class="credit">
      <small>{{ label }}</small>
      <span>{{ game }}</span>
      <div :key="slide" class="timer" :class="{ running: cycling, hidden: !timer }" :style="timerStyle"></div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  background: var(--bg);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.6s ease, visibility 0s linear 0.6s;
}

.backdrop.shown {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.6s ease;
}

canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(7, 9, 12, 0.9), rgba(7, 9, 12, 0) 34%), linear-gradient(to bottom, rgba(7, 9, 12, 0.6), rgba(7, 9, 12, 0) 20%);
}

.credit {
  position: absolute;
  right: 40px;
  bottom: 34px;
  display: grid;
  justify-items: end;
  gap: 6px;
  text-align: right;
}

.credit small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.credit span {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.timer {
  position: relative;
  width: 140px;
  height: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}

.timer.hidden {
  visibility: hidden;
}

.timer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
}

.timer.running::after {
  animation: timer var(--slide-ms) linear forwards;
}

@keyframes timer {
  to {
    transform: scaleX(1);
  }
}

@media (max-width: 760px) {
  .credit {
    top: 64px;
    right: 20px;
    bottom: auto;
  }

  .timer {
    display: none;
  }
}
</style>
