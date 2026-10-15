<script setup>
import { computed, ref, watch } from "vue"
import { readStore, writeStore } from "../lib/game.js"

// covers the 0.4 s .guess and .map size transitions below
const RESIZE_MS = 450

const props = defineProps({ hidden: Boolean, hasGuess: Boolean, swapped: Boolean })
const emit = defineEmits(["guess", "swap"])
const large = ref(readStore("largeMap") === "1")
const resizing = ref(false)
const open = ref(false)
const sizeTitle = computed(() => large.value ? "Shrink map" : "Enlarge map")
const swapTitle = computed(() => props.swapped ? "Swap back: photosphere full screen" : "Swap: map full screen")
const guessLabel = computed(() => props.hasGuess ? "Guess" : "Place your guess")
let resizeTimer = 0

function toggleSize() {
  clearTimeout(resizeTimer)
  resizing.value = true
  large.value = !large.value
  writeStore("largeMap", large.value ? "1" : "")
  resizeTimer = setTimeout(() => resizing.value = false, RESIZE_MS)
}

function guess() {
  emit("guess")
}

watch(() => props.hidden, () => open.value = false)
</script>

<template>
  <div class="guess" :class="{ large, resizing, open, hidden, swapped }">
    <div class="map">
      <slot />
      <div id="sphere-box" class="sphere-box"></div>
      <button class="icon-button swap-toggle" type="button" :title="swapTitle" :aria-label="swapTitle" @click="emit('swap')"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" /></svg></button>
      <button class="icon-button size-toggle" type="button" :title="sizeTitle" @click="toggleSize">
        <svg class="grow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" /></svg>
        <svg class="shrink" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"><path d="M13.5 6.5h-4v-4M9.5 6.5 14 2M2.5 9.5h4v4M6.5 9.5 2 14" /></svg>
      </button>
    </div>
    <div class="actions">
      <button class="secondary map-toggle" type="button" @click="open = !open">{{ swapped ? "View" : "Map" }}</button>
      <button class="submit" type="button" :disabled="!hasGuess" @click="guess">{{ guessLabel }}</button>
    </div>
  </div>
</template>

<style scoped>
.guess {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 320px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.5s;
}

.guess::before {
  content: "";
  position: absolute;
  inset: -70px;
  z-index: -1;
  background: black;
  filter: blur(100px);
  opacity: 0.5;
  pointer-events: none;
}

.guess:hover, .guess.open, .guess.resizing {
  width: min(720px, calc(100vw - 32px));
  transition-delay: 0s;
}

.guess.hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.map {
  --tuck: calc(40px - 8px * sqrt(2));
  position: relative;
  height: calc(220px + var(--tuck));
  margin-bottom: calc(-1 * var(--tuck));
  background: #000;
  clip-path: polygon(0 0, 100% 0, 100% 100%, calc(100% - var(--tuck)) calc(100% - var(--tuck)), 0 calc(100% - var(--tuck)));
  opacity: 0.8;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.5s, opacity 0.4s ease 0.5s;
}

.map::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(var(--border), var(--border)) left top / 100% 1px no-repeat,
    linear-gradient(var(--border), var(--border)) left top / 1px calc(100% - var(--tuck)) no-repeat,
    linear-gradient(var(--border), var(--border)) right top / 1px 100% no-repeat,
    linear-gradient(var(--border), var(--border)) left 0 bottom var(--tuck) / calc(100% - var(--tuck)) 1px no-repeat,
    linear-gradient(to top right, transparent 50%, var(--border) 50%, var(--border) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--tuck) var(--tuck) no-repeat;
}

.guess:hover .map, .guess.open .map, .guess.resizing .map {
  height: calc(min(480px, calc(100vh - 140px)) + var(--tuck));
  opacity: 1;
  transition-delay: 0s;
}

.guess.large:hover, .guess.large.resizing {
  width: min(1280px, calc(100vw - 32px));
}

.guess.large:hover .map, .guess.large.resizing .map {
  height: calc(min(880px, calc(100vh - 110px)) + var(--tuck));
}

.size-toggle, .swap-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  color: var(--text);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.5s;
}

.size-toggle {
  right: 48px;
}

.size-toggle:hover:not(:disabled), .swap-toggle:hover:not(:disabled) {
  color: var(--accent);
  filter: none;
}

.guess:hover .size-toggle, .guess.resizing .size-toggle, .guess:hover .swap-toggle, .guess.resizing .swap-toggle, .guess.open .swap-toggle {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0s;
}

.guess .map :deep(.map-scale) {
  left: 10px;
  bottom: calc(10px + var(--tuck));
}

.map :deep(.map-mode) {
  top: 8px;
  right: 88px;
  bottom: auto;
  left: auto;
}

.map :deep(.map-scale), .map :deep(.map-mode) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.5s;
}

.guess:hover .map :deep(.map-scale), .guess.open .map :deep(.map-scale), .guess.resizing .map :deep(.map-scale), .guess:hover .map :deep(.map-mode), .guess.open .map :deep(.map-mode), .guess.resizing .map :deep(.map-mode) {
  opacity: 1;
  transition-delay: 0s;
}

.guess:hover .map :deep(.map-mode), .guess.open .map :deep(.map-mode), .guess.resizing .map :deep(.map-mode) {
  pointer-events: auto;
}

.map :deep(.map-poi img) {
  opacity: 0;
  transition: opacity 0.15s ease 0.5s;
}

.guess:hover .map :deep(.map-poi img), .guess.open .map :deep(.map-poi img), .guess.resizing .map :deep(.map-poi img) {
  opacity: 1;
  transition-delay: 0s;
}

.size-toggle .shrink, .guess.large .size-toggle .grow {
  display: none;
}

.guess.large .size-toggle .shrink {
  display: block;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
}

.submit {
  padding: 15px 20px;
  font-size: 15px;
  letter-spacing: 0.22em;
  clip-path: polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
  transition: filter 0.2s ease, opacity 0.2s ease;
}

.sphere-box {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  container-type: size;
}

.guess.swapped .sphere-box {
  display: block;
}

.map-toggle {
  display: none;
}

@media (max-width: 560px) {
  .submit {
    padding: 15px 12px;
    font-size: 13px;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
}

@media (hover: none), (max-width: 640px) {
  .guess, .guess:hover {
    left: 16px;
    width: auto;
  }

  .guess .map, .guess:hover .map {
    display: none;
  }

  .guess.open .map {
    display: block;
    height: calc(min(480px, calc(100vh - 140px)) + var(--tuck));
  }

  .map-toggle {
    display: block;
  }

  .size-toggle {
    display: none;
  }

  .map :deep(.map-mode) {
    right: 48px;
  }
}
</style>
