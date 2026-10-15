<script setup>
import { computed, onMounted, ref } from "vue"
import { seedLink } from "../lib/seed.js"

const props = defineProps({ results: Array, total: Number, max: Number, mode: String, seed: String })
const emit = defineEmits(["menu", "again", "replay", "view"])
const copied = ref(false)
const link = computed(() => seedLink(props.seed, props.total))

async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  } catch (error) {
    console.warn(error)
  }
}

function replay() {
  emit("replay")
}
const width = ref(0)
const bar = computed(() => ({ width: `${width.value}%` }))

onMounted(() => requestAnimationFrame(() => width.value = props.total / props.max * 100))

function menu() {
  emit("menu")
}

function again() {
  emit("again")
}

function view(index) {
  emit("view", index)
}
</script>

<template>
  <div class="card">
    <h2>{{ total.toLocaleString() }} points</h2>
    <p>out of {{ max.toLocaleString() }}<template v-if="mode !== 'normal'"> in {{ mode }} mode</template></p>
    <div class="bar"><div :style="bar"></div></div>
    <div class="rounds">
      <div v-for="(result, n) in results" :key="n">
        <strong>Round {{ n + 1 }}</strong>
        <span>{{ result.distance }}</span>
        <strong class="score">{{ result.score.toLocaleString() }}</strong>
        <button class="secondary view" type="button" :title="`View the round ${n + 1} photosphere`" @click="view(n)">View</button>
      </div>
    </div>
    <div class="share">
      <small>Seed</small>
      <code :title="link">{{ seed }}</code>
      <button class="secondary" type="button" @click="copy">{{ copied ? "Copied" : "Copy link" }}</button>
    </div>
    <div class="actions">
      <button class="secondary" type="button" @click="menu">Menu</button>
      <button class="secondary" type="button" @click="replay">Replay</button>
      <button type="button" @click="again">Play again</button>
    </div>
  </div>
</template>

<style scoped>
.rounds {
  display: grid;
  gap: 4px;
  margin: 0 0 16px;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.rounds div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 4px 4px 8px;
  background: rgba(255, 255, 255, 0.04);
}

.rounds span {
  flex: 1;
}

.rounds .score {
  min-width: 48px;
  text-align: right;
}

.rounds .view {
  padding: 3px 10px;
  font-size: 12px;
}

.rounds span {
  color: var(--muted);
}

.share {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  padding: 6px 6px 6px 10px;
  text-align: left;
  background: rgba(255, 255, 255, 0.04);
}

.share small {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.share code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}

.share button {
  flex: none;
  padding: 6px 12px;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
}
</style>
