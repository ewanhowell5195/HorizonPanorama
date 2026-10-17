import { MAX_POINTS } from "../../src/lib/game.js"
import { decodePosition } from "../../src/lib/position.js"
import { MISS_METRES } from "../../src/lib/stats.js"

const GAMES = ["hzd", "hfw"]
const HEAT_GUESSES = 256

let schemaReady = null
let answers = null

function loadAnswers(env, request) {
  answers ??= env.ASSETS.fetch(new URL("/photospheres/photospheres.json", request.url)).then(response => response.json()).then(async index => {
    const entries = Object.entries(index).flatMap(([game, list]) => Object.entries(list).map(([name, text]) => ({ name, game, text })))
    return new Map(await Promise.all(entries.map(async ({ name, game, text }) => {
      const [x, y] = await decodePosition(name, text)
      return [name, { game, x, y }]
    })))
  }).catch(error => {
    answers = null
    throw error
  })
  return answers
}

function distance(answer, guess) {
  return guess.game === answer.game ? Math.min(Math.hypot(guess.x - answer.x, guess.y - answer.y), MISS_METRES) : MISS_METRES
}

async function backfillDistances(db, positions) {
  await db.prepare("ALTER TABLE totals ADD COLUMN distance REAL NOT NULL DEFAULT 0").run()
  const { results } = await db.prepare("SELECT name, game, x, y FROM guesses").all()
  const sums = new Map()
  for (const guess of results) {
    const answer = positions.get(guess.name)
    if (answer) {
      sums.set(guess.name, (sums.get(guess.name) || 0) + distance(answer, guess))
    }
  }
  if (sums.size) {
    await db.batch(Array.from(sums, ([name, sum]) => db.prepare("UPDATE totals SET distance = ? WHERE name = ?").bind(sum, name)))
  }
}

function ensureSchema(env, request) {
  const db = env.DB
  schemaReady ??= (async () => {
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS guesses (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL, game TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS totals (name TEXT PRIMARY KEY, count INTEGER NOT NULL, total INTEGER NOT NULL, distance REAL NOT NULL DEFAULT 0)"),
      db.prepare("CREATE INDEX IF NOT EXISTS guesses_name ON guesses (name)")
    ])
    const { results } = await db.prepare("SELECT name FROM pragma_table_info('totals') WHERE name = 'distance'").all()
    if (!results.length) {
      await backfillDistances(db, await loadAnswers(env, request))
    }
  })().catch(error => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

export async function onRequestGet({ env, request }) {
  await ensureSchema(env, request)
  const name = new URL(request.url).searchParams.get("name")
  if (name) {
    const { results } = await env.DB.prepare("SELECT game, x, y FROM guesses WHERE name = ? ORDER BY id DESC LIMIT ?").bind(name, HEAT_GUESSES).all()
    return Response.json(results.map(row => [row.game, row.x, row.y]), { headers: { "Cache-Control": "public, max-age=300" } })
  }
  const { results } = await env.DB.prepare("SELECT name, count, total, distance FROM totals").all()
  return Response.json(Object.fromEntries(results.map(row => [row.name, { count: row.count, average: Math.round(row.total / row.count), distance: Math.round(row.distance / row.count) }])), { headers: { "Cache-Control": "public, max-age=300" } })
}

export async function onRequestPost({ env, request }) {
  const guess = await request.json().catch(() => ({}))
  const { name, score, game, x, y } = guess
  const answer = typeof name === "string" && (await loadAnswers(env, request)).get(name)
  if (!answer || !Number.isInteger(score) || score < 0 || score > MAX_POINTS || !GAMES.includes(game) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return Response.json({ error: "Needs a known photosphere name, a score from 0 to 5000, a game and the guess x and y" }, { status: 400 })
  }
  await ensureSchema(env, request)
  await env.DB.batch([
    env.DB.prepare("INSERT INTO guesses (name, score, game, x, y) VALUES (?1, ?2, ?3, ?4, ?5)").bind(name, score, game, x, y),
    env.DB.prepare("INSERT INTO totals (name, count, total, distance) VALUES (?1, 1, ?2, ?3) ON CONFLICT (name) DO UPDATE SET count = count + 1, total = total + ?2, distance = distance + ?3").bind(name, score, distance(answer, guess))
  ])
  return new Response(null, { status: 204 })
}
