export const RULES = [
  { id: "pan", name: "Looking around", detail: "Drag or use the arrow keys" },
  { id: "zoom", name: "Zooming", detail: "Scroll or pinch to zoom in" },
  { id: "compass", name: "Compass", detail: "Which way you are facing" },
  { id: "icons", name: "Map icons", detail: "Campfires, machine sites and more" },
  { id: "map3d", name: "3D map", detail: "Orbit the map in 3D" },
  { id: "readouts", name: "Map readouts", detail: "Scale bar and elevation" }
]

export const LOCATIONS = [
  { id: "zeroDawn", game: "hzd", name: "Zero Dawn" },
  { id: "frozenWilds", game: "hzd", name: "The Frozen Wilds" },
  { id: "forbiddenWest", game: "hfw", name: "Forbidden West" },
  { id: "burningShores", game: "hfw", name: "Burning Shores" },
  { id: "farZenith", game: "hfw", name: "Far Zenith Launch Facility" }
]

const SETTINGS = RULES.concat(LOCATIONS)
const ALL = Object.fromEntries(SETTINGS.map(setting => [setting.id, true]))

export const MODE_RULES = { normal: ALL, hard: Object.assign({}, ALL, { pan: false, zoom: false }) }

export function fullRules(rules) {
  return Object.fromEntries(SETTINGS.map(setting => [setting.id, rules?.[setting.id] !== false]))
}

export function withGames(rules, games) {
  return Object.assign({}, rules, Object.fromEntries(LOCATIONS.map(location => [location.id, games === "both" || location.game === games])))
}

export function gamesOf(rules) {
  const on = new Set(LOCATIONS.filter(location => rules[location.id]).map(location => location.game))
  return on.size === 1 ? Array.from(on)[0] : "both"
}

function wholeGames(rules) {
  return ["hzd", "hfw"].every(game => {
    const states = LOCATIONS.filter(location => location.game === game).map(location => rules[location.id])
    return states.every(Boolean) || !states.some(Boolean)
  })
}

export function modeOf(rules) {
  const mode = Object.keys(MODE_RULES).find(name => RULES.every(rule => MODE_RULES[name][rule.id] === rules[rule.id]))
  return mode && wholeGames(rules) ? mode : "custom"
}

export function rulesToBits(rules) {
  return SETTINGS.reduce((bits, setting, n) => bits | (rules[setting.id] ? 1 << n : 0), 0)
}

export function bitsToRules(bits) {
  return Object.fromEntries(SETTINGS.map((setting, n) => [setting.id, Boolean(bits & 1 << n)]))
}

export function missingRules(rules) {
  return RULES.filter(rule => !rules[rule.id]).map(rule => rule.name.toLowerCase())
}

export function locationNames(rules) {
  return LOCATIONS.filter(location => rules[location.id]).map(location => location.name)
}
