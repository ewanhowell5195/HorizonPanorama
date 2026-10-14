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
      <button class="swap-toggle" type="button" :title="swapTitle" :aria-label="swapTitle" @click="emit('swap')"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" /></svg></button>
      <button class="size-toggle" type="button" :title="sizeTitle" @click="toggleSize">
        <svg class="grow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" /></svg>
        <svg class="shrink" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 6.5h-4v-4M9.5 6.5 14 2M2.5 9.5h4v4M6.5 9.5 2 14" /></svg>
      </button>
    </div>
    <div class="actions">
      <button class="secondary map-toggle" type="button" @click="open = !open">{{ swapped ? "View" : "Map" }}</button>
      <button type="button" :disabled="!hasGuess" @click="guess">{{ guessLabel }}</button>
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
  position: relative;
  height: 220px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--border);
  border-radius: 10px;
  opacity: 0.8;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.5s, opacity 0.4s ease 0.5s;
}

.guess:hover .map, .guess.open .map, .guess.resizing .map {
  height: min(480px, calc(100vh - 140px));
  opacity: 1;
  transition-delay: 0s;
}

.guess.large:hover, .guess.large.resizing {
  width: min(1280px, calc(100vw - 32px));
}

.guess.large:hover .map, .guess.large.resizing .map {
  height: min(880px, calc(100vh - 110px));
}

.size-toggle, .swap-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.5s;
}

.swap-toggle {
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

.actions button:disabled {
  color: rgba(17, 17, 17, 0.6);
  background: color-mix(in srgb, var(--accent) 55%, #14161a);
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
    height: min(480px, calc(100vh - 140px));
  }

  .map-toggle {
    display: block;
  }

  .size-toggle {
    display: none;
  }
}
</style>
