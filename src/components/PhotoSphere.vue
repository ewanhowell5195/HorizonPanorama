<script setup>
import { onMounted, ref, watch } from "vue"
import { createSphere } from "../lib/sphere.js"

const props = defineProps({ active: Boolean, boxed: Boolean })
const emit = defineEmits(["heading"])
const canvas = ref(null)
let sphere = null

onMounted(() => {
  sphere = createSphere(canvas.value, { onHeading: heading => emit("heading", heading) })
  sphere.setActive(props.active)
})

watch(() => props.active, active => sphere?.setActive(active))

defineExpose({
  decode: (url, onProgress) => sphere.decode(url, onProgress),
  upload: image => sphere.upload(image),
  present: (texture, yaw, pitch) => sphere.present(texture, yaw, pitch),
  discard: texture => sphere.discard(texture),
  setLocked: locked => sphere.setLocked(locked)
})
</script>

<template>
  <canvas ref="canvas" class="sphere" :class="{ boxed }"></canvas>
</template>

<style scoped>
.sphere {
  position: fixed;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.sphere.boxed {
  position: absolute;
}

.sphere.dragging {
  cursor: grabbing;
}

.sphere.locked {
  cursor: default;
}
</style>
