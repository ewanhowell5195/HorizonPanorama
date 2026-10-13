<script setup>
import { ref } from "vue"
import { createMap } from "../lib/map.js"

const props = defineProps({ pickable: Boolean, pois: Boolean, scale: Boolean, faded: Boolean })
const emit = defineEmits(["pick"])
const host = ref(null)
let map = null

async function load() {
  map = await createMap(host.value, { root: "/map/", onPick: props.pickable ? place => emit("pick", place) : null, pois: props.pois, scale: props.scale })
  return map
}

defineExpose({
  load,
  place: (game, x, y) => map.place(game, x, y),
  addMarker: (element, x, y) => map.addMarker(element, x, y),
  setLines: pairs => map?.setLines(pairs),
  fit: (points, options) => map?.fit(points, options),
  refresh: () => map?.refresh()
})
</script>

<template>
  <div class="map-view" :class="{ faded }">
    <div ref="host" class="map-host"></div>
  </div>
</template>

<style scoped>
.map-view {
  position: absolute;
  inset: 0;
  transition: opacity 0.2s ease;
}

.map-view.faded {
  opacity: 0;
}
</style>
