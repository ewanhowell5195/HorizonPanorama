<script setup>
import { computed, onMounted, ref } from "vue"
import { MAX_POINTS } from "../lib/game.js"

const props = defineProps({ score: Number, distance: String, lastRound: Boolean })
const emit = defineEmits(["next", "view"])
const width = ref(0)
const bar = computed(() => ({ width: `${width.value}%` }))

onMounted(() => requestAnimationFrame(() => width.value = props.score / MAX_POINTS * 100))

function next() {
  emit("next")
}

function view() {
  emit("view")
}
</script>

<template>
  <div class="card">
    <h2>{{ score.toLocaleString() }} points</h2>
    <p>Your guess was {{ distance }} away</p>
    <div class="bar"><div :style="bar"></div></div>
    <div class="actions">
      <button class="secondary" type="button" @click="view">View photosphere</button>
      <button type="button" @click="next">{{ lastRound ? "See results" : "Next round" }}</button>
    </div>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
}
</style>
