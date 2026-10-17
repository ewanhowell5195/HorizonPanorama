import { execFile, spawn } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const run = promisify(execFile)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.dirname(HERE)
const INBOX = path.join(HERE, "captures")
const STEAM = "C:/Program Files (x86)/Steam/steamapps/common"
const SOURCES = [
  [INBOX, "hfw"],
  [`${STEAM}/Horizon Zero Dawn Remastered/nativemods/Photosphere/photospheres`, "hzd"],
  [`${STEAM}/Horizon Forbidden West Complete Edition/nativemods/Photosphere/photospheres`, "hfw"]
]
const OUT = path.join(ROOT, "public", "photospheres")
const INDEX = path.join(OUT, "photospheres.json")
const REMOVED = path.join(HERE, "removed.json")
const LATEST = path.join(HERE, "latest.json")
const ENCODER = path.join(HERE, "encoder")
const ENCODER_EXE = path.join(ENCODER, "target", "release", "encoder.exe")
const QUALITY = 85
const PARALLEL = 3
const WRITE_ATTEMPTS = 6
const DEPTH = 8
const SECRET = "horizon-panorama"

function hide(name, position) {
  const key = crypto.createHash("sha256").update(SECRET + name).digest()
  const data = Buffer.alloc(12)
  position.forEach((value, n) => data.writeFloatLE(value, n * 4))
  return data.map((value, n) => value ^ key[n]).toString("base64")
}

async function isFile(file) {
  try {
    return (await fs.promises.stat(file)).isFile()
  } catch {
    return false
  }
}

function finished(child, name) {
  let errors = ""
  child.stderr.on("data", data => errors += data)
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${name}: ${errors.trim() || `exit code ${code}`}`)))
  })
}

async function convert(source, target) {
  const decoder = spawn("ffmpeg", ["-v", "error", "-i", source, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb48le", "-"])
  const encoder = spawn(ENCODER_EXE, [String(QUALITY), String(DEPTH), target])
  decoder.stdout.pipe(encoder.stdin)
  await Promise.all([finished(decoder, "ffmpeg"), finished(encoder, "encoder")])
}

async function pool(items, size, work) {
  let next = 0
  async function worker() {
    while (next < items.length) {
      await work(items[next++])
    }
  }
  await Promise.all(Array.from({ length: size }, worker))
}

async function buildEncoder() {
  await run("cargo", ["build", "--release", "--quiet", "--manifest-path", path.join(ENCODER, "Cargo.toml")])
}

async function readJson(file, fallback) {
  return await isFile(file) ? JSON.parse(await fs.promises.readFile(file, "utf8")) : fallback
}

async function readIndex() {
  const index = await readJson(INDEX, {})
  for (const spheres of Object.values(index)) {
    for (const [name, value] of Object.entries(spheres)) {
      if (Array.isArray(value)) {
        spheres[name] = hide(name, value)
      }
    }
  }
  return index
}

async function saveRemoved(removed) {
  await fs.promises.writeFile(REMOVED, `${JSON.stringify(Array.from(removed).sort(), null, 2)}\n`)
}

async function save(index) {
  const games = Object.keys(index).sort().map(game => {
    const spheres = Object.keys(index[game]).sort().map(name => `    ${JSON.stringify(name)}: ${JSON.stringify(index[game][name])}`)
    return `  ${JSON.stringify(game)}: {\n${spheres.join(",\n")}\n  }`
  })
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.promises.writeFile(INDEX, `{\n${games.join(",\n")}\n}\n`)
      return
    } catch (error) {
      if (attempt >= WRITE_ATTEMPTS) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 250 * attempt))
    }
  }
}

async function captures() {
  const found = []
  for (const [folder, game] of SOURCES) {
    let names
    try {
      names = await fs.promises.readdir(folder)
    } catch {
      continue
    }
    for (const name of names.filter(name => name.endsWith(".json"))) {
      found.push({ file: path.join(folder, name), game })
    }
  }
  return found.sort((a, b) => a.file.localeCompare(b.file))
}

async function remove(names) {
  if (!names.length) {
    console.log("Give the names of the photospheres to remove, eg remove.bat 20261012-033746")
    return
  }
  const index = await readIndex()
  const removed = new Set(await readJson(REMOVED, []))
  for (const name of names.map(name => path.basename(name).replace(/\.(avif|png|json)$/, ""))) {
    const games = Object.keys(index).filter(game => index[game][name])
    games.forEach(game => delete index[game][name])
    const target = path.join(OUT, `${name}.avif`)
    const had = await isFile(target)
    await fs.promises.rm(target, { force: true })
    removed.add(name)
    console.log(`${name}: ${games.length || had ? "removed" : "not imported, but it will not be imported from now on"}`)
  }
  await save(index)
  await saveRemoved(removed)
}

async function importAll() {
  await fs.promises.mkdir(INBOX, { recursive: true })
  await fs.promises.mkdir(OUT, { recursive: true })
  const index = await readIndex()
  const removed = new Set(await readJson(REMOVED, []))
  const jobs = []
  let imported = 0
  for (const { file, game: defaultGame } of await captures()) {
    const name = path.basename(file, ".json")
    if (removed.has(name)) {
      continue
    }
    const info = JSON.parse(await fs.promises.readFile(file, "utf8"))
    const game = info.game || defaultGame
    let source = null
    for (const extension of [".avif", ".png"]) {
      const candidate = file.slice(0, -5) + extension
      if (!source && await isFile(candidate)) {
        source = candidate
      }
    }
    if (!source || !info.complete || !info.position) {
      console.log(`${name}: skipped, no image or an incomplete capture`)
      continue
    }
    const target = path.join(OUT, `${name}.avif`)
    if (await isFile(target) && index[game]?.[name]) {
      continue
    }
    jobs.push({ name, game, source, target, position: info.position })
  }
  if (jobs.length) {
    await buildEncoder()
  }
  let saving = Promise.resolve()
  const latest = []
  await pool(jobs, PARALLEL, async ({ name, game, source, target, position }) => {
    try {
      await convert(source, target)
    } catch (error) {
      await fs.promises.rm(target, { force: true })
      console.log(`${name}: failed, ${error.message}`)
      return
    }
    index[game] ??= {}
    index[game][name] = hide(name, position.map(value => Math.round(value * 100) / 100))
    latest.push(name)
    saving = saving.then(() => save(index)).then(() => fs.promises.writeFile(LATEST, `${JSON.stringify(latest.slice().sort(), null, 2)}\n`))
    await saving
    imported++
    const megabytes = async file => ((await fs.promises.stat(file)).size / 1024 ** 2).toFixed(1)
    console.log(`${name}: ${await megabytes(source)} MB -> ${await megabytes(target)} MB`)
  })
  await save(index)
  console.log(`${imported} imported`)
}

const [command, ...args] = process.argv.slice(2)
if (command === "remove") {
  await remove(args)
} else {
  await importAll()
}
