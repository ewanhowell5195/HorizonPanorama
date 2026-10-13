<script setup>
import { computed, ref, watch } from "vue"
import { MAX_POINTS } from "../lib/game.js"

const MODES = [
  { id: "normal", name: "Normal", detail: "Look around freely" },
  { id: "hard", name: "Hard", detail: "Fixed view, no zoom" }
]

const TITLE = "Panorama"

function between(min, max) {
  return min + Math.random() * (max - min)
}

function scatterLetters() {
  return Array.from(TITLE).map((char, n) => {
    const angle = between(0, Math.PI * 2)
    const distance = between(0.15, 0.6)
    const style = {
      "--spin": `${between(-28, 28).toFixed(1)}deg`,
      "--grow": between(1.4, 2.3).toFixed(2),
      "--from-x": `${(Math.cos(angle) * distance).toFixed(3)}em`,
      "--from-y": `${(Math.sin(angle) * distance).toFixed(3)}em`,
      "--duration": `${Math.round(between(340, 560))}ms`,
      "--delay": `${Math.round(620 + n * 105 + between(-30, 30))}ms`
    }
    return { char, style }
  })
}

const props = defineProps({ visible: Boolean, count: Number, rounds: Number, ready: Boolean, best: Number, last: Number, average: Number, mode: String, seed: String, seedError: String })
const emit = defineEmits(["play", "mode", "seed"])
const seedText = ref(props.seed || "")
const pieces = ref(scatterLetters())

watch(() => props.visible, visible => {
  if (visible) {
    pieces.value = scatterLetters()
  }
})

const countLabel = computed(() => props.count ? `${props.count} locations` : "")
const roundsLabel = computed(() => props.count ? `${props.rounds} rounds` : "No photospheres yet")
const maxLabel = computed(() => props.count ? `Up to ${(props.rounds * MAX_POINTS).toLocaleString()} points` : "Capture some to play")
const bestLabel = computed(() => props.best ? props.best.toLocaleString() : "None yet")
const lastLabel = computed(() => props.last === null || props.last === undefined ? "None yet" : props.last.toLocaleString())
const averageLabel = computed(() => props.average === null || props.average === undefined ? "None yet" : props.average.toLocaleString())

const lookStep = computed(() => props.mode === "hard" ? "One fixed view. No turning, no zooming." : "Drag to turn, scroll to zoom in on the details.")

function play() {
  emit("play")
}

function choose(mode) {
  emit("mode", mode)
}

function playSeed() {
  if (seedText.value.trim()) {
    emit("seed", seedText.value)
  }
}
</script>

<template>
  <section class="home" :class="{ visible }">
    <header class="home-top rise">
      <span class="mark"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.5 21.5 19h-19z" /><path d="M12 9.5 16 16.5H8z" fill="currentColor" stroke="none" /></svg>Photosphere guessing game</span>
      <span class="count">{{ countLabel }}</span>
    </header>
    <div class="home-main">
      <p class="eyebrow rise" style="--i: 1">Guess the location</p>
      <h1 class="title" aria-label="Horizon Panorama"><span class="rise" style="--i: 2">Horizon</span><span class="pieces" aria-hidden="true"><span v-for="(piece, n) in pieces" :key="n" class="piece" :style="piece.style">{{ piece.char }}</span></span></h1>
      <p class="lede rise" style="--i: 3">Each round puts you somewhere in Horizon Forbidden West. Have a look around, then drop a pin on the map where you think you are.</p>
      <div class="modes rise" style="--i: 4" role="radiogroup" aria-label="Mode">
        <button v-for="option in MODES" :key="option.id" class="mode" :class="{ selected: mode === option.id }" type="button" role="radio" :aria-checked="mode === option.id" @click="choose(option.id)"><strong>{{ option.name }}</strong><span>{{ option.detail }}</span></button>
      </div>
      <div class="cta rise" style="--i: 5">
        <button class="play" type="button" :disabled="!ready" @click="play">Play<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
        <div class="cta-meta"><strong>{{ roundsLabel }}</strong><span>{{ maxLabel }}</span></div>
      </div>
      <form class="seed rise" style="--i: 6" @submit.prevent="playSeed">
        <input v-model="seedText" type="text" spellcheck="false" autocomplete="off" placeholder="Paste a seed or link to replay a game" aria-label="Seed">
        <button class="secondary" type="submit" :disabled="!ready || !seedText.trim()">Play seed</button>
        <p v-if="seedError" class="seed-error">{{ seedError }}</p>
      </form>
      <ol class="steps rise" style="--i: 7">
        <li><em>01</em><strong>Look around</strong><span>{{ lookStep }}</span></li>
        <li><em>02</em><strong>Pin the map</strong><span>Hover the map and click where you think you are.</span></li>
        <li><em>03</em><strong>Score</strong><span>Up to 5,000 points a round. Closer scores more.</span></li>
      </ol>
    </div>
    <footer class="home-bottom rise" style="--i: 8">
      <div class="stat-block"><small>Best score</small><strong>{{ bestLabel }}</strong></div>
      <div class="stat-block"><small>Last game</small><strong>{{ lastLabel }}</strong></div>
      <div class="stat-block"><small>Average</small><strong>{{ averageLabel }}</strong></div>
    </footer>
  </section>
</template>

<style scoped>
.home {
  position: fixed;
  inset: 0;
  z-index: 11;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(20px, 3.6vh, 34px) 56px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0s linear 0.5s;
}

.home.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.home.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms + 150ms);
}

.home-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--muted);
}

.mark {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
}

.mark svg {
  color: var(--accent);
}

.home-main {
  align-self: center;
  max-width: 640px;
}

.title {
  margin: clamp(10px, 2vh, 22px) 0 0;
  font-family: "Hunter", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: clamp(54px, min(9.2vw, 12vh), 136px);
  line-height: 0.88;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.title > span {
  display: block;
}

.pieces {
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--accent);
}

.piece {
  display: inline-block;
}

.home.visible .piece {
  animation: slap var(--duration) cubic-bezier(0.2, 1.5, 0.35, 1) var(--delay) both;
}

@keyframes slap {
  from {
    opacity: 0;
    transform: translate(var(--from-x), var(--from-y)) rotate(var(--spin)) scale(var(--grow));
  }

  30% {
    opacity: 1;
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.lede {
  max-width: 470px;
  margin: clamp(14px, 2.6vh, 28px) 0 clamp(14px, 2.4vh, 26px);
  font-size: 17px;
  line-height: 1.6;
  color: rgba(232, 234, 237, 0.84);
}

.modes {
  display: flex;
  gap: 10px;
  margin: 0 0 clamp(14px, 2.4vh, 26px);
}

.mode {
  display: grid;
  gap: 2px;
  min-width: 170px;
  padding: 10px 16px;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--muted);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  border-radius: 0;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.mode strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mode span {
  font-size: 12px;
  font-weight: 400;
}

.mode:hover {
  color: var(--text);
  filter: none;
}

.mode.selected {
  color: var(--text);
  background: rgba(242, 165, 65, 0.12);
  border-color: var(--accent);
}

.mode.selected strong {
  color: var(--accent);
}

.cta {
  display: flex;
  align-items: center;
  gap: 24px;
}

.play {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 17px 30px 17px 34px;
  font-size: 17px;
  letter-spacing: 0.22em;
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}

.play svg {
  transition: transform 0.25s ease;
}

.play:hover:not(:disabled) svg {
  transform: translateX(4px);
}

.cta-meta {
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--muted);
}

.cta-meta strong {
  font-size: 15px;
  color: var(--text);
}

.seed {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 470px;
  margin: clamp(14px, 2.4vh, 22px) 0 0;
}

.seed input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  outline: none;
}

.seed input:focus {
  border-color: var(--accent);
}

.seed input::placeholder {
  color: var(--muted);
}

.seed button {
  padding: 9px 16px;
  font-size: 13px;
  border-radius: 0;
}

.seed-error {
  flex-basis: 100%;
  margin: 0;
  font-size: 13px;
  color: #f28b82;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 640px;
  margin: clamp(22px, 4.5vh, 56px) 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.steps li {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 22px 0 0;
}

.steps li + li {
  padding-left: 22px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.steps em {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-style: normal;
  font-size: 22px;
  color: var(--accent);
}

.steps strong {
  font-size: 15px;
}

.steps span {
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.home-bottom {
  display: flex;
  align-items: flex-end;
  gap: 40px;
}

.stat-block {
  display: grid;
  gap: 4px;
}

.stat-block small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.stat-block strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.04em;
}

@media (max-height: 760px) and (min-width: 761px) {
  .steps {
    display: none;
  }
}

@media (max-width: 760px) {
  .home {
    padding: 22px 20px 24px;
  }

  .home-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .lede {
    margin: 18px 0 18px;
    font-size: 15px;
  }

  .modes {
    margin-bottom: 18px;
  }

  .mode {
    flex: 1;
    min-width: 0;
  }

  .steps, .count {
    display: none;
  }

  .home-bottom {
    gap: 24px;
    margin-top: 24px;
  }
}
</style>
