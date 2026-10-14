export const CAULDRONS = ["mu", "chi", "iota", "kappa", "tau"]

export function cauldronFor(round) {
  return CAULDRONS[(round - 1) % CAULDRONS.length]
}
