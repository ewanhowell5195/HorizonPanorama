<script setup>
import { computed } from "vue"

const COMPASS_WIDTH = 2048
const CARDINALS = [["N", 0], ["E", 512], ["S", 1024], ["W", 1536]]

const props = defineProps({ heading: Number, boxed: Boolean, faded: Boolean })

const position = computed(() => props.heading * COMPASS_WIDTH / 360)
const ticks = computed(() => ({ "--x": COMPASS_WIDTH - position.value }))
const cardinals = computed(() => CARDINALS.map(([text, offset]) => {
  const x = ((offset - position.value + COMPASS_WIDTH / 2) % COMPASS_WIDTH + COMPASS_WIDTH) % COMPASS_WIDTH - COMPASS_WIDTH / 2
  return { text, style: { "--x": x } }
}))
</script>

<template>
  <div class="compass" :class="{ boxed, faded }">
    <div class="compass-shadow"></div>
    <div class="compass-marks">
      <div class="compass-bar">
        <div class="compass-ticks" :style="ticks"></div>
        <span v-for="cardinal in cardinals" :key="cardinal.text" :style="cardinal.style">{{ cardinal.text }}</span>
      </div>
      <div class="compass-line"></div>
    </div>
  </div>
</template>

<style scoped>
.compass {
  --u: calc(100vh / 1080);
  position: absolute;
  top: calc(28.5px - 10.5 * var(--u));
  left: 50%;
  width: calc(630 * var(--u));
  height: calc(21 * var(--u));
  transform: translateX(-50%);
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.compass.faded {
  opacity: 0;
}

.compass.boxed {
  --u: min(100vh / 1080, 65cqw / 630);
  z-index: 1;
  top: calc(10px + 7 * var(--u));
  width: calc(630 * var(--u));
}

.compass-bar {
  position: absolute;
  inset: 0;
  overflow: hidden;
  mask-image: url("/hud/compass-mask.png");
  mask-size: 100% 100%;
}

.compass-ticks {
  position: absolute;
  top: 0;
  left: calc(50% - 2048 * var(--u));
  width: calc(4096 * var(--u));
  height: 100%;
  background: url("/hud/compass-strip.png") repeat-x;
  background-size: calc(2048 * var(--u)) 100%;
  background-position-x: calc(var(--x) * var(--u));
}

.compass-bar span {
  position: absolute;
  top: 50%;
  left: calc(50% + var(--x) * var(--u));
  transform: translate(-50%, -50%);
  font-weight: 300;
  font-size: calc(16.85 * var(--u));
  line-height: 1;
  color: #fff;
}

.compass-shadow, .compass-line {
  position: absolute;
  top: calc(-7 * var(--u));
  left: calc(-3 * var(--u));
  right: calc(-3 * var(--u));
  height: calc(45 * var(--u));
  background: url("/hud/compass-shadow.avif") no-repeat;
  background-size: 100% 100%;
}

.compass-line {
  background-image: url("/hud/compass-line.avif");
}

.compass-marks {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 calc(1.5 * var(--u)) rgba(0, 0, 0, 0.6)) drop-shadow(0 0 calc(1.5 * var(--u)) rgba(0, 0, 0, 0.6));
}

@media (max-width: 1100px), (max-aspect-ratio: 4/3) {
  .compass {
    top: 76px;
    width: min(630 * var(--u), 100%);
  }
}

@media (hover: none), (max-width: 640px) {
  .compass {
    top: 64px;
  }
}
</style>
