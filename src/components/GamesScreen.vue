<script setup>
import { computed, ref, watch } from "vue"
import { LOCATIONS } from "../lib/rules.js"

const GAMES = [
  { id: "both", name: "Both games", detail: "Zero Dawn and Forbidden West" },
  { id: "hzd", name: "Zero Dawn", detail: "Including The Frozen Wilds", bars: 1 },
  { id: "hfw", name: "Forbidden West", detail: "Including Burning Shores", bars: 2 },
  { id: "custom", name: "Custom", detail: "Pick the areas yourself" }
]

const props = defineProps({ visible: Boolean, ready: Boolean, counts: Object, locationCounts: Object, available: Number, games: String, preview: String, lit: Array, matched: Boolean, customRules: Object, seed: String, seedError: String })
const emit = defineEmits(["games", "rule", "next", "back", "seed"])
const seedText = ref(props.seed || "")
const custom = computed(() => props.games === "custom")
const rows = ["hzd", "hfw"].map(game => LOCATIONS.filter(location => location.game === game))
const maps = computed(() => props.games === "custom" || props.preview === "both" ? ["hzd", "hfw"] : props.preview ? [props.preview] : [])
const areas = Object.fromEntries(["hzd", "hfw"].map(game => [game, LOCATIONS.filter(location => location.game === game).map(location => location.id)]))
watch(() => props.seed, value => seedText.value = value || "")

function plural(value) {
  return `${value} location${value === 1 ? "" : "s"}`
}

function count(id) {
  if (id === "custom" && !custom.value) {
    return `Up to ${plural(props.counts?.both || 0)}`
  }
  return plural(id === "custom" ? props.available || 0 : props.counts?.[id] || 0)
}

function playSeed() {
  if (seedText.value.trim()) {
    emit("seed", seedText.value)
  }
}
</script>

<template>
  <section class="games" :class="{ visible }">
    <header class="games-top rise">
      <button class="mark" type="button" title="Main menu" @click="emit('back')"><i class="mark-emblem"></i>Horizon Wayfinder</button>
    </header>
    <div class="games-main">
      <p class="eyebrow rise" style="--i: 1">New game</p>
      <h1 class="title rise" style="--i: 2"><span>Choose</span><span class="outline">Area</span></h1>
      <div class="picks rise" style="--i: 3" role="radiogroup" aria-label="Area">
        <button v-for="option in GAMES" :key="option.id" class="pick" :class="{ selected: games === option.id }" type="button" role="radio" :aria-checked="games === option.id" @click="emit('games', option.id)">
          <b class="glyph" aria-hidden="true">
            <svg v-if="option.bars" :viewBox="`0 0 ${option.bars * 10 - 5} 28`" :width="option.bars * 15 - 7.5" height="42" fill="currentColor"><rect v-for="bar in option.bars" :key="bar" :x="(bar - 1) * 10" width="5" height="28" /></svg>
            <svg v-else-if="option.id === 'both'" viewBox="0 0 44 28" width="66" height="42" fill="currentColor"><rect width="5" height="28" /><rect x="12" y="12.5" width="10" height="3" /><rect x="15.5" y="9" width="3" height="10" /><rect x="29" width="5" height="28" /><rect x="39" width="5" height="28" /></svg>
            <svg v-else viewBox="0 0 28 28" width="42" height="42" fill="currentColor"><rect y="3" width="28" height="3" /><rect x="5" width="5" height="9" /><rect y="12.5" width="28" height="3" /><rect x="17" y="9.5" width="5" height="9" /><rect y="22" width="28" height="3" /><rect x="9" y="19" width="5" height="9" /></svg>
          </b>
          <strong>{{ option.name }}</strong>
          <span>{{ option.detail }}</span>
          <small>{{ count(option.id) }}</small>
        </button>
      </div>
      <div class="rise" style="--i: 4">
        <div class="collapse" :class="{ open: custom }" :inert="!custom">
          <div class="collapse-inner">
            <div v-for="(row, n) in rows" :key="n" class="rules">
              <button v-for="location in row" :key="location.id" class="rule" :class="{ on: customRules[location.id] }" type="button" role="switch" :aria-checked="customRules[location.id]" @click="emit('rule', location.id, !customRules[location.id])"><span class="switch"></span><strong>{{ location.name }}</strong><span>{{ plural(locationCounts?.[location.id] || 0) }}</span></button>
            </div>
            <div class="collapse" :class="{ open: !matched }" :inert="matched">
              <div class="collapse-inner">
                <p class="unscored">Your score will not be remembered for custom games.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cta rise" style="--i: 5">
        <button class="play" type="button" :disabled="!ready || !available" @click="emit('next')">Next<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
      </div>
      <form class="seed rise" style="--i: 6" @submit.prevent="playSeed">
        <input v-model="seedText" type="text" spellcheck="false" autocomplete="off" placeholder="Paste a seed or link to replay a game" aria-label="Seed">
        <button class="secondary" type="submit" :disabled="!ready || !seedText.trim()">Play seed</button>
        <p v-if="seedError" class="seed-error">{{ seedError }}</p>
      </form>
    </div>
    <Transition name="maps" mode="out-in">
      <div :key="maps.join()" class="maps" :class="{ pair: maps.length > 1 }" aria-hidden="true">
        <div v-for="game in maps" :key="game" class="map">
          <div class="glow">
            <img v-for="area in areas[game]" :key="area" :class="{ off: !lit?.includes(area) }" :src="`/backgrounds/area-${area}.avif`" alt="">
          </div>
          <img v-for="area in areas[game]" :key="area" class="area dim" :src="`/backgrounds/area-${area}.avif`" alt="">
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.games {
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

.games.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.games.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms + 150ms);
}

.maps {
  position: fixed;
  top: 80px;
  bottom: 96px;
  left: calc(min(max(52vw, 940px), 72vw) + 108px);
  right: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  pointer-events: none;
}

.map {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
}

.glow {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 2px var(--accent)) drop-shadow(0 0 10px var(--accent));
}

.map img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

.glow img.off {
  opacity: 0;
}

.area.dim {
  opacity: 0.3;
}

.maps-enter-active, .maps-leave-active {
  transition: opacity 0.3s ease;
}

.maps-enter-from, .maps-leave-to {
  opacity: 0;
}

.games-top {
  display: flex;
  align-items: center;
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

.games-main {
  align-self: center;
  max-width: 900px;
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

.picks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.pick {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 22px 20px 20px;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--muted);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  border-radius: 0;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.pick:hover {
  color: var(--text);
  filter: none;
}

.pick.selected {
  color: var(--text);
  background: rgba(242, 165, 65, 0.12);
  border-color: var(--accent);
}

.glyph {
  display: flex;
  align-items: center;
  height: 42px;
  margin: 0 0 14px;
  transition: color 0.2s ease;
}

.pick.selected .glyph, .pick.selected strong {
  color: var(--accent);
}

.pick strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 24px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  transition: color 0.2s ease;
}

.pick span {
  font-size: 13px;
  font-weight: 400;
}

.pick small {
  margin: 10px 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.collapse .rules {
  padding: 8px 0 0;
}

.collapse .rules:first-child {
  padding: 12px 0 0;
}

.unscored {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.cta {
  margin-top: clamp(18px, 3vh, 30px);
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

.seed {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 470px;
  margin: clamp(22px, 4vh, 40px) 0 0;
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

@media (max-width: 1100px) {
  .picks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .games {
    padding: 22px 20px 24px;
  }

  .games-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .maps {
    top: 64px;
    bottom: auto;
    left: 16px;
    right: 16px;
    height: calc(28vh - 64px);
  }

  .maps.pair {
    flex-direction: row;
    gap: 16px;
  }

  .picks {
    gap: 8px;
  }

  .pick {
    padding: 12px 14px;
  }

  .pick strong {
    font-size: 18px;
  }

  .pick span {
    display: none;
  }

  .pick small {
    margin: 4px 0 0;
  }

  .glyph {
    height: 24px;
    margin: 0 0 8px;
  }

  .glyph svg {
    width: auto;
    height: 24px;
  }
}
</style>
