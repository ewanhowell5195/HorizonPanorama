import { MAX_POINTS } from "../../src/lib/game.js"

const GAMES = ["hzd", "hfw"]

let schemaReady = null
let photospheres = null

function ensureSchema(db) {
  schemaReady ??= db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS guesses (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL, game TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS totals (name TEXT PRIMARY KEY, count INTEGER NOT NULL, total INTEGER NOT NULL)")
  ]).catch(error => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

async function exists(env, request, name) {
  photospheres ??= env.ASSETS.fetch(new URL("/photospheres/photospheres.json", request.url)).then(response => response.json())
  const index = await photospheres
  return Object.values(index).some(list => Object.hasOwn(list, name))
}

export async function onRequestGet({ env }) {
  await ensureSchema(env.DB)
  const { results } = await env.DB.prepare("SELECT name, count, total FROM totals").all()
  return Response.json(Object.fromEntries(results.map(row => [row.name, { count: row.count, average: Math.round(row.total / row.count) }])), { headers: { "Cache-Control": "public, max-age=300" } })
}

export async function onRequestPost({ env, request }) {
  const { name, score, game, x, y } = await request.json().catch(() => ({}))
  if (typeof name !== "string" || !Number.isInteger(score) || score < 0 || score > MAX_POINTS || !GAMES.includes(game) || !Number.isFinite(x) || !Number.isFinite(y) || !await exists(env, request, name)) {
    return Response.json({ error: "Needs a known photosphere name, a score from 0 to 5000, a game and the guess x and y" }, { status: 400 })
  }
  await ensureSchema(env.DB)
  await env.DB.batch([
    env.DB.prepare("INSERT INTO guesses (name, score, game, x, y) VALUES (?1, ?2, ?3, ?4, ?5)").bind(name, score, game, x, y),
    env.DB.prepare("INSERT INTO totals (name, count, total) VALUES (?1, 1, ?2) ON CONFLICT (name) DO UPDATE SET count = count + 1, total = total + ?2").bind(name, score)
  ])
  return new Response(null, { status: 204 })
}
