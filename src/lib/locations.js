const FROZEN_WILDS_TILES = new Set([[3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [8, 3], [8, 4], [8, 5]].map(([x, y]) => `${x},${y}`))
// GAIA Prime is base game content on tile 3,3, which the Frozen Wilds map data also covers
const GAIA_PRIME_CORNER = [1876, 1600]
const PIECE_LOCATIONS = { "hfw-shores": "burningShores", "hfw-east": "farZenith" }

export function tileLocation(game, pieceId, tileX, tileY) {
  if (game === "hzd") {
    return FROZEN_WILDS_TILES.has(`${tileX},${tileY}`) ? "frozenWilds" : "zeroDawn"
  }
  return PIECE_LOCATIONS[pieceId] || "forbiddenWest"
}

export function areaAt(game, pieceId, tileMetres, x, y) {
  if (game === "hzd" && x < GAIA_PRIME_CORNER[0] && y < GAIA_PRIME_CORNER[1]) {
    return "zeroDawn"
  }
  return tileLocation(game, pieceId, Math.floor(x / tileMetres), Math.floor(y / tileMetres))
}

export function pieceAt(world, game, x, y) {
  const tileMetres = world.games[game].tileMetres
  const tileX = Math.floor(x / tileMetres), tileY = Math.floor(y / tileMetres)
  const pieces = world.layers.filter(layer => layer.game === game)
  return pieces.find(layer => layer.regions.some(([x0, y0, x1, y1]) => tileX >= x0 && tileX <= x1 && tileY >= y0 && tileY <= y1)) || pieces[0]
}

export function pointLocation(world, game, x, y) {
  return areaAt(game, pieceAt(world, game, x, y).id, world.games[game].tileMetres, x, y)
}
