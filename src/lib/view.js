const WIDTH = 512
const HEIGHT = 256
const VERTICAL_FOV = 75 * Math.PI / 180
const CANDIDATES = 36
const KEEP = 0.6
const SMOOTH = 0.025
const MAX_PITCH = 15 * Math.PI / 180
const PITCH_STEP = 5 * Math.PI / 180
const ASPECT = 16 / 9

function band() {
  return { r: 0, g: 0, b: 0, edge: 0, smooth: 0, count: 0 }
}

export function pickView(image, random) {
  const context = new OffscreenCanvas(WIDTH, HEIGHT).getContext("2d", { willReadFrequently: true })
  context.drawImage(image, 0, 0, WIDTH, HEIGHT)
  const pixels = context.getImageData(0, 0, WIDTH, HEIGHT).data
  const light = new Float32Array(WIDTH * HEIGHT)
  for (let n = 0; n < light.length; n++) {
    light[n] = (pixels[n * 4] * 0.2126 + pixels[n * 4 + 1] * 0.7152 + pixels[n * 4 + 2] * 0.0722) / 255
  }
  const edge = new Float32Array(WIDTH * HEIGHT)
  for (let y = 0; y < HEIGHT - 1; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const n = y * WIDTH + x
      edge[n] = Math.abs(light[y * WIDTH + (x + 1) % WIDTH] - light[n]) + Math.abs(light[n + WIDTH] - light[n])
    }
  }
  const horizontalFov = 2 * Math.atan(Math.tan(VERTICAL_FOV / 2) * ASPECT)
  const halfWidth = Math.round(horizontalFov / (2 * Math.PI) * WIDTH / 2)

  function score(yaw, pitch) {
    const top = Math.max(Math.round((0.5 - (pitch + VERTICAL_FOV / 2) / Math.PI) * HEIGHT), 0)
    const bottom = Math.min(Math.round((0.5 - (pitch - VERTICAL_FOV / 2) / Math.PI) * HEIGHT), HEIGHT - 1)
    const bandRows = Math.round((bottom - top) * 0.35)
    const centre = Math.round((yaw / (2 * Math.PI) + 0.5) * WIDTH)
    const upper = band()
    const lower = band()
    let sum = 0, squares = 0, count = 0
    for (let y = top; y < bottom; y++) {
      const part = y < top + bandRows ? upper : y >= bottom - bandRows ? lower : null
      for (let dx = -halfWidth; dx <= halfWidth; dx += 2) {
        const n = y * WIDTH + ((centre + dx) % WIDTH + WIDTH) % WIDTH
        sum += light[n]
        squares += light[n] * light[n]
        count++
        if (part) {
          part.r += pixels[n * 4] / 255
          part.g += pixels[n * 4 + 1] / 255
          part.b += pixels[n * 4 + 2] / 255
          part.edge += edge[n]
          part.smooth += edge[n] < SMOOTH ? 1 : 0
          part.count++
        }
      }
    }
    const mean = sum / count
    const spread = Math.sqrt(Math.max(squares / count - mean * mean, 0))
    const colourDiff = Math.hypot(upper.r / upper.count - lower.r / lower.count, upper.g / upper.count - lower.g / lower.count, upper.b / upper.count - lower.b / lower.count)
    const edgeDiff = Math.abs(upper.edge / upper.count - lower.edge / lower.count)
    return colourDiff * 2 + edgeDiff * 6 + upper.smooth / upper.count * 0.5 + spread
  }

  const headings = []
  for (let k = 0; k < CANDIDATES; k++) {
    const yaw = k / CANDIDATES * Math.PI * 2 - Math.PI
    headings.push({ yaw, score: score(yaw, 0) })
  }
  const bar = Math.max(...headings.map(heading => heading.score)) * KEEP
  const good = headings.filter(heading => heading.score >= bar)
  const yaw = good[Math.floor(random() * good.length)].yaw + (random() - 0.5) * (2 * Math.PI / CANDIDATES)
  const tilts = []
  for (let pitch = -MAX_PITCH; pitch <= MAX_PITCH + 1e-6; pitch += PITCH_STEP) {
    if (score(yaw, pitch) >= bar) {
      tilts.push(pitch)
    }
  }
  const tilt = tilts.length ? tilts[Math.floor(random() * tilts.length)] : 0
  const pitch = Math.min(Math.max(tilt + (random() - 0.5) * PITCH_STEP, -MAX_PITCH), MAX_PITCH)
  return { yaw, pitch }
}
