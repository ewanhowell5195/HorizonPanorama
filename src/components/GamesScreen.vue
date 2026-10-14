<script setup>
import { ref, watch } from "vue"

const GAMES = [
  { id: "both", name: "Both games", detail: "Zero Dawn and Forbidden West" },
  { id: "hzd", name: "Zero Dawn", detail: "Including The Frozen Wilds", bars: 1 },
  { id: "hfw", name: "Forbidden West", detail: "Including Burning Shores", bars: 2 }
]

const props = defineProps({ visible: Boolean, ready: Boolean, counts: Object, games: String, seed: String, seedError: String })
const emit = defineEmits(["pick", "back", "seed"])
const seedText = ref(props.seed || "")

watch(() => props.seed, value => seedText.value = value || "")

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
  <section class="games" :class="{ visible }">
    <header class="games-top rise">
      <button class="mark" type="button" title="Main menu" @click="emit('back')"><i class="mark-emblem"></i>Horizon Wayfinder</button>
    </header>
    <div class="games-main">
      <p class="eyebrow rise" style="--i: 1">New game</p>
      <h1 class="title rise" style="--i: 2"><span>Choose</span><span class="outline">Game</span></h1>
      <div class="picks rise" style="--i: 3">
        <button v-for="option in GAMES" :key="option.id" class="pick" :class="{ last: games === option.id }" type="button" :disabled="!ready" @click="emit('pick', option.id)">
          <b class="glyph" aria-hidden="true"><svg v-if="option.bars" :viewBox="`0 0 ${option.bars * 10 - 5} 28`" :width="option.bars * 15 - 7.5" height="42" fill="currentColor"><rect v-for="bar in option.bars" :key="bar" :x="(bar - 1) * 10" width="5" height="28" /></svg><svg v-else viewBox="0 0 44 28" width="66" height="42" fill="currentColor"><rect width="5" height="28" /><rect x="12" y="12.5" width="10" height="3" /><rect x="15.5" y="9" width="3" height="10" /><rect x="29" width="5" height="28" /><rect x="39" width="5" height="28" /></svg></b>
          <strong>{{ option.name }}</strong>
          <span>{{ option.detail }}</span>
          <small>{{ locations(option.id) }}</small>
        </button>
      </div>
      <form class="seed rise" style="--i: 4" @submit.prevent="playSeed">
        <input v-model="seedText" type="text" spellcheck="false" autocomplete="off" placeholder="Paste a seed or link to replay a game" aria-label="Seed">
        <button class="secondary" type="submit" :disabled="!ready || !seedText.trim()">Play seed</button>
        <p v-if="seedError" class="seed-error">{{ seedError }}</p>
      </form>
    </div>
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
  max-width: 760px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pick {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 22px 22px 20px;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--muted);
  background: rgba(10, 12, 16, 0.55);
  border: 1px solid var(--border);
  border-radius: 0;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.pick:hover:not(:disabled) {
  color: var(--text);
  background: rgba(242, 165, 65, 0.12);
  border-color: var(--accent);
  filter: none;
}

.pick:disabled {
  background: rgba(10, 12, 16, 0.55);
}

.glyph {
  display: flex;
  align-items: center;
  height: 42px;
  margin: 0 0 14px;
  transition: color 0.2s ease;
}

.pick:hover:not(:disabled) .glyph, .pick:hover:not(:disabled) strong {
  color: var(--accent);
}

.pick strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 26px;
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

.pick.last {
  border-color: rgba(242, 165, 65, 0.45);
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

@media (max-width: 760px) {
  .games {
    padding: 22px 20px 24px;
  }

  .games-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .picks {
    grid-template-columns: 1fr;
  }

  .pick {
    grid-template-columns: auto 1fr;
    column-gap: 16px;
    padding: 14px 16px;
  }

  .glyph {
    grid-row: span 3;
    margin: 0;
  }
}
</style>
