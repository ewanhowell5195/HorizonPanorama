const FROZEN_WILDS_TILES = new Set([[2, 3], [3, 2], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [8, 3], [8, 4], [8, 5]].map(([x, y]) => `${x},${y}`))
const PIECE_LOCATIONS = { "hfw-shores": "burningShores", "hfw-east": "farZenith" }

export function tileLocation(game, pieceId, tileX, tileY) {
  if (game === "hzd") {
    return FROZEN_WILDS_TILES.has(`${tileX},${tileY}`) ? "frozenWilds" : "zeroDawn"
  }
  return PIECE_LOCATIONS[pieceId] || "forbiddenWest"
}

export function pointLocation(world, game, x, y) {
  const tileMetres = world.games[game].tileMetres
  const tileX = Math.floor(x / tileMetres), tileY = Math.floor(y / tileMetres)
  const pieces = world.layers.filter(layer => layer.game === game)
  const piece = pieces.find(layer => layer.regions.some(([x0, y0, x1, y1]) => tileX >= x0 && tileX <= x1 && tileY >= y0 && tileY <= y1)) || pieces[0]
  return tileLocation(game, piece.id, tileX, tileY)
}
