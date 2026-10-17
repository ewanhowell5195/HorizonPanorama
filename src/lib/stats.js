import { MAX_POINTS } from "./game.js"

export const MISS_METRES = 10000
const PRIOR_GUESSES = 2
const SCALE_PERCENTILE = 0.05
// the Cache-Control max-age in functions/api/scores.js
const REFRESH_MS = 300000

let scores = null
let loadedAt = 0

export function recordGuess(name, guess) {
  fetch("/api/scores", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ name }, guess)) }).then(response => {
    if (!response.ok) {
      throw new Error(`POST /api/scores: ${response.status}`)
    }
  }).catch(error => console.warn(error))
}

export function loadScores() {
  if (!scores || performance.now() - loadedAt > REFRESH_MS) {
    loadedAt = performance.now()
    scores = fetch("/api/scores", { cache: "no-cache" }).then(response => response.ok ? response.json() : Promise.reject(new Error(`GET /api/scores: ${response.status}`))).then(rankDifficulty).catch(error => {
      console.warn(error)
      scores = null
      return {}
    })
  }
  return scores
}

function percentile(sorted, fraction) {
  const at = (sorted.length - 1) * fraction
  const below = Math.floor(at)
  return sorted[below] + (sorted[Math.min(below + 1, sorted.length - 1)] - sorted[below]) * (at - below)
}

function rankDifficulty(all) {
  const entries = Object.values(all)
  const guesses = entries.reduce((sum, entry) => sum + entry.count, 0)
  const mean = entries.reduce((sum, entry) => sum + entry.distance * entry.count, 0) / guesses
  entries.forEach(entry => entry.weighted = (entry.distance * entry.count + mean * PRIOR_GUESSES) / (entry.count + PRIOR_GUESSES))
  const sorted = entries.map(entry => entry.weighted).sort((a, b) => a - b)
  const low = percentile(sorted, SCALE_PERCENTILE), high = percentile(sorted, 1 - SCALE_PERCENTILE)
  entries.forEach(entry => entry.difficulty = high > low ? Math.round(10 + 90 * Math.min(Math.max((entry.weighted - low) / (high - low), 0), 1)) / 10 : 5)
  return all
}

export function scoreColour(stats) {
  return stats ? `hsl(${Math.round(stats.average / MAX_POINTS * 120)} 80% 50%)` : "#8a8f96"
}

export function loadGuesses(name) {
  return fetch(`/api/scores?name=${encodeURIComponent(name)}`, { cache: "no-cache" }).then(response => response.ok ? response.json() : Promise.reject(new Error(`GET /api/scores?name=${name}: ${response.status}`)))
}
