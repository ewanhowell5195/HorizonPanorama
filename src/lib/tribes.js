import { pieceAt } from "./locations.js"

const UNIT_METRES = 256
const SEARCH_PIXELS = 4

export async function loadTribes() {
  const data = await (await fetch("/map/tribes/tribes.json")).json()
  const maps = {}
  for (const [game, info] of Object.entries(data)) {
    const bitmap = await createImageBitmap(await (await fetch(`/map/tribes/${game}.webp`)).blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" })
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    maps[game] = { info, width: bitmap.width, height: bitmap.height, pixels: context.getImageData(0, 0, bitmap.width, bitmap.height).data }
    bitmap.close()
  }
  return maps
}

export function tribeAt(maps, world, game, x, y) {
  const map = maps[game]
  if (!map) {
    return null
  }
  const piece = pieceAt(world, game, x, y)
  const { scale, originX, originY } = map.info.frame
  const px = Math.floor(originX + (piece.offsetMetres[0] + x) / UNIT_METRES * scale)
  const py = Math.floor(originY - (piece.offsetMetres[1] + y) / UNIT_METRES * scale)
  let best = null
  for (let dy = -SEARCH_PIXELS; dy <= SEARCH_PIXELS; dy++) {
    for (let dx = -SEARCH_PIXELS; dx <= SEARCH_PIXELS; dx++) {
      const sx = px + dx, sy = py + dy
      if (sx < 0 || sy < 0 || sx >= map.width || sy >= map.height) {
        continue
      }
      const index = map.pixels[(sy * map.width + sx) * 4]
      const distance = dx * dx + dy * dy
      if (index && (!best || distance < best.distance)) {
        best = { distance, index }
      }
    }
  }
  return best ? map.info.tribes[best.index - 1] : null
}
