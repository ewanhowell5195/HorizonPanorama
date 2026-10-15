<script setup>
import { computed } from "vue"
import SlapTitle from "./SlapTitle.vue"

const props = defineProps({ visible: Boolean, count: Number, found: Number, ready: Boolean, best: Number, last: Number, average: Number })
const emit = defineEmits(["play", "atlas"])

const countLabel = computed(() => props.count ? `${props.count} locations` : "")
const bestLabel = computed(() => props.best ? props.best.toLocaleString() : "None yet")
const lastLabel = computed(() => props.last === null || props.last === undefined ? "None yet" : props.last.toLocaleString())
const averageLabel = computed(() => props.average === null || props.average === undefined ? "None yet" : props.average.toLocaleString())

function play() {
  emit("play")
}
</script>

<template>
  <section class="home" :class="{ visible }">
    <header class="home-top">
      <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>Photosphere guessing game</span>
      <span class="count rise">{{ countLabel }}</span>
    </header>
    <div class="home-main">
      <p class="eyebrow rise" style="--i: 1">Guess the location</p>
      <SlapTitle :visible="visible" text="Wayfinder" />
      <p class="lede rise" style="--i: 3">Each round puts you somewhere in Horizon Zero Dawn or Horizon Forbidden West. Have a look around, then drop a pin on the map where you think you are.</p>
      <div class="cta rise" style="--i: 4">
        <button class="play" type="button" :disabled="!ready" @click="play">Play<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></button>
        <button class="secondary atlas" type="button" :disabled="!ready" @click="emit('atlas')">View Map<small>{{ found }} found</small></button>
      </div>
      <ol class="steps rise" style="--i: 5">
        <li><em>01</em><strong>Look around</strong><span>Drag to turn, scroll to zoom in on the details.</span></li>
        <li><em>02</em><strong>Pin the map</strong><span>Hover the map and click where you think you are.</span></li>
        <li><em>03</em><strong>Score</strong><span>Up to 5,000 points a round. Closer scores more.</span></li>
      </ol>
    </div>
    <footer class="home-bottom rise" style="--i: 6">
      <div class="stat-block"><small>Best score</small><strong>{{ bestLabel }}</strong></div>
      <div class="stat-block"><small>Last game</small><strong>{{ lastLabel }}</strong></div>
      <div class="stat-block"><small>Average</small><strong>{{ averageLabel }}</strong></div>
    </footer>
  </section>
</template>

<style scoped>
.home {
  position: fixed;
  inset: 0;
  z-index: 11;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(20px, 3.6vh, 34px) 56px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0s linear 0.5s;
}

.home.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease;
}

.home.visible .rise {
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 90ms + 150ms);
}

.home-top {
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

.home-main {
  align-self: center;
  max-width: 640px;
}

.lede {
  max-width: 470px;
  margin: clamp(14px, 2.6vh, 28px) 0 clamp(14px, 2.4vh, 26px);
  font-size: 17px;
  line-height: 1.6;
  color: rgba(232, 234, 237, 0.84);
}

.cta {
  --tuck: calc(40px - 8px * sqrt(2));
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: center;
  gap: 8px;
  width: fit-content;
}

.play, .atlas {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 17px 30px 17px 34px;
  font-size: 17px;
  letter-spacing: 0.22em;
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}

.cta > :not(:first-child) {
  position: relative;
  clip-path: polygon(calc(-1 * var(--tuck)) 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%, 0 var(--tuck));
}

.cta > :not(:first-child)::before {
  content: "";
  position: absolute;
  top: 0;
  right: 100%;
  width: var(--tuck);
  height: var(--tuck);
  background: inherit;
}

.cta > :not(:last-child) {
  clip-path: polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}

.cta > :not(:first-child):not(:last-child) {
  clip-path: polygon(calc(-1 * var(--tuck)) 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%, 0 var(--tuck));
}

.play svg {
  transition: transform 0.25s ease;
}

.play {
  transition: filter 0.2s ease;
}

.atlas {
  align-items: baseline;
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.atlas:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  filter: none;
}

.atlas small {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--muted);
  transition: color 0.2s ease;
}

.atlas:hover:not(:disabled) small {
  color: var(--text);
}

.play:hover:not(:disabled) svg {
  transform: translateX(4px);
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 640px;
  margin: clamp(22px, 4.5vh, 56px) 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.steps li {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 22px 0 0;
}

.steps li + li {
  padding-left: 22px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.steps em {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-style: normal;
  font-size: 22px;
  color: var(--accent);
}

.steps strong {
  font-size: 15px;
}

.steps span {
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.home-bottom {
  display: flex;
  align-items: flex-end;
  gap: 40px;
}

.stat-block {
  display: grid;
  gap: 4px;
}

.stat-block small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.stat-block strong {
  font-family: "Hunter Condensed", "Oita Norm", sans-serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.04em;
}

@media (max-height: 760px) and (min-width: 761px) {
  .steps {
    display: none;
  }
}

@media (max-width: 760px) {
  .home {
    padding: 22px 20px 24px;
  }

  .home-main {
    align-self: end;
    padding-bottom: 12px;
  }

  .lede {
    margin: 18px 0 18px;
    font-size: 15px;
  }

  .steps, .count {
    display: none;
  }

  .home-bottom {
    gap: 24px;
    margin-top: 24px;
  }
}
</style>
