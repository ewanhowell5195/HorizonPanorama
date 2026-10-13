import fs from "node:fs"
import path from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

const PHOTOSPHERES = "C:/Program Files (x86)/Steam/steamapps/common/Horizon Forbidden West Complete Edition/nativemods/Photosphere/photospheres"
const TYPES = { ".avif": "image/avif", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" }

async function listRounds() {
  let names
  try {
    names = await fs.promises.readdir(PHOTOSPHERES)
  } catch {
    return []
  }
  const rounds = []
  for (const name of names.filter(entry => entry.endsWith(".json")).sort()) {
    const stem = name.slice(0, -5)
    if (!names.includes(`${stem}.avif`)) {
      continue
    }
    try {
      const info = JSON.parse(await fs.promises.readFile(path.join(PHOTOSPHERES, name), "utf8"))
      if (info.complete && info.position) {
        const [x, y, z] = info.position
        rounds.push({ name: stem, game: "hfw", x, y, z })
      }
    } catch {}
  }
  return rounds
}

async function sendFile(response, file) {
  let stat
  try {
    stat = await fs.promises.stat(file)
  } catch {
    stat = null
  }
  if (!stat?.isFile()) {
    response.statusCode = 404
    response.end()
    return
  }
  const extension = path.extname(file).toLowerCase()
  response.setHeader("Content-Type", TYPES[extension] || "application/octet-stream")
  response.setHeader("Content-Length", stat.size)
  response.setHeader("Cache-Control", extension === ".json" ? "no-store" : "no-cache")
  fs.createReadStream(file).pipe(response)
}

function horizonData() {
  return {
    name: "horizon-data",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = decodeURIComponent(request.url.split("?")[0])
        if (url === "/rounds.json") {
          const body = JSON.stringify(await listRounds())
          response.setHeader("Content-Type", "application/json")
          response.setHeader("Cache-Control", "no-store")
          response.end(body)
          return
        }
        const sphere = url.match(/^\/photospheres\/(\d{8}-\d{6})\.avif$/)
        if (sphere) {
          await sendFile(response, path.join(PHOTOSPHERES, `${sphere[1]}.avif`))
          return
        }
        next()
      })
    }
  }
}

function minifyJson() {
  let outDir
  return {
    name: "minify-json",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const files = (await fs.promises.readdir(outDir, { recursive: true })).filter(file => file.endsWith(".json"))
      for (const file of files) {
        const full = path.join(outDir, file)
        await fs.promises.writeFile(full, JSON.stringify(JSON.parse(await fs.promises.readFile(full, "utf8"))))
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), horizonData(), minifyJson()],
  server: { port: 9123, strictPort: true }
})
