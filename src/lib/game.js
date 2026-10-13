export const ROUNDS = 5
export const MAX_POINTS = 5000
const PERFECT_METRES = 25
const FALLOFF_METRES = 2000

export function points(metres) {
  return metres <= PERFECT_METRES ? MAX_POINTS : Math.round(MAX_POINTS * Math.exp(-(metres - PERFECT_METRES) / FALLOFF_METRES))
}

export function formatDistance(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres < 10000 ? 2 : 1)} km`
}

export function shuffle(list) {
  const copy = list.slice()
  for (let n = copy.length - 1; n > 0; n--) {
    const k = Math.floor(Math.random() * (n + 1))
    const swap = copy[n]
    copy[n] = copy[k]
    copy[k] = swap
  }
  return copy
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function readStore(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
