<script setup>
import { computed, ref, watch } from "vue"
import { MAX_POINTS } from "../lib/game.js"
import { LOCATIONS, RULES } from "../lib/rules.js"

const GAMES = [
  { id: "both", name: "Both games" },
  { id: "hzd", name: "Zero Dawn" },
  { id: "hfw", name: "Forbidden West" }
]
const MODES = [
  { id: "normal", name: "Normal", detail: "Look around freely" },
  { id: "hard", name: "Hard", detail: "Fixed view, no zoom" },
  { id: "custom", name: "Custom", detail: "Choose what you get" }
]

const props = defineProps({ visible: Boolean, ready: Boolean, counts: Object, locationCounts: Object, available: Number, rounds: Number, games: String, mode: String, customRules: Object, best: Number, last: Number, average: Number, seed: String, seedError: String })
const emit = defineEmits(["start", "back", "games", "mode", "rule", "seed"])
const seedText = ref(props.seed || "")

watch(() => props.seed, value => seedText.value = value || "")

const custom = computed(() => props.mode === "custom")
const count = computed(() => props.available || 0)
const roundsLabel = computed(() => count.value ? `${props.rounds} rounds` : "No photospheres yet")
const maxLabel = computed(() => count.value ? `Up to ${(props.rounds * MAX_POINTS).toLocaleString()} points` : "Capture some to play")
const bestLabel = computed(() => props.best ? props.best.toLocaleString() : "None yet")
const lastLabel = computed(() => props.last === null || props.last === undefined ? "None yet" : props.last.toLocaleString())
const averageLabel = computed(() => props.average === null || props.average === undefined ? "None yet" : props.average.toLocaleString())

function locationCount(id) {
  const value = props.locationCounts?.[id] || 0
  return `${value} location${value === 1 ? "" : "s"}`
}

function locations(id) {
  const value = props.counts?.[id] || 0
  return `${value} location${value === 1 ? "" : "s"}`
}

function playSeed() {
  if (seedText.value.trim()) {
    emit("seed", seedText.value)
  }
}
</script>

<template>
  <section class="setup" :class="{ visible }">
    <header class="setup-top rise">
      <span class="mark"><i class="mark-emblem"></i>Photosphere guessing game</span>
      <button class="back" type="button" @click="emit('back')">Main menu</button>
    </header>
    <div class="setup-main">
      <p class="eyebrow rise" style="--i: 1">New game</p>
      <h1 class="title rise" style="--i: 2"><span>Game</span><span class="outline">Setup</span></h1>
      <div class="rise" style="--i: 3">
        <div class="collapse" :class="{ open: !custom }" :inert="custom">
          <div class="collapse-inner">
            <div class="group">
              <small>Game</small>
              <div class="options" role="radiogroup" aria-label="Game">
                <button v-for="option in GAMES" :key="option.id" class="option" :class="{ selected: games === option.id }" type="button" role="radio" :aria-checked="games === option.id" @click="emit('games', option.id)"><strong>{{ option.name }}</strong><span>{{ locations(option.id) }}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="group rise" style="--i: 4">
        <small>Mode</small>
        <div class="options" role="radiogroup" aria-label="Mode">
          <button v-for="option in MODES" :key="option.id" class="option" :class="{ selected: mode === option.id }" type="button" role="radio" :aria-checked="mode === option.id" @click="emit('mode', option.id)"><strong>{{ option.name }}</strong><span>{{ option.detail }}</span></button>
        </div>
      </div>
      <div class="rise" style="--i: 4">
        <div class="collapse" :class="{ open: custom }" :inert="!custom">
          <div class="collapse-inner">
            <div class="group">
              <small>Locations</small>
              <div class="rules">
                <button v-for="location in LOCATIONS" :key="location.id" class="rule" :class="{ on: customRules[location.id] }" type="button" role="switch" :aria-checked="customRules[location.id]" @click="emit('rule', location.id, !customRules[location.id])"><span class="switch"></span><strong>{{ location.name }}</strong><span>{{ locationCount(location.id) }}</span></button>
              </div>
            </div>
            <div class="group">
              <small>Custom rules</small>
              <div class="rules">
                <button v-for="rule in RULES" :key="rule.id" class="rule" :class="{ on: customRules[rule.id] }" type="button" role="switch" :aria-checked="customRules[rule.id]" @click="emit('rule', rule.id, !customRules[rule.id])"><span class="switch"></span><strong>{{ rule.name }}</strong><span>{{ rule.detail }}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cta rise" style="--i: 5">
        <button class="play" type="button" :disabled="!ready || !count" @click="emit('start')">Start<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
        <div class="cta-meta"><strong>{{ roundsLabel }}</strong><span>{{ maxLabel }}</span></div>
      </div>
      <div class="rise" style="--i: 6">
        <div class="collapse" :class="{ open: custom }" :inert="!custom">
          <div class="collapse-inner">
            <p class="unscored">Custom games are not scored, but you can still share them.</p>
          </div>
        </div>
        <div class="collapse" :class="{ open: !custom }" :inert="custom">
          <div class="collapse-inner">
            <div class="stats">
              <div class="stat-block"><small>Best score</small><strong>{{ bestLabel }}</strong></div>
              <div class="stat-block"><small>Last game</small><strong>{{ lastLabel }}</strong></div>
              <div class="stat-block"><small>Average</small><strong>{{ averageLabel }}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <form class="seed rise" style="--i: 7" @submit.prevent="playSeed">
        <input v-model="seedText" type="text" spellcheck="false" autocomplete="off" placeholder="Paste a seed or link to replay a game" aria-label="Seed">
        <button class="secondary" type="submit" :disabled="!ready || !seedText.trim()">Play seed</button>
        <p v-if="seedError" class="seed-error">{{ seedError }}</p>
      </form>
    </div>
  </section>
</template>

<style scoped>
.setup {
  position: fixed;
  inset: 0;
  z-index: 11;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: clamp(20px, 3.6vh, 34px) 56px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0s linear 0.5s;
}

.setup.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.setup.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms + 150ms);
}

.setup-top {
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

.back {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  border-radius: 0;
}

.back:hover {
  border-color: var(--accent);
  filter: none;
}

.setup-main {
  align-self: center;
  max-width: 680px;
}

.title {
  margin: clamp(10px, 2vh, 22px) 0 clamp(18px, 3.4vh, 36px);
  font-family: "Hunter", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: clamp(48px, min(7.6vw, 10vh), 116px);
  line-height: 0.88;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.title span {
  display: block;
}

.title .outline {
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--accent);
}

.group {
  display: grid;
  gap: 8px;
  margin: 0 0 clamp(14px, 2.4vh, 24px);
}

.group > small, .stat-block small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.option {
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

.option strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.option span {
  font-size: 12px;
  font-weight: 400;
}

.option:hover {
  color: var(--text);
  filter: none;
}

.option.selected {
  color: var(--text);
  background: rgba(242, 165, 65, 0.12);
  border-color: var(--accent);
}

.option.selected strong {
  color: var(--accent);
}

.collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}

.collapse.open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.collapse-inner {
  min-height: 0;
  overflow: hidden;
}

.rules {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-width: 640px;
}

.rule {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 10px;
  padding: 8px 12px;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--muted);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  border-radius: 0;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.rule:hover {
  color: var(--text);
  filter: none;
}

.rule.on {
  color: var(--text);
  border-color: rgba(242, 165, 65, 0.6);
}

.rule .switch {
  grid-row: span 2;
  position: relative;
  width: 26px;
  height: 14px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  transition: background 0.2s ease;
}

.rule .switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  background: var(--muted);
  border-radius: 50%;
  transition: transform 0.2s ease, background 0.2s ease;
}

.rule.on .switch {
  background: rgba(242, 165, 65, 0.35);
}

.rule.on .switch::after {
  background: var(--accent);
  transform: translateX(12px);
}

.rule strong {
  font-size: 13px;
  font-weight: 600;
}

.rule > span:last-child {
  font-size: 11px;
  font-weight: 400;
}

.unscored {
  margin: clamp(18px, 3.2vh, 34px) 0 0;
  font-size: 13px;
  color: var(--muted);
}

.cta {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: clamp(4px, 1vh, 10px);
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

.stats {
  display: flex;
  gap: 40px;
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

.stat-block {
  display: grid;
  gap: 4px;
}

.stat-block strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.04em;
}

.seed {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 470px;
  margin: clamp(18px, 3.2vh, 34px) 0 0;
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

@media (max-width: 760px) {
  .setup {
    padding: 22px 20px 24px;
  }

  .setup-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .option {
    flex: 1;
    min-width: 0;
  }

  .rules {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats {
    gap: 24px;
  }
}
</style>
