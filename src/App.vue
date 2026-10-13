<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import ChallengeScreen from "./components/ChallengeScreen.vue"
import GameHud from "./components/GameHud.vue"
import GuessPanel from "./components/GuessPanel.vue"
import HomeScreen from "./components/HomeScreen.vue"
import MapView from "./components/MapView.vue"
import PhotoSphere from "./components/PhotoSphere.vue"
import ResultCard from "./components/ResultCard.vue"
import RoundIntro from "./components/RoundIntro.vue"
import SlideBackdrop from "./components/SlideBackdrop.vue"
import SummaryCard from "./components/SummaryCard.vue"
import { MAX_POINTS, ROUNDS, formatDistance, points, readStore, shuffle, wait, writeStore } from "./lib/game.js"
import { METRES_PER_UNIT } from "./lib/map.js"
import { answerMarker, pin } from "./lib/markers.js"
import { decodeScore, decodeSeed, encodeSeed, seedLink, snapView } from "./lib/seed.js"
import { pickView } from "./lib/view.js"

const COUNTDOWN = 3
// after RoundIntro's per tick ring step (0.45 s) and pulse (0.7 s) have finished
const QUIET_MS = 700
const MAP_DELAY_MS = 1200
const SECRET = "horizon-panorama"
const TIPS = [
  "Hover the map in the corner to open it. The button in its corner makes it bigger.",
  "Right drag pans the map without moving your pin.",
  "Click your pin again to take it back.",
  "Space or Enter locks in your guess.",
  "The compass at the top shows which way you are facing.",
  "Look for landmarks on the skyline: ruins, mountains and machine sites."
]
const NORMAL_TIPS = TIPS.concat("Drag to look around. Scroll or pinch to zoom in on far off details.")
const HARD_TIPS = TIPS.concat("Hard mode locks the view. Everything you get is already in frame.", "The view is never pointed at a wall, so the skyline is usually worth reading.")

const phase = ref("menu")
const mode = ref(readStore("mode") === "hard" ? "hard" : "normal")
const intro = ref(false)
const pool = ref([])
const mapsReady = ref(false)
const best = ref(storedScore(scoreKey("bestScore")))
const last = ref(storedScore(scoreKey("lastScore")))
const average = ref(averageScore())
const heading = ref(0)
const hasGuess = ref(false)
const status = reactive({ index: 1, count: ROUNDS, total: 0, progress: 0, label: "", tip: "", countdown: COUNTDOWN, waiting: false })
const result = ref(null)
const summary = ref(null)
const seedInput = ref(new URLSearchParams(location.search).get("seed") || "")
const seedError = ref("")
const challenge = ref(readChallenge(location.search))
const viewing = ref(null)
if (seedInput.value && !challenge.value) {
  seedError.value = "That seed doesn't look right. Check it was copied in full."
}

const sphere = ref(null)
const backdrop = ref(null)
const minimap = ref(null)
const bigmap = ref(null)
const resultCard = ref(null)
const summaryCard = ref(null)

const isMenu = computed(() => phase.value === "menu")
const isRound = computed(() => phase.value === "round")
const showsMap = computed(() => (phase.value === "result" || phase.value === "summary") && !viewing.value)
const playing = computed(() => isRound.value && !intro.value)
const sphereActive = computed(() => playing.value || Boolean(viewing.value && !viewing.value.loading))
const roundCount = computed(() => Math.min(ROUNDS, pool.value.length))
const canPlay = computed(() => mapsReady.value && pool.value.length > 0)
const hard = computed(() => mode.value === "hard")
const gameHard = ref(false)

let game = null
let guessMarker = null
let resultMarkers = []
let presentedRound = -1
let viewToken = 0

function readChallenge(input) {
  const seed = decodeSeed(input)
  return seed ? { seed, score: decodeScore(input, seed.rounds.length * MAX_POINTS) } : null
}

function openChallenge(input) {
  const found = readChallenge(input)
  if (!found) {
    seedError.value = "That seed doesn't look right. Check it was copied in full."
    return
  }
  seedError.value = ""
  challenge.value = found
  history.replaceState(null, "", seedLink(found.seed.code, found.score))
}

function leaveChallenge() {
  challenge.value = null
  seedError.value = ""
  history.replaceState(null, "", location.pathname)
}

function playChallenge() {
  playSeed(challenge.value.seed.code)
}

function scoreKey(name) {
  return mode.value === "hard" ? `${name}Hard` : name
}

function setMode(value) {
  mode.value = value
  writeStore("mode", value)
  best.value = storedScore(scoreKey("bestScore"))
  last.value = storedScore(scoreKey("lastScore"))
  average.value = averageScore()
}

function averageScore() {
  const games = storedScore(scoreKey("gamesPlayed"))
  return games ? Math.round(storedScore(scoreKey("scoreSum")) / games) : null
}

function storedScore(key) {
  const value = readStore(key)
  return value === null || value === "" ? null : Number(value)
}

function setHeading(value) {
  heading.value = value
}

function clearMarkers() {
  guessMarker?.remove()
  guessMarker = null
  resultMarkers.forEach(marker => marker.remove())
  resultMarkers = []
  bigmap.value?.setLines([])
}

async function decodePosition(name, text) {
  const key = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SECRET + name)))
  const bytes = Uint8Array.from(atob(text), character => character.charCodeAt(0)).map((value, n) => value ^ key[n])
  const view = new DataView(bytes.buffer)
  return [0, 4, 8].map(offset => Math.round(view.getFloat32(offset, true) * 100) / 100)
}

async function loadPool() {
  try {
    const response = await fetch("/photospheres/photospheres.json", { cache: "no-store" })
    if (response.ok) {
      const entries = Object.entries(await response.json()).flatMap(([game, spheres]) => Object.entries(spheres).map(([name, text]) => ({ name, game, text })))
      pool.value = await Promise.all(entries.map(async ({ name, game, text }) => {
        const [x, y, z] = await decodePosition(name, text)
        return { name, game, x, y, z }
      }))
    }
  } catch (error) {
    console.warn(error)
  }
}

function preload(index) {
  const round = game?.rounds[index]
  if (round && !round.image) {
    round.progress = 0
    round.image = sphere.value.decode(`/photospheres/${round.name}.avif`, progress => round.progress = progress)
    round.image.then(bitmap => round.bitmap = bitmap, error => console.warn(error))
  }
}

function prepare(round, current) {
  if (round.prepared || !round.bitmap) {
    return
  }
  if (!round.view) {
    round.view = snapView(current.hard ? pickView(round.bitmap, window.innerWidth / Math.max(window.innerHeight, 1)) : { yaw: Math.random() * Math.PI * 2, pitch: 0 })
  }
  round.prepared = { texture: sphere.value.upload(round.bitmap), view: round.view }
  round.bitmap = null
}

function drop(round) {
  round.bitmap?.close()
  round.bitmap = null
  if (round.prepared) {
    sphere.value.discard(round.prepared.texture)
    round.prepared = null
  }
}

async function countDown(current, round) {
  for (let n = COUNTDOWN; n > 0; n--) {
    if (game !== current) {
      return
    }
    const tick = performance.now()
    status.countdown = n
    await wait(QUIET_MS)
    if (game !== current) {
      return
    }
    prepare(round, current)
    await wait(Math.max(1000 - (performance.now() - tick), 0))
  }
  if (game === current) {
    status.countdown = 0
  }
}

async function startRound() {
  const current = game
  const round = current.rounds[current.index]
  prepare(round, current)
  clearMarkers()
  current.guess = null
  hasGuess.value = false
  status.index = current.index + 1
  status.count = current.rounds.length
  status.total = current.total
  status.progress = 0
  status.label = "Loading photosphere"
  status.countdown = COUNTDOWN
  status.waiting = false
  const tips = current.hard ? HARD_TIPS : NORMAL_TIPS
  status.tip = tips[Math.floor(Math.random() * tips.length)]
  phase.value = "round"
  intro.value = true
  minimap.value.fit(null, { snap: true })
  backdrop.value.cycle(false)
  backdrop.value.next()
  preload(current.index)
  const ticker = setInterval(() => {
    status.progress = round.progress || 0
    status.label = status.progress < 1 ? `Loading photosphere ${Math.round(status.progress * 100)}%` : "Ready"
  }, 60)
  await countDown(current, round)
  if (!round.prepared && !round.bitmap && game === current) {
    status.waiting = true
    try {
      await round.image
    } catch (error) {
      clearInterval(ticker)
      status.label = `Could not load ${round.name}: ${error.message}`
      return
    }
  }
  clearInterval(ticker)
  if (game !== current) {
    drop(round)
    return
  }
  prepare(round, current)
  status.progress = 1
  status.label = "Ready"
  sphere.value.present(round.prepared.texture, round.prepared.view.yaw, round.prepared.view.pitch)
  presentedRound = current.index
  sphere.value.setLocked(current.hard)
  round.prepared = null
  round.image = null
  intro.value = false
  preload(current.index + 1)
}

function removeGuess() {
  if (!game || game.state !== "round") {
    return
  }
  guessMarker?.remove()
  guessMarker = null
  game.guess = null
  hasGuess.value = false
}

function placeGuess(place) {
  if (!game || game.state !== "round") {
    return
  }
  game.guess = place
  if (guessMarker) {
    guessMarker.move(place.x, place.y)
  } else {
    const element = pin("var(--accent)")
    element.classList.add("removable")
    element.title = "Click to remove"
    element.addEventListener("click", removeGuess)
    guessMarker = minimap.value.addMarker(element, place.x, place.y)
  }
  hasGuess.value = true
}

async function submitGuess() {
  if (!game || game.state !== "round" || !game.guess) {
    return
  }
  const round = game.rounds[game.index]
  const answer = bigmap.value.place(round.game, round.x, round.y)
  const guess = { x: game.guess.x, y: game.guess.y }
  const metres = Math.hypot(guess.x - answer.x, guess.y - answer.y) * METRES_PER_UNIT
  const score = points(metres)
  game.total += score
  game.results.push({ guess, answer: { x: answer.x, y: answer.y }, metres, score })
  game.state = "result"
  status.total = game.total
  resultMarkers.push(bigmap.value.addMarker(pin("var(--accent)"), guess.x, guess.y), bigmap.value.addMarker(answerMarker(), answer.x, answer.y))
  bigmap.value.setLines([[guess, answer]])
  result.value = { key: game.index, score, distance: formatDistance(metres), lastRound: game.index + 1 >= game.rounds.length }
  phase.value = "result"
  await nextTick()
  bigmap.value.fit([guess, answer], { inset: (resultCard.value?.$el.offsetHeight || 0) + 40, start: { x: guess.x, y: guess.y, zoom: 0.35 } })
}

async function showSummary() {
  game.state = "summary"
  clearMarkers()
  game.results.forEach((entry, n) => {
    resultMarkers.push(bigmap.value.addMarker(pin("var(--accent)", n + 1), entry.guess.x, entry.guess.y), bigmap.value.addMarker(answerMarker(n + 1), entry.answer.x, entry.answer.y))
  })
  bigmap.value.setLines(game.results.map(entry => [entry.guess, entry.answer]))
  const suffix = game.hard ? "Hard" : ""
  writeStore(`lastScore${suffix}`, game.total)
  if (game.total > (storedScore(`bestScore${suffix}`) || 0)) {
    writeStore(`bestScore${suffix}`, game.total)
  }
  writeStore(`gamesPlayed${suffix}`, (storedScore(`gamesPlayed${suffix}`) || 0) + 1)
  writeStore(`scoreSum${suffix}`, (storedScore(`scoreSum${suffix}`) || 0) + game.total)
  best.value = storedScore(scoreKey("bestScore"))
  last.value = storedScore(scoreKey("lastScore"))
  average.value = averageScore()
  summary.value = { seed: encodeSeed(game), total: game.total, max: game.rounds.length * MAX_POINTS, results: game.results.map(entry => ({ distance: formatDistance(entry.metres), score: entry.score })) }
  phase.value = "summary"
  await nextTick()
  bigmap.value.fit(game.results.flatMap(entry => [entry.guess, entry.answer]), { inset: (summaryCard.value?.$el.offsetHeight || 0) + 40 })
}

function next() {
  if (!game || game.state !== "result") {
    return
  }
  closeView()
  if (game.index + 1 < game.rounds.length) {
    game.index++
    game.state = "round"
    startRound()
    return
  }
  showSummary()
}

async function viewRound(index) {
  if (!game) {
    return
  }
  const token = ++viewToken
  const round = game.rounds[index]
  const title = `Round ${index + 1}`
  sphere.value.setLocked(false)
  if (presentedRound === index) {
    viewing.value = { title, loading: false }
    return
  }
  viewing.value = { title, loading: true }
  try {
    const bitmap = await sphere.value.decode(`/photospheres/${round.name}.avif`)
    if (token !== viewToken) {
      bitmap.close()
      return
    }
    sphere.value.present(sphere.value.upload(bitmap), round.view?.yaw || 0, round.view?.pitch || 0)
    presentedRound = index
    viewing.value = { title, loading: false }
  } catch (error) {
    console.warn(error)
    if (token === viewToken) {
      viewing.value = null
    }
  }
}

function viewResult() {
  viewRound(game.index)
}

function closeView() {
  viewToken++
  viewing.value = null
}

function showMenu() {
  game = null
  closeView()
  if (challenge.value) {
    leaveChallenge()
  }
  clearMarkers()
  phase.value = "menu"
  intro.value = false
  loadPool()
  backdrop.value.next()
  backdrop.value.cycle(true)
}

function begin(rounds, isHard) {
  seedError.value = ""
  closeView()
  game = { rounds, index: 0, total: 0, results: [], state: "round", guess: null, hard: isHard }
  gameHard.value = isHard
  preload(0)
  startRound()
}

async function newGame() {
  await loadPool()
  if (!pool.value.length) {
    showMenu()
    return
  }
  begin(shuffle(pool.value).slice(0, ROUNDS).map(round => Object.assign({}, round)), hard.value)
}

async function playSeed(input) {
  const seed = decodeSeed(input)
  if (!seed) {
    seedError.value = "That seed doesn't look right. Check it was copied in full."
    return
  }
  await loadPool()
  const byName = new Map(pool.value.map(round => [round.name, round]))
  const missing = seed.rounds.filter(round => !byName.has(round.name))
  if (missing.length) {
    seedError.value = missing.length === seed.rounds.length ? "None of this seed's photospheres are available any more." : `${missing.length} of this seed's photospheres ${missing.length === 1 ? "is" : "are"} no longer available.`
    return
  }
  begin(seed.rounds.map(round => Object.assign({}, byName.get(round.name), { view: round.view })), seed.hard)
}

function replay() {
  playSeed(summary.value.seed)
}

function onKey(event) {
  if (viewing.value) {
    if (event.key === "Escape") {
      closeView()
    }
    return
  }
  if (event.key !== " " && event.key !== "Enter") {
    return
  }
  if (game?.state === "round" && game.guess) {
    event.preventDefault()
    submitGuess()
  } else if (game?.state === "result") {
    event.preventDefault()
    next()
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onKey)
  loadPool()
  backdrop.value.next()
  backdrop.value.cycle(true)
  backdrop.value.preload(3)
  await backdrop.value.ready.catch(error => console.warn(error))
  await wait(MAP_DELAY_MS)
  await minimap.value.load()
  await bigmap.value.load()
  mapsReady.value = true
})

onBeforeUnmount(() => window.removeEventListener("keydown", onKey))
</script>

<template>
  <PhotoSphere ref="sphere" :active="sphereActive" @heading="setHeading" />
  <GameHud :round="status.index" :count="status.count" :score="status.total" :heading="heading" :hidden="!isRound" :hard="gameHard" />
  <GuessPanel :hidden="!isRound" :has-guess="hasGuess" @guess="submitGuess">
    <MapView ref="minimap" pickable pois scale @pick="placeGuess" />
  </GuessPanel>
  <div class="bigmap" :class="{ shown: showsMap }">
    <MapView ref="bigmap" />
  </div>
  <Transition name="card">
    <ResultCard v-if="phase === `result` && result && !viewing" ref="resultCard" :key="result.key" :score="result.score" :distance="result.distance" :last-round="result.lastRound" @next="next" @view="viewResult" />
  </Transition>
  <Transition name="card">
    <SummaryCard v-if="phase === `summary` && summary && !viewing" ref="summaryCard" :results="summary.results" :total="summary.total" :max="summary.max" :hard="gameHard" :seed="summary.seed" @menu="showMenu" @again="newGame" @replay="replay" @view="viewRound" />
  </Transition>
  <Transition name="card">
    <div v-if="viewing" class="viewing">
      <span>{{ viewing.loading ? "Loading photosphere" : `${viewing.title} photosphere` }}</span>
      <button class="secondary" type="button" @click="closeView">{{ phase === "summary" ? "Back to results" : "Back to the map" }}</button>
    </div>
  </Transition>
  <SlideBackdrop ref="backdrop" :active="isMenu || intro" :timer="isMenu" />
  <ChallengeScreen :visible="isMenu && Boolean(challenge)" :ready="canPlay" :hard="challenge?.seed.hard" :rounds="challenge?.seed.rounds.length || 0" :score="challenge?.score" :error="seedError" @play="playChallenge" @menu="leaveChallenge" />
  <HomeScreen :visible="isMenu && !challenge" :count="pool.length" :rounds="roundCount" :ready="canPlay" :best="best" :last="last" :average="average" :mode="mode" :seed="seedInput" :seed-error="seedError" @play="newGame" @mode="setMode" @seed="openChallenge" />
  <RoundIntro :visible="intro" :number="status.index" :count="status.count" :progress="status.progress" :label="status.label" :tip="status.tip" :hard="gameHard" :countdown="status.countdown" :steps="COUNTDOWN" :waiting="status.waiting" />
</template>

<style scoped>
.bigmap {
  position: fixed;
  inset: 0;
  z-index: 5;
  background: #000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.45s ease, visibility 0s linear 0.45s;
}

.bigmap.shown {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.45s ease;
}

.bigmap :deep(.map-canvas) {
  cursor: grab;
}

.viewing {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 18px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
}

.viewing span {
  font-size: 14px;
  white-space: nowrap;
}

.viewing button {
  padding: 8px 14px;
  font-size: 13px;
  white-space: nowrap;
}
</style>
