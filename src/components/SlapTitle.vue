<script setup>
import { ref, watch } from "vue"

const props = defineProps({ visible: Boolean, text: String })

function between(min, max) {
  return min + Math.random() * (max - min)
}

function scatterLetters() {
  return Array.from(props.text).map((char, n) => {
    const angle = between(0, Math.PI * 2)
    const distance = between(0.15, 0.6)
    const style = {
      "--spin": `${between(-28, 28).toFixed(1)}deg`,
      "--grow": between(1.4, 2.3).toFixed(2),
      "--from-x": `${(Math.cos(angle) * distance).toFixed(3)}em`,
      "--from-y": `${(Math.sin(angle) * distance).toFixed(3)}em`,
      "--duration": `${Math.round(between(340, 560))}ms`,
      "--delay": `${Math.round(620 + n * 105 + between(-30, 30))}ms`
    }
    return { char, style }
  })
}

const pieces = ref(scatterLetters())

watch(() => props.visible, visible => {
  if (visible) {
    pieces.value = scatterLetters()
  }
})
</script>

<template>
  <h1 class="title" :class="{ visible }" :aria-label="`Horizon ${text}`"><span class="rise">Horizon</span><span class="pieces" aria-hidden="true"><span v-for="(piece, n) in pieces" :key="n" class="piece" :style="piece.style">{{ piece.char }}</span></span></h1>
</template>

<style scoped>
.title {
  margin: clamp(10px, 2vh, 22px) 0 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(54px, min(9.2vw, 12vh), 136px);
  line-height: 0.88;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.title > span {
  display: block;
}

.title.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 330ms both;
}

.pieces {
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--accent);
}

.piece {
  display: inline-block;
}

.visible .piece {
  animation: slap var(--duration) cubic-bezier(0.2, 1.5, 0.35, 1) var(--delay) both;
}

@keyframes slap {
  from {
    opacity: 0;
    transform: translate(var(--from-x), var(--from-y)) rotate(var(--spin)) scale(var(--grow));
  }

  30% {
    opacity: 1;
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
