const VERSION = "1"
const EPOCH = Date.UTC(2020, 0, 1) / 1000
const TIME_DIGITS = 6
const VIEW_DIGITS = 3
const YAW_STEP = 2
const PITCH_RANGE = 15
const PITCH_SLOTS = PITCH_RANGE * 2 + 1
const MODES = { n: [false, "both"], h: [true, "both"], f: [false, "hfw"], g: [true, "hfw"], z: [false, "hzd"], y: [true, "hzd"] }

function checksum(text) {
  let sum = 0
  for (let n = 0; n < text.length; n++) {
    sum = (sum * 31 + text.charCodeAt(n)) % 36
  }
  return sum.toString(36)
}

function nameToSeconds(name) {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(name)
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  return Date.UTC(year, month - 1, day, hour, minute, second) / 1000 - EPOCH
}

function secondsToName(seconds) {
  const date = new Date((seconds + EPOCH) * 1000)
  const pad = value => String(value).padStart(2, "0")
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
}

function encodeView(yaw, pitch) {
  const degrees = ((yaw * 180 / Math.PI) % 360 + 360) % 360
  const yawSlot = Math.round(degrees / YAW_STEP) % (360 / YAW_STEP)
  const pitchSlot = Math.min(Math.max(Math.round(pitch * 180 / Math.PI), -PITCH_RANGE), PITCH_RANGE) + PITCH_RANGE
  return (yawSlot * PITCH_SLOTS + pitchSlot).toString(36).padStart(VIEW_DIGITS, "0")
}

function decodeView(text) {
  const value = parseInt(text, 36)
  return { yaw: Math.floor(value / PITCH_SLOTS) * YAW_STEP * Math.PI / 180, pitch: (value % PITCH_SLOTS - PITCH_RANGE) * Math.PI / 180 }
}

export function snapView(view) {
  return decodeView(encodeView(view.yaw, view.pitch))
}

export function encodeSeed({ hard, games, rounds }) {
  const mode = Object.keys(MODES).find(key => MODES[key][0] === hard && MODES[key][1] === games)
  const body = VERSION + mode + rounds.map(round => nameToSeconds(round.name).toString(36).padStart(TIME_DIGITS, "0") + encodeView(round.view.yaw, round.view.pitch)).join("")
  return body + checksum(body)
}

export function seedLink(code, score) {
  return `${location.origin}${import.meta.env.BASE_URL}challenge?seed=${code}${Number.isInteger(score) ? `&score=${score}` : ""}`
}

export function decodeScore(input, max) {
  const match = /[?&]score=(\d+)/.exec(String(input || ""))
  const score = match ? Number(match[1]) : null
  return score !== null && score <= max ? score : null
}

export function decodeSeed(input) {
  const text = String(input || "").trim()
  const fromLink = /[?&]seed=([0-9a-z]+)/i.exec(text)
  const code = (fromLink ? fromLink[1] : text).toLowerCase()
  const roundLength = TIME_DIGITS + VIEW_DIGITS
  if (!/^[0-9a-z]+$/.test(code) || code[0] !== VERSION || !MODES[code[1]] || (code.length - 3) % roundLength !== 0 || code.length <= 3) {
    return null
  }
  const body = code.slice(0, -1)
  if (checksum(body) !== code.slice(-1)) {
    return null
  }
  const rounds = []
  for (let at = 2; at < body.length; at += roundLength) {
    const name = secondsToName(parseInt(body.slice(at, at + TIME_DIGITS), 36))
    rounds.push({ name, view: decodeView(body.slice(at + TIME_DIGITS, at + roundLength)) })
  }
  const [hard, games] = MODES[code[1]]
  return { code, hard, games, rounds }
}
