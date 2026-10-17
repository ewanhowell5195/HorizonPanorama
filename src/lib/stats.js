const MIN_PLAYS = 3
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
  const rated = Object.entries(all).filter(([, entry]) => entry.count >= MIN_PLAYS).sort((a, b) => b[1].average - a[1].average)
  rated.forEach(([, entry], n) => entry.difficulty = rated.length > 1 ? 1 + 9 * n / (rated.length - 1) : 5)
  return all
}

export function difficultyColour(difficulty) {
  return difficulty == null ? "#8a8f96" : `hsl(${Math.round(120 - (difficulty - 1) / 9 * 120)} 80% 50%)`
}
