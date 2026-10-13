export const RULES = [
  { id: "pan", name: "Looking around", detail: "Drag or use the arrow keys" },
  { id: "zoom", name: "Zooming", detail: "Scroll or pinch to zoom in" },
  { id: "compass", name: "Compass", detail: "Which way you are facing" },
  { id: "icons", name: "Map icons", detail: "Campfires and machine sites" },
  { id: "map3d", name: "3D map", detail: "Orbit the map in 3D" },
  { id: "readouts", name: "Map readouts", detail: "Scale bar and elevation" }
]

const ALL = Object.fromEntries(RULES.map(rule => [rule.id, true]))

export const MODE_RULES = { normal: ALL, hard: Object.assign({}, ALL, { pan: false, zoom: false }) }

export function fullRules(rules) {
  return Object.fromEntries(RULES.map(rule => [rule.id, rules?.[rule.id] !== false]))
}

export function modeOf(rules) {
  return Object.keys(MODE_RULES).find(mode => RULES.every(rule => MODE_RULES[mode][rule.id] === rules[rule.id])) || "custom"
}

export function rulesToBits(rules) {
  return RULES.reduce((bits, rule, n) => bits | (rules[rule.id] ? 1 << n : 0), 0)
}

export function bitsToRules(bits) {
  return Object.fromEntries(RULES.map((rule, n) => [rule.id, Boolean(bits & 1 << n)]))
}

export function missingRules(rules) {
  return RULES.filter(rule => !rules[rule.id]).map(rule => rule.name.toLowerCase())
}
