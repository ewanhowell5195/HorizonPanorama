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

export const TRIBES = [
  { id: "tribeNora", tribe: "nora", name: "Nora", games: ["hzd"] },
  { id: "tribeBanuk", tribe: "banuk", name: "Banuk", games: ["hzd"] },
  { id: "tribeCarja", tribe: "carja", name: "Carja", games: ["hzd", "hfw"] },
  { id: "tribeShadowCarja", tribe: "shadowCarja", name: "Shadow Carja", games: ["hzd"] },
  { id: "tribeOseram", tribe: "oseram", name: "Oseram", games: ["hzd", "hfw"] },
  { id: "tribeUtaru", tribe: "utaru", name: "Utaru", games: ["hfw"] },
  { id: "tribeTenakthLowlandClan", tribe: "tenakthLowlandClan", name: "Tenakth Lowland Clan", games: ["hfw"] },
  { id: "tribeTenakthDesertClan", tribe: "tenakthDesertClan", name: "Tenakth Desert Clan", games: ["hfw"] },
  { id: "tribeTenakthSkyClan", tribe: "tenakthSkyClan", name: "Tenakth Sky Clan", games: ["hfw"] },
  { id: "tribeQuen", tribe: "quen", name: "Quen", games: ["hfw"] },
  { id: "tribeFarZenith", tribe: "farZenith", name: "Far Zenith", games: ["hfw"] },
  { id: "tribeNone", tribe: null, name: "No tribe", games: ["hzd", "hfw"] }
]

const SETTINGS = RULES.concat(LOCATIONS, TRIBES)
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

export function wholeGames(rules) {
  return ["hzd", "hfw"].every(game => {
    const states = LOCATIONS.filter(location => location.game === game).map(location => rules[location.id])
    return states.every(Boolean) || !states.some(Boolean)
  })
}

export function tribesOf(games) {
  return TRIBES.filter(tribe => games === "both" || tribe.games.includes(games))
}

export function offTribes(rules) {
  return tribesOf(gamesOf(rules)).filter(tribe => !rules[tribe.id])
}

export function modeOf(rules) {
  const mode = Object.keys(MODE_RULES).find(name => RULES.every(rule => MODE_RULES[name][rule.id] === rules[rule.id]))
  return mode && wholeGames(rules) && !offTribes(rules).length ? mode : "custom"
}

export function rulesToBits(rules) {
  return SETTINGS.reduce((bits, setting, n) => bits | (rules[setting.id] ? 1 << n : 0), 0)
}

export function bitsToRules(bits) {
  return Object.fromEntries(SETTINGS.map((setting, n) => [setting.id, Boolean(bits & 1 << n)]))
}

export function tribeRule(tribe) {
  return TRIBES.find(entry => entry.tribe === tribe)?.id || "tribeNone"
}

export function missingRules(rules) {
  return RULES.filter(rule => !rules[rule.id]).map(rule => rule.name.toLowerCase())
}

export function locationNames(rules) {
  return LOCATIONS.filter(location => rules[location.id]).map(location => location.name)
}
