<script setup>
import { computed } from "vue"

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const props = defineProps({ value: Number, pad: { type: Number, default: 1 } })

const label = computed(() => (props.value || 0).toLocaleString())
const text = computed(() => String(Math.round(props.value || 0)).padStart(props.pad, "0").replace(/\B(?=(\d{3})+$)/g, ","))
const slots = computed(() => Array.from(text.value).map((char, n, all) => ({ char, key: all.length - n, digit: /\d/.test(char) ? Number(char) : null })))
</script>

<template>
  <TransitionGroup tag="span" name="slot" class="ticker" :aria-label="label"><span v-for="slot in slots" :key="slot.key" class="slot" aria-hidden="true"><span v-if="slot.digit !== null" class="reel" :style="{ transform: `translateY(${slot.digit * -10}%)` }"><span v-for="digit in DIGITS" :key="digit">{{ digit }}</span></span><template v-else>{{ slot.char }}</template></span></TransitionGroup>
</template>

<style scoped>
.ticker {
  display: inline-flex;
}

.slot {
  display: inline-block;
  max-width: 1em;
  height: 1lh;
  overflow: hidden;
}

.slot-enter-active, .slot-leave-active {
  transition: max-width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease;
}

.slot-enter-from, .slot-leave-to {
  max-width: 0;
  opacity: 0;
}

.reel {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>
