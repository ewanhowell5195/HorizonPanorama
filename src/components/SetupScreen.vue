<script setup>
import { computed } from "vue"
import { MAX_POINTS } from "../lib/game.js"
import { MODES, RULES } from "../lib/rules.js"
import ArrowIcon from "./ArrowIcon.vue"
import MenuScreen from "./MenuScreen.vue"
import TickerNumber from "./TickerNumber.vue"

const GAME_NAMES = { both: "Both games", hzd: "Zero Dawn", hfw: "Forbidden West", custom: "Custom locations" }

const props = defineProps({ visible: Boolean, ready: Boolean, scored: Boolean, available: Number, rounds: Number, games: String, mode: String, customRules: Object, best: Number, last: Number, average: Number })
const emit = defineEmits(["start", "mode", "rule"])

const custom = computed(() => props.mode === "custom")
const count = computed(() => props.available || 0)
const roundsLabel = computed(() => count.value ? `${props.rounds} rounds` : "No photospheres yet")
const maxLabel = computed(() => count.value ? `Up to ${(props.rounds * MAX_POINTS).toLocaleString()} points` : "Capture some to play")
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">{{ GAME_NAMES[games] }}</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Game</span><span class="outline">Setup</span></h1>
    <div class="group rise" style="--i: 3">
      <small class="label">Mode</small>
      <div class="options" role="radiogroup" aria-label="Mode">
        <button v-for="option in MODES" :key="option.id" class="choice option" :class="{ selected: mode === option.id }" type="button" role="radio" :aria-checked="mode === option.id" @click="emit('mode', option.id)"><strong>{{ option.name }}</strong><span v-for="feature in option.features" :key="feature">{{ feature }}</span></button>
      </div>
    </div>
    <div class="rise" style="--i: 4">
      <div class="collapse" :class="{ open: custom }" :inert="!custom">
        <div class="collapse-inner">
          <div class="group">
            <small class="label">Custom rules</small>
            <div class="rules">
              <button v-for="rule in RULES" :key="rule.id" class="choice rule" :class="{ on: customRules[rule.id] }" type="button" role="switch" :aria-checked="customRules[rule.id]" @click="emit('rule', rule.id, !customRules[rule.id])"><span class="switch"></span><strong>{{ rule.name }}</strong><span>{{ rule.detail }}</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cta rise" style="--i: 5">
      <button class="action" type="button" :disabled="!ready || !count" @click="emit('start')">Start<ArrowIcon /></button>
      <div class="cta-meta"><strong>{{ roundsLabel }}</strong><span>{{ maxLabel }}</span></div>
    </div>
    <div class="rise" style="--i: 6">
      <div class="collapse" :class="{ open: !scored }" :inert="scored">
        <div class="collapse-inner">
          <p class="unscored">Custom games are not scored, but you can still share them.</p>
        </div>
      </div>
      <div class="collapse" :class="{ open: scored }" :inert="!scored">
        <div class="collapse-inner">
          <div class="stat-row stats">
            <div class="stat-block"><small class="label">Best score</small><strong><TickerNumber :value="best" :pad="5" /></strong></div>
            <div class="stat-block"><small class="label">Last game</small><strong><TickerNumber :value="last" :pad="5" /></strong></div>
            <div class="stat-block"><small class="label">Average</small><strong><TickerNumber :value="average" :pad="5" /></strong></div>
          </div>
        </div>
      </div>
    </div>
  </MenuScreen>
</template>

<style scoped>
.group {
  display: grid;
  gap: 8px;
  margin: 0 0 clamp(14px, 2.4vh, 24px);
}

.options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.option {
  display: grid;
  align-content: start;
  gap: 2px;
  padding: 10px 14px 12px;
}

.option strong {
  margin-bottom: 4px;
}

.option strong {
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.option span {
  font-size: 12px;
  font-weight: 400;
}

.unscored {
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

.cta {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: clamp(4px, 1vh, 10px);
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
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

@media (max-width: 760px) {
  .options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
