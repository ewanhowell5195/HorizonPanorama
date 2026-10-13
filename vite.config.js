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

export default defineConfig({
  plugins: [vue(), minifyJson()],
  server: { port: 9123, strictPort: true }
})
