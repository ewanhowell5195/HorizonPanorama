import { MAX_POINTS } from "./game.js"

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
    scores = fetch("/api/scores").then(response => response.ok ? response.json() : Promise.reject(new Error(`GET /api/scores: ${response.status}`))).then(rankDifficulty).catch(error => {
      console.warn(error)
      scores = null
      return {}
    })
  }
  return scores
}

function rankDifficulty(all) {
  const ranked = Object.values(all).sort((a, b) => b.average - a.average)
  ranked.forEach((entry, n) => entry.difficulty = ranked.length > 1 ? 1 + 9 * n / (ranked.length - 1) : 5)
  return all
}

export function scoreColour(stats) {
  return stats ? `hsl(${Math.round(stats.average / MAX_POINTS * 120)} 80% 50%)` : "#8a8f96"
}
