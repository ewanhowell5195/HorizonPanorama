<script setup>
import { computed } from "vue"
import { MAX_POINTS } from "../lib/game.js"
import { LOCATIONS, locationNames, missingRules, modeOf, tribesOf } from "../lib/rules.js"
import SlapTitle from "./SlapTitle.vue"

const props = defineProps({ visible: Boolean, ready: Boolean, rules: Object, games: String, rounds: Number, score: Number, error: String })
const emit = defineEmits(["play", "menu"])

const hasScore = computed(() => props.score !== null && props.score !== undefined)
const mode = computed(() => props.rules ? modeOf(props.rules) : "normal")
const modeName = computed(() => ({ normal: "Normal", hard: "Hard", custom: "Custom" })[mode.value])
const missing = computed(() => props.rules ? missingRules(props.rules) : [])
const modeDetail = computed(() => mode.value === "hard" ? "Fixed view, no zoom" : missing.value.length ? `No ${new Intl.ListFormat("en", { type: "disjunction" }).format(missing.value)}` : "Look around freely")
const gameName = computed(() => ({ hzd: "Zero Dawn", hfw: "Forbidden West" })[props.games] || "Both games")
const someLocations = computed(() => props.rules && LOCATIONS.some(location => !props.rules[location.id]))
const placeDetail = computed(() => someLocations.value ? new Intl.ListFormat("en").format(locationNames(props.rules)) : props.games === "hzd" || props.games === "hfw" ? `Horizon ${gameName.value} only` : "Zero Dawn and Forbidden West")
const tribeDetail = computed(() => {
  const named = tribesOf(props.games).filter(tribe => tribe.tribe)
  const on = named.filter(tribe => props.rules?.[tribe.id]).map(tribe => tribe.name)
  const off = named.filter(tribe => props.rules && !props.rules[tribe.id]).map(tribe => tribe.name)
  if (!off.length) {
    return ""
  }
  return on.length < off.length ? `only ${new Intl.ListFormat("en").format(on)}` : `no ${new Intl.ListFormat("en", { type: "disjunction" }).format(off)}`
})
const gameDetail = computed(() => tribeDetail.value ? `${placeDetail.value}, ${tribeDetail.value}` : placeDetail.value)

function play() {
  emit("play")
}

function menu() {
  emit("menu")
}
</script>

<template>
  <section class="challenge" :class="{ visible }">
    <header class="challenge-top rise">
      <button class="mark" type="button" title="Main menu" @click="menu"><i class="mark-emblem"></i>Horizon Wayfinder</button>
    </header>
    <div class="challenge-main">
      <p class="eyebrow rise" style="--i: 1">Shared game</p>
      <SlapTitle :visible="visible" text="Challenge" />
      <p class="lede rise" style="--i: 3">Someone sent you this game. Same photospheres, same views, in the same order.</p>
      <div class="details rise" style="--i: 4">
        <div class="detail"><small>Rounds</small><strong>{{ rounds }}</strong><span>Up to {{ (rounds * MAX_POINTS).toLocaleString() }} points</span></div>
        <div class="detail"><small>Game</small><strong>{{ gameName }}</strong><span>{{ gameDetail }}</span></div>
        <div class="detail"><small>Mode</small><strong>{{ modeName }}</strong><span>{{ modeDetail }}</span></div>
        <div v-if="hasScore" class="detail target"><small>Score to beat</small><strong>{{ score.toLocaleString() }}</strong><span>out of {{ (rounds * MAX_POINTS).toLocaleString() }}</span></div>
      </div>
      <div class="cta rise" style="--i: 5">
        <button class="play" type="button" :disabled="!ready" @click="play">Play this game<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
      </div>
      <p v-if="error" class="error rise" style="--i: 6">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.challenge {
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

.challenge.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.challenge.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms + 150ms);
}

.challenge-top {
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

.challenge-main {
  align-self: center;
  max-width: 680px;
}

.lede {
  max-width: 470px;
  margin: clamp(14px, 2.6vh, 28px) 0 clamp(14px, 2.4vh, 26px);
  font-size: 17px;
  line-height: 1.6;
  color: rgba(232, 234, 237, 0.84);
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 clamp(16px, 2.8vh, 30px);
}

.detail {
  display: grid;
  gap: 4px;
  min-width: 170px;
  padding: 12px 16px;
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
}

.detail small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.detail strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.04em;
}

.detail span {
  font-size: 12px;
  color: var(--muted);
}

.detail.target {
  background: rgba(242, 165, 65, 0.12);
  border-color: var(--accent);
}

.detail.target strong {
  color: var(--accent);
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

.error {
  margin: 16px 0 0;
  font-size: 13px;
  color: #f28b82;
}

@media (max-width: 760px) {
  .challenge {
    padding: 22px 20px 24px;
  }

  .challenge-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .lede {
    margin: 18px 0 18px;
    font-size: 15px;
  }

  .detail {
    flex: 1;
    min-width: 130px;
  }
}
</style>
