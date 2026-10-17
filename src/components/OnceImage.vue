<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue"
import { loadOnce } from "../lib/cauldrons.js"

const props = defineProps({ src: String, still: String, ms: Number, delay: { type: Number, default: 0 }, animate: Boolean })
const current = ref(null)
let objectUrl = null
let timers = []

function hold() {
  timers.push(setTimeout(() => current.value = props.still, props.ms))
}

onMounted(async () => {
  if (!props.animate) {
    current.value = props.still
    return
  }
  new Image().src = props.still
  try {
    objectUrl = URL.createObjectURL(await loadOnce(props.src))
  } catch (error) {
    console.warn(error)
    current.value = props.still
    return
  }
  timers.push(setTimeout(() => current.value = objectUrl, props.delay))
})

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
})
</script>

<template>
  <img :src="current || undefined" :class="{ shown: current }" :style="current ? null : { visibility: 'hidden' }" alt="" draggable="false" @load="current === objectUrl && hold()">
</template>
