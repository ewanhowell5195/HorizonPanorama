<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { loadCard } from "../lib/cauldrons.js"

// the card art is 770 x 380; its visible rows run 6 to 297, the score band 110 to 223
const CARD_WIDTH = 770
const CARD_HEIGHT = 380
const VISIBLE_TOP = 6
const VISIBLE_BOTTOM = 297
const DOCK_BOTTOM = 112
// 61 frames at CARD_FRAME_MS in tools/game/build_cauldrons.py
const CARD_MS = 61 * 33
const HOLD_EARLY_MS = 60

const props = defineProps({ card: String, score: Number, distance: String, miss: Boolean, lastRound: Boolean, docked: Boolean, animate: Boolean, viewing: Boolean })
const emit = defineEmits(["next", "view", "back"])
const src = ref(null)
const root = ref(null)
const label = computed(() => props.miss ? props.distance : `${props.distance} away`)
const still = computed(() => `/cauldrons/card-${props.card}-end.avif`)
let objectUrl = null
let holdTimer = 0

function cardHeight() {
  return Math.min(CARD_WIDTH, window.innerWidth * 0.92) * CARD_HEIGHT / CARD_WIDTH
}

function dockedHeight() {
  const scale = Number(getComputedStyle(root.value).getPropertyValue("--dock-scale"))
  return DOCK_BOTTOM + cardHeight() * scale * (VISIBLE_BOTTOM - VISIBLE_TOP) / CARD_HEIGHT
}

function played() {
  if (src.value === objectUrl) {
    holdTimer = setTimeout(() => src.value = still.value, CARD_MS - HOLD_EARLY_MS)
  }
}

onMounted(async () => {
  if (!props.animate) {
    src.value = still.value
    return
  }
  new Image().src = still.value
  try {
    objectUrl = URL.createObjectURL(await loadCard(props.card))
    src.value = objectUrl
  } catch (error) {
    console.warn(error)
    src.value = still.value
  }
})

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
})

defineExpose({ dockedHeight })
</script>

<template>
  <div ref="root" class="reveal" :class="{ docked, animate, reviewing: viewing }">
    <div class="stage">
      <img v-if="src" :src="src" alt="" @load="played">
      <div class="band">
        <strong>{{ score.toLocaleString() }}</strong>
        <span>{{ label }}</span>
      </div>
    </div>
    <div class="actions button-row bright">
      <button class="secondary" type="button" @click="emit(viewing ? 'back' : 'view')"><Transition name="swap-text" mode="out-in"><span :key="viewing">{{ viewing ? "View map" : "View photosphere" }}</span></Transition></button>
      <button type="button" @click="emit('next')">{{ lastRound ? "See results" : "Next round" }}</button>
    </div>
  </div>
</template>

<style scoped>
.reveal {
  --w: min(770px, 92vw);
  --h: calc(var(--w) * 380 / 770);
  --dock-scale: 0.6;
  position: fixed;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.stage {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--h) * 0.1);
  width: var(--w);
  height: var(--h);
  transform: translate(-50%, -50%);
  user-select: none;
  transition: top 0.7s cubic-bezier(0.65, 0, 0.35, 1), transform 0.7s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.3s ease;
}

.reveal.reviewing .stage {
  opacity: 0;
}

.reveal.docked .stage {
  top: calc(100% - 112px - var(--h) * var(--dock-scale) * 0.2816);
  transform: translate(-50%, -50%) scale(var(--dock-scale));
}

.stage::before {
  content: "";
  position: absolute;
  inset: 10% 5% 25%;
  z-index: -1;
  background: black;
  filter: blur(60px);
  opacity: 0.45;
}

.stage img {
  display: block;
  width: 100%;
  height: 100%;
}

.band {
  position: absolute;
  left: 0;
  right: 0;
  top: 28.95%;
  height: 29.74%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: calc(var(--h) * 0.012);
  text-align: center;
}

.band > * {
  pointer-events: auto;
  user-select: text;
}

.reveal.animate .band {
  animation: band-in 0.3s ease 0.85s backwards;
}

.band strong {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: calc(var(--h) * 0.17);
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}

.band span {
  font-size: calc(var(--h) * 0.042);
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(232, 234, 237, 0.8);
}

.actions {
  position: absolute;
  left: 50%;
  bottom: 28px;
  width: min(560px, 92vw);
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 12px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0s linear 0.3s;
}

.actions::before {
  content: "";
  position: absolute;
  inset: -70px;
  z-index: -1;
  background: black;
  filter: blur(100px);
  opacity: 0.5;
  pointer-events: none;
}

.reveal.docked .actions {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
  pointer-events: auto;
  transition: opacity 0.4s ease 0.45s, transform 0.4s ease 0.45s;
}

.actions span {
  display: inline-block;
}

.swap-text-enter-active, .swap-text-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.swap-text-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.swap-text-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 760px) {
  .reveal {
    --dock-scale: 0.85;
  }
}

@keyframes band-in {
  from {
    opacity: 0;
  }
}
</style>
