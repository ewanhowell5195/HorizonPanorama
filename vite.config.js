import fs from "node:fs"
import path from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

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

function reloadWebGL() {
  const owners = ["App.vue", "MapView.vue", "PhotoSphere.vue", "SlideBackdrop.vue"]
  const scripts = new Map()
  const scriptOf = code => code.match(/<script[\s\S]*?<\/script>/)?.[0]
  return {
    name: "reload-webgl",
    apply: "serve",
    enforce: "pre",
    transform(code, id) {
      if (owners.includes(path.basename(id))) {
        scripts.set(id, scriptOf(code))
      }
    },
    async handleHotUpdate({ file, server, read }) {
      const name = path.basename(file)
      let reload = file.includes("/src/lib/")
      if (owners.includes(name)) {
        const script = scriptOf(await read())
        reload = scripts.has(file) && scripts.get(file) !== script
        scripts.set(file, script)
      }
      if (reload) {
        server.ws.send({ type: "full-reload" })
        return []
      }
    }
  }
}

export default defineConfig({
  plugins: [reloadWebGL(), vue(), minifyJson()],
  server: { host: "127.0.0.1", port: 9123, strictPort: true, proxy: { "/api": { target: "https://horizonwayfind.ing", changeOrigin: true } } }
})
