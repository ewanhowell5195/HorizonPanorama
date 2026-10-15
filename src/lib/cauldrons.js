// CARD_NAMES in tools/game/build_cauldrons.py
export const CAULDRONS = ["mu", "chi", "iota", "kappa", "theta"]
const cardBlobs = new Map()

export function cauldronFor(round) {
  return CAULDRONS[(round - 1) % CAULDRONS.length]
}

export function loadCard(name) {
  if (!cardBlobs.has(name)) {
    cardBlobs.set(name, fetch(`/cauldrons/card-${name}.webp`).then(response => response.ok ? response.blob() : Promise.reject(new Error(response.status))).catch(error => {
      cardBlobs.delete(name)
      throw error
    }))
  }
  return cardBlobs.get(name)
}
