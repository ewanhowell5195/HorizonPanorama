// CARD_NAMES in tools/game/build_cauldrons.py
export const CAULDRONS = ["mu", "chi", "iota", "kappa", "theta"]
const cardBlobs = new Map()

export function cauldronFor(round) {
  return CAULDRONS[(round - 1) % CAULDRONS.length]
}

export function loadOnce(url) {
  if (!cardBlobs.has(url)) {
    cardBlobs.set(url, fetch(url).then(response => response.ok ? response.blob() : Promise.reject(new Error(response.status))).catch(error => {
      cardBlobs.delete(url)
      throw error
    }))
  }
  return cardBlobs.get(url)
}

export function loadCard(name) {
  return loadOnce(`/cauldrons/card-${name}.avif`)
}
