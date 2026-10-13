import { createCompass } from "./compass.js"

const UNIT_METRES = 256
const HATCH_METRES = 128
const FOV = 30 * Math.PI / 180
const MESH = 128
const MESH_SIZES = [8, 16, 32, 64, 128]
const QUAD_PIXELS = { flat: 16, relief: 8 }
const TILE_PIXELS = 1024
const MAX_INFLIGHT = 6
const MAX_TILES = 96
const KEEP_LEVELS = 3
const LOD_SCALE = 0.85
const UPLOAD_BUDGET_MS = 4
const PREFETCH_CHILDREN = 16
const PREFETCH_NEIGHBOURS = 16
const CLICK_DISTANCE = 6
const FIT_TOP = 48
const FLIGHT_MS = 900
// HFW MapResource (group 72333) WidthInWorldCoords
const MAP_WIDTH_METRES = 5760
const POI_ZOOM = { "campfire": 5, "machine-site": 5, "settlement": 2, "tallneck": 3.5 }
const POI_MARGIN = 40
const POI_HOVER_RADIUS = 24
const POI_SPACING = 44
const POI_OCCLUSION_RADIUS = 30
const POI_OCCLUSION_SAMPLES = 8
const OCCLUSION_STEPS = 32
const OCCLUSION_END = 0.97
const POI_SPREAD_PASSES = 4
// covers the 0.3 s .map-poi opacity transition in styles.css
const POI_FADE_MS = 350
const SCALE_TARGET = 90
const SCALE_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
// MapProjectionSettings MaxDepth / StoredDepthScale: the full 0 to 255 height range in metres
const DEPTH_METRES = 2048 / 3
const MAX_TILT = 85 * Math.PI / 180
const START_TILT = 55 * Math.PI / 180
const ORBIT_SPEED = 0.006
const CAMERA_CLEARANCE_METRES = 10
const CAMERA_FLOOR_METRES = 1
const SPIN_DECAY = 4
const SPIN_MAX = 6
const SPIN_STOP = 0.01
const SPIN_HOLD_MS = 80
const SPIN_CARRY = 0.5

const vertexSource = `#version 300 es
  precision highp float;
  in vec3 aGrid;
  uniform mat4 uViewProj;
  uniform vec3 uRect;
  uniform vec4 uUv;
  uniform float uRelief;
  uniform float uSkirt;
  uniform sampler2D uDepth;
  uniform sampler2D uBorder;
  uniform vec4 uDomain;
  out vec2 vUv;
  out vec2 vWorld;
  out float vSkirt;
  void main() {
    vec2 world = vec2(uRect.x + aGrid.x * uRect.z, uRect.y - aGrid.y * uRect.z);
    vec2 uv = uUv.xy + aGrid.xy * uUv.zw;
    vec2 grid = vec2(textureSize(uDepth, 0));
    float depth = textureLod(uDepth, (uv * (grid - 1.0) + 0.5) / grid, 0.0).r;
    float mask = textureLod(uBorder, vec2((world.x - uDomain.x) / uDomain.z, (uDomain.y - world.y) / uDomain.w), 0.0).r;
    float edge = (clamp((mask - 0.5) / 0.3, 0.0, 1.0) + clamp((mask - 0.2) / 0.3, 0.0, 1.0)) * 0.5;
    float height = depth * uRelief - aGrid.z * uSkirt * clamp((edge - 0.3) / 0.7, 0.0, 1.0);
    vUv = uv;
    vWorld = world;
    vSkirt = aGrid.z;
    gl_Position = uViewProj * vec4(world, height, 1.0);
  }`

const fragmentSource = `#version 300 es
  precision highp float;
  in vec2 vUv;
  in vec2 vWorld;
  in float vSkirt;
  uniform float uSolid;
  uniform sampler2D uColor;
  uniform sampler2D uBorder;
  uniform sampler2D uHatch;
  uniform sampler2D uOccupancy;
  uniform vec4 uDomain;
  uniform vec3 uGrid;
  uniform vec2 uOffset;
  out vec4 outColor;
  void main() {
    float present = texture(uOccupancy, vec2(vWorld.x - uGrid.x, uGrid.y - vWorld.y) / uGrid.z).r;
    vec2 borderUv = vec2((vWorld.x - uDomain.x) / uDomain.z, (uDomain.y - vWorld.y) / uDomain.w);
    float mask = texture(uBorder, borderUv).r;
    float hatch = clamp(texture(uHatch, vec2(vWorld.x - uOffset.x, uOffset.y - vWorld.y) * ${(UNIT_METRES / HATCH_METRES).toFixed(4)}).r, 0.0, 1.0);
    float edge = (clamp((mask - 0.5) / 0.3, 0.0, 1.0) + clamp((mask - 0.2) / 0.3, 0.0, 1.0)) * 0.5;
    float fog = clamp(1.0 - clamp((hatch * 0.4 - 0.7 + edge) * 50.0, 0.0, 1.0), 0.0, 1.0);
    float alpha = (1.0 - fog) * step(0.5, present);
    if (alpha <= 0.0) {
      discard;
    }
    float shade = 1.0 - uSolid * step(0.001, vSkirt);
    outColor = gl_FrontFacing ? vec4(texture(uColor, vUv).rgb * alpha * shade, alpha) : vec4(0.0, 0.0, 0.0, 1.0);
  }`

export const METRES_PER_UNIT = UNIT_METRES

export async function createMap(container, { root, onPick, onHover, onView, pois = false, scale = false, modes = false, minZoom = 0 }) {
  const canvas = document.createElement("canvas")
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  const markerLayer = document.createElement("div")
  canvas.className = "map-canvas"
  overlay.setAttribute("class", "map-overlay")
  markerLayer.className = "map-markers"
  const tooltip = document.createElement("div")
  tooltip.className = "map-tooltip"
  markerLayer.append(tooltip)
  let tooltipPoi = null
  container.append(canvas, overlay, markerLayer)
  const scaleBar = document.createElement("div")
  if (scale) {
    scaleBar.className = "map-scale"
    scaleBar.innerHTML = `<span class="map-elevation"></span><span class="map-scale-label"></span><span class="map-scale-bar"></span>`
  }
  const [elevationLabel, scaleLabel, scaleLine] = scaleBar.children
  const modeToggle = document.createElement("div")
  if (modes) {
    modeToggle.className = "map-mode"
    modeToggle.innerHTML = `<button type="button" data-mode="2d">2D</button><button type="button" data-mode="3d">3D</button>`
    modeToggle.addEventListener("click", event => {
      const button = event.target.closest("button")
      if (button) {
        setMode(button.dataset.mode === "3d")
      }
    })
    container.append(modeToggle)
  }
  const compass = createCompass()
  const compassHolder = document.createElement("div")
  const compassFrame = document.createElement("div")
  if (modes) {
    compassFrame.className = "map-compass-frame"
    compassHolder.className = "map-compass"
    compassHolder.append(compass.element)
    compassFrame.append(compassHolder)
    container.append(compassFrame)
  }
  if (scale) {
    container.append(scaleBar)
  }
  const pointsOfInterest = []
  const hiddenTypes = new Set()
  let iconsOn = true
  const tracksHover = Boolean(scale || onHover)

  const gl = canvas.getContext("webgl2", { antialias: true })
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic")
  const program = createProgram(vertexSource, fragmentSource)
  const uniforms = {}
  for (const name of ["uViewProj", "uRect", "uUv", "uRelief", "uSkirt", "uSolid", "uDepth", "uColor", "uBorder", "uHatch", "uOccupancy", "uDomain", "uGrid", "uOffset"]) {
    uniforms[name] = gl.getUniformLocation(program, name)
  }

  const meshes = MESH_SIZES.map(createMesh)
  let boundMesh = null
  const cache = new Map()
  const uploads = []
  const markers = new Set()
  let inflight = 0
  let evictable = 0
  let frame = 0
  let layers = []
  let extent
  let hatchTexture
  let lines = []
  let pendingFit = null

  const camera = { x: 0, y: 0, z: null, lift: 0, distance: 60, target: 60, tilt: 0, tiltTarget: 0, heading: 0, headingTarget: 0 }
  const fullRelief = DEPTH_METRES / UNIT_METRES
  let threeD = false
  let relief = fullRelief / 2
  let hover = null
  let hoverMoved = false
  let orbit = null
  let spin = { heading: 0, tilt: 0 }
  let panning = null
  let pivotSet = false
  let games = {}
  let viewProj = new Float32Array(16)
  let inverse = new Float32Array(16)
  let eye = [0, 0, 0]
  let needsDraw = true
  let velocity = { x: 0, y: 0 }
  let lastTime = performance.now()
  let drawn = []
  let lastTile = null
  let flight = null
  const viewSize = { width: 0, height: 0 }

  function compile(type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader))
    }
    return shader
  }

  function createProgram(vertex, fragment) {
    const result = gl.createProgram()
    gl.attachShader(result, compile(gl.VERTEX_SHADER, vertex))
    gl.attachShader(result, compile(gl.FRAGMENT_SHADER, fragment))
    gl.bindAttribLocation(result, 0, "aGrid")
    gl.linkProgram(result)
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(result))
    }
    return result
  }

  function createMesh(size) {
    const count = size + 3
    const vertices = new Float32Array(count * count * 3)
    let n = 0
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        vertices[n++] = Math.min(Math.max((col - 1) / size, 0), 1)
        vertices[n++] = Math.min(Math.max((row - 1) / size, 0), 1)
        vertices[n++] = row === 0 || col === 0 || row === count - 1 || col === count - 1 ? 1 : 0
      }
    }
    const indices = new Uint16Array((count - 1) * (count - 1) * 6)
    n = 0
    for (let row = 0; row < count - 1; row++) {
      for (let col = 0; col < count - 1; col++) {
        const a = row * count + col
        indices.set([a, a + count, a + 1, a + 1, a + count, a + count + 1], n)
        n += 6
      }
    }
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return { vao, count: indices.length, size }
  }

  function placeholderTexture(value) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([value]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return texture
  }

  function uploadTexture(bitmap, { single, mipmaps, wrap }) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (single) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, bitmap)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (mipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      if (anisotropy) {
        gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 8)
      }
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }
    bitmap.close()
    return texture
  }

  async function fetchBitmap(url, colorSpaceConversion) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`)
    }
    return createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion })
  }

  async function fetchHeights(url, size) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`)
    }
    const data = new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())
    for (let row = 1; row < size; row++) {
      data[row * size] += data[(row - 1) * size]
    }
    for (let row = 0; row < size; row++) {
      for (let n = row * size + 1; n < (row + 1) * size; n++) {
        data[n] += data[n - 1]
      }
    }
    return { width: size, height: size, data }
  }

  function fillMissing(heights, layer, level, i, j) {
    const { width, data } = heights
    const n = layer.domain.tiles
    const perCell = MESH * 2 >> level
    const valid = new Uint8Array(width * width)
    const queue = []
    for (let r = 0; r < width; r++) {
      const row = Math.floor((j * MESH + r) / perCell)
      for (let c = 0; c < width; c++) {
        const col = Math.floor((i * MESH + c) / perCell)
        if (row < n && col < n && layer.cells[row * n + col]) {
          valid[r * width + c] = 1
          queue.push(r * width + c)
        }
      }
    }
    if (!queue.length || queue.length === valid.length) {
      return heights
    }
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head]
      const r = Math.floor(index / width), c = index % width
      for (const next of [r > 0 ? index - width : -1, r < width - 1 ? index + width : -1, c > 0 ? index - 1 : -1, c < width - 1 ? index + 1 : -1]) {
        if (next >= 0 && !valid[next]) {
          valid[next] = 1
          data[next] = data[index]
          queue.push(next)
        }
      }
    }
    return heights
  }

  function uploadHeights(heights) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, heights.width, heights.height, 0, gl.RED, gl.UNSIGNED_BYTE, heights.data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return texture
  }

  function sampleDepth(heights, s, t) {
    const { width, height, data } = heights
    const px = s * (width - 1), py = t * (height - 1)
    const x0 = Math.floor(px), y0 = Math.floor(py)
    const fx = px - x0, fy = py - y0
    const xa = Math.min(Math.max(x0, 0), width - 1), xb = Math.min(Math.max(x0 + 1, 0), width - 1)
    const ya = Math.min(Math.max(y0, 0), height - 1), yb = Math.min(Math.max(y0 + 1, 0), height - 1)
    const top = data[ya * width + xa] + (data[ya * width + xb] - data[ya * width + xa]) * fx
    const bottom = data[yb * width + xa] + (data[yb * width + xb] - data[yb * width + xa]) * fx
    return (top + (bottom - top) * fy) / 255
  }

  function surfaceHeight({ box, entry, uv, quads }, x, y) {
    const gx = (x - box.x) / box.size * quads, gy = (box.y - y) / box.size * quads
    const c = Math.min(Math.max(Math.floor(gx), 0), quads - 1), r = Math.min(Math.max(Math.floor(gy), 0), quads - 1)
    const fx = gx - c, fy = gy - r
    const at = (col, row) => sampleDepth(entry.heights, uv[0] + col / quads * uv[2], uv[1] + row / quads * uv[2])
    if (fx + fy <= 1) {
      const origin = at(c, r)
      return origin + (at(c + 1, r) - origin) * fx + (at(c, r + 1) - origin) * fy
    }
    const corner = at(c + 1, r + 1)
    return corner + (at(c, r + 1) - corner) * (1 - fx) + (at(c + 1, r) - corner) * (1 - fy)
  }

  function covers(tile, x, y) {
    return x >= tile.box.x && x <= tile.box.x + tile.box.size && y <= tile.box.y && y >= tile.box.y - tile.box.size
  }

  function heightAt(x, y) {
    if (!lastTile || !covers(lastTile, x, y)) {
      lastTile = drawn.find(tile => covers(tile, x, y))
    }
    return lastTile ? surfaceHeight(lastTile, x, y) * relief : 0
  }

  function tileSize(level) {
    return 2 ** (level - 1)
  }

  function key(layer, level, i, j) {
    return ((layer.index * 16 + level) * 8192 + j) * 8192 + i
  }

  function exists(layer, level, i, j) {
    if (level === 0 && layer.hidden.has(`${i}_${j}`)) {
      return false
    }
    const size = tileSize(level)
    const n = layer.domain.tiles
    if (size < 1) {
      return exists(layer, level + 1, Math.floor(i * size), Math.floor(j * size))
    }
    const c0 = Math.max(i * size, 0)
    const r0 = Math.max(j * size, 0)
    const c1 = Math.min((i + 1) * size, n)
    const r1 = Math.min((j + 1) * size, n)
    if (c1 <= c0 || r1 <= r0) {
      return false
    }
    const sum = layer.occupancy
    return sum[r1 * (n + 1) + c1] - sum[r0 * (n + 1) + c1] - sum[r1 * (n + 1) + c0] + sum[r0 * (n + 1) + c0] > 0
  }

  function bounds(layer, level, i, j) {
    const size = tileSize(level)
    const x = layer.offset[0] + (layer.domain.minX + i * size) * layer.scale
    const y = layer.offset[1] + (layer.domain.maxY + 1 - j * size) * layer.scale
    return { x, y, size: size * layer.scale }
  }

  function request(layer, level, i, j) {
    const id = key(layer, level, i, j)
    if (cache.has(id)) {
      return
    }
    const entry = { state: "loading", layer, level, i, j, used: frame }
    cache.set(id, entry)
    inflight++
    const path = `${root}pyramids/${layer.id}/${level}/${i}_${j}`
    Promise.all([fetchBitmap(`${path}.avif`), fetchHeights(`${path}.bin`, MESH + 1)]).then(([bitmap, grid]) => {
      entry.heights = fillMissing(grid, layer, level, i, j)
      uploads.push({ entry, bitmap })
    }).catch(error => {
      console.warn(error)
      entry.state = "error"
    }).finally(() => {
      inflight--
      needsDraw = true
    })
  }

  function processUploads() {
    const start = performance.now()
    while (uploads.length && performance.now() - start < UPLOAD_BUDGET_MS) {
      const { entry, bitmap } = uploads.shift()
      if (cache.get(key(entry.layer, entry.level, entry.i, entry.j)) !== entry) {
        bitmap.close()
        continue
      }
      entry.color = uploadTexture(bitmap, { single: false, mipmaps: true, wrap: gl.CLAMP_TO_EDGE })
      entry.depth = uploadHeights(entry.heights)
      entry.state = "ready"
      if (entry.level < entry.layer.levels - KEEP_LEVELS) {
        evictable++
      }
      needsDraw = true
    }
  }

  function evict() {
    if (evictable <= MAX_TILES) {
      return
    }
    const ready = Array.from(cache.values()).filter(entry => entry.state === "ready" && entry.level < entry.layer.levels - KEEP_LEVELS && entry.used < frame)
    let excess = ready.length - MAX_TILES
    if (excess <= 0) {
      return
    }
    ready.sort((a, b) => a.used - b.used)
    for (const entry of ready) {
      if (excess-- <= 0) {
        break
      }
      gl.deleteTexture(entry.color)
      gl.deleteTexture(entry.depth)
      cache.delete(key(entry.layer, entry.level, entry.i, entry.j))
      evictable--
    }
  }

  function ready(layer, level, i, j) {
    const entry = cache.get(key(layer, level, i, j))
    return entry && entry.state === "ready" ? entry : null
  }

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2)
    const out = new Float32Array(16)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = 2 * far * near / (near - far)
    return out
  }

  function lookAt(from, to, up) {
    let zx = from[0] - to[0], zy = from[1] - to[1], zz = from[2] - to[2]
    let length = Math.hypot(zx, zy, zz)
    zx /= length
    zy /= length
    zz /= length
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx
    length = Math.hypot(xx, xy, xz)
    xx /= length
    xy /= length
    xz /= length
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * from[0] + xy * from[1] + xz * from[2]), -(yx * from[0] + yy * from[1] + yz * from[2]), -(zx * from[0] + zy * from[1] + zz * from[2]), 1])
  }

  function multiply(a, b) {
    const out = new Float32Array(16)
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3]
      }
    }
    return out
  }

  function invert(m) {
    const out = new Float32Array(16)
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
    return out
  }

  function orbitEye() {
    const st = Math.sin(camera.tilt), ct = Math.cos(camera.tilt)
    const sh = Math.sin(camera.heading), ch = Math.cos(camera.heading)
    return [camera.x - sh * st * camera.distance, camera.y - ch * st * camera.distance, (camera.z ?? relief) + ct * camera.distance]
  }

  function updateCamera() {
    const st = Math.sin(camera.tilt), ct = Math.cos(camera.tilt)
    const sh = Math.sin(camera.heading), ch = Math.cos(camera.heading)
    const pivot = [camera.x, camera.y, camera.z ?? relief]
    eye = orbitEye()
    eye[2] = Math.max(eye[2] + camera.lift, heightAt(eye[0], eye[1]) + CAMERA_FLOOR_METRES / UNIT_METRES)
    const clearance = eye[2] - relief
    const near = Math.max(Math.min(camera.distance * (0.5 * ct + 0.01), clearance * 0.9), camera.distance * 0.005)
    const far = camera.distance * (1 + 60 * st) + relief * 2 + 1
    const projection = perspective(FOV, canvas.width / canvas.height, near, far)
    viewProj = multiply(projection, lookAt(eye, pivot, [sh * ct, ch * ct, st]))
    inverse = invert(viewProj)
  }

  function transform(m, v) {
    const out = [0, 0, 0, 0]
    for (let row = 0; row < 4; row++) {
      out[row] = m[row] * v[0] + m[4 + row] * v[1] + m[8 + row] * v[2] + m[12 + row] * v[3]
    }
    return [out[0] / out[3], out[1] / out[3], out[2] / out[3]]
  }

  function ray(px, py) {
    const rect = canvas.getBoundingClientRect()
    const x = (px - rect.left) / rect.width * 2 - 1
    const y = 1 - (py - rect.top) / rect.height * 2
    return { a: transform(inverse, [x, y, -1, 1]), b: transform(inverse, [x, y, 1, 1]) }
  }

  function along({ a, b }, t) {
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + (b[2] - a[2]) * t }
  }

  function planeHit(px, py, z) {
    const path = ray(px, py)
    const t = (z - path.a[2]) / (path.b[2] - path.a[2])
    return Number.isFinite(t) && t >= 0 ? along(path, t) : null
  }

  function pick(px, py) {
    const path = ray(px, py)
    const dz = path.b[2] - path.a[2]
    const start = Math.max((relief - path.a[2]) / dz, 0)
    const end = Math.min(-path.a[2] / dz, 1)
    if (!Number.isFinite(end) || end < 0) {
      return null
    }
    const above = t => {
      const point = along(path, t)
      return point.z - heightAt(point.x, point.y)
    }
    const steps = 96
    let previous = start
    for (let n = 1; n <= steps; n++) {
      const t = start + (end - start) * n / steps
      if (above(t) <= 0) {
        let low = previous, high = t
        for (let k = 0; k < 12; k++) {
          const middle = (low + high) / 2
          if (above(middle) > 0) {
            low = middle
          } else {
            high = middle
          }
        }
        return along(path, high)
      }
      previous = t
    }
    return along(path, end)
  }

  function project(x, y, z) {
    const clip = [0, 0, 0, 0]
    for (let row = 0; row < 4; row++) {
      clip[row] = viewProj[row] * x + viewProj[4 + row] * y + viewProj[8 + row] * z + viewProj[12 + row]
    }
    if (clip[3] <= 0) {
      return { x: -1e5, y: -1e5 }
    }
    return { x: (clip[0] / clip[3] + 1) / 2 * viewSize.width, y: (1 - clip[1] / clip[3]) / 2 * viewSize.height }
  }

  function frustumPlanes() {
    const m = viewProj
    const rows = [0, 1, 2, 3].map(r => [m[r], m[4 + r], m[8 + r], m[12 + r]])
    return [[3, 0, 1], [3, 0, -1], [3, 1, 1], [3, 1, -1], [3, 2, 1], [3, 2, -1]].map(([w, r, sign]) => rows[w].map((value, n) => value + sign * rows[r][n]))
  }

  function inView(planes, box) {
    for (const p of planes) {
      const x = p[0] >= 0 ? box.x + box.size : box.x
      const y = p[1] >= 0 ? box.y : box.y - box.size
      const z = p[2] >= 0 ? relief : -box.size * 0.1
      if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) {
        return false
      }
    }
    return true
  }

  function distanceTo(box) {
    const x = Math.min(Math.max(eye[0], box.x), box.x + box.size)
    const y = Math.min(Math.max(eye[1], box.y - box.size), box.y)
    const z = Math.min(Math.max(eye[2], 0), relief)
    return Math.max(Math.hypot(eye[0] - x, eye[1] - y, eye[2] - z), 1e-4)
  }

  function selectTiles() {
    const planes = frustumPlanes()
    const focal = canvas.height / (2 * Math.tan(FOV / 2))
    const wanted = []
    function visit(layer, level, i, j) {
      if (!exists(layer, level, i, j)) {
        return
      }
      const box = bounds(layer, level, i, j)
      if (!inView(planes, box)) {
        return
      }
      const pixels = box.size * focal / distanceTo(box)
      if (level > 0 && pixels > TILE_PIXELS * LOD_SCALE) {
        for (let b = 0; b < 2; b++) {
          for (let a = 0; a < 2; a++) {
            visit(layer, level - 1, i * 2 + a, j * 2 + b)
          }
        }
        return
      }
      wanted.push({ layer, level, i, j, box, pixels })
    }
    for (const layer of layers) {
      const top = layer.levels - 1
      const count = Math.ceil(layer.domain.tiles / tileSize(top))
      for (let j = 0; j < count; j++) {
        for (let i = 0; i < count; i++) {
          visit(layer, top, i, j)
        }
      }
    }
    return wanted
  }

  function focusDistance(node) {
    const half = node.box.size / 2
    return Math.hypot(node.box.x + half - camera.x, node.box.y - half - camera.y) / node.box.size
  }

  function schedule(wanted) {
    for (const node of wanted) {
      const entry = cache.get(key(node.layer, node.level, node.i, node.j))
      if (entry) {
        entry.used = frame
      }
    }
    if (inflight >= MAX_INFLIGHT) {
      return
    }
    const missing = wanted.filter(node => !ready(node.layer, node.level, node.i, node.j)).sort((a, b) => focusDistance(a) - focusDistance(b))
    const parents = wanted.filter(node => node.level < node.layer.levels - 1).map(node => ({ layer: node.layer, level: node.level + 1, i: node.i >> 1, j: node.j >> 1 }))
    const children = []
    const neighbours = []
    const seen = new Set(wanted.map(node => key(node.layer, node.level, node.i, node.j)))
    for (const node of wanted) {
      const layer = node.layer
      if (node.level > 0) {
        for (let b = 0; b < 2; b++) {
          for (let a = 0; a < 2; a++) {
            const child = { layer, level: node.level - 1, i: node.i * 2 + a, j: node.j * 2 + b }
            if (exists(layer, child.level, child.i, child.j)) {
              child.box = bounds(layer, child.level, child.i, child.j)
              children.push(child)
            }
          }
        }
      }
      for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const next = { layer, level: node.level, i: node.i + a, j: node.j + b }
        const id = key(layer, next.level, next.i, next.j)
        if (!seen.has(id) && next.i >= 0 && next.j >= 0 && exists(layer, next.level, next.i, next.j)) {
          seen.add(id)
          next.box = bounds(layer, next.level, next.i, next.j)
          neighbours.push(next)
        }
      }
    }
    children.sort((a, b) => focusDistance(a) - focusDistance(b))
    neighbours.sort((a, b) => focusDistance(a) - focusDistance(b))
    const queue = missing.concat(parents, children.slice(0, PREFETCH_CHILDREN), neighbours.slice(0, PREFETCH_NEIGHBOURS))
    for (const node of queue) {
      const entry = cache.get(key(node.layer, node.level, node.i, node.j))
      if (entry) {
        entry.used = frame
      } else if (inflight < MAX_INFLIGHT) {
        request(node.layer, node.level, node.i, node.j)
      }
    }
  }

  function meshFor(pixels) {
    const target = pixels / (threeD ? QUAD_PIXELS.relief : QUAD_PIXELS.flat)
    return meshes.find(mesh => mesh.size >= target / Math.SQRT2) || meshes[meshes.length - 1]
  }

  function drawTile(box, entry, uv, pixels) {
    const mesh = meshFor(pixels)
    if (mesh !== boundMesh) {
      gl.bindVertexArray(mesh.vao)
      boundMesh = mesh
    }
    entry.used = frame
    drawn.push({ box, entry, uv, quads: mesh.size })
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, entry.color)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, entry.depth)
    gl.uniform3f(uniforms.uRect, box.x, box.y, box.size)
    gl.uniform4f(uniforms.uUv, uv[0], uv[1], uv[2], uv[2])
    gl.uniform1f(uniforms.uSkirt, box.size * 0.01 + relief * 0.02)
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
  }

  function drawNode(node) {
    const layer = node.layer
    const own = ready(layer, node.level, node.i, node.j)
    if (own) {
      drawTile(node.box, own, [0, 0, 1], node.pixels)
      return
    }
    if (node.level > 0) {
      const children = []
      let complete = true
      for (let b = 0; b < 2 && complete; b++) {
        for (let a = 0; a < 2; a++) {
          const i = node.i * 2 + a, j = node.j * 2 + b
          if (!exists(layer, node.level - 1, i, j)) {
            continue
          }
          const child = ready(layer, node.level - 1, i, j)
          if (!child) {
            complete = false
            break
          }
          children.push([bounds(layer, node.level - 1, i, j), child])
        }
      }
      if (complete && children.length) {
        children.forEach(([box, child]) => drawTile(box, child, [0, 0, 1], node.pixels / 2))
        return
      }
    }
    for (let level = node.level + 1; level < layer.levels; level++) {
      const shift = level - node.level
      const i = node.i >> shift, j = node.j >> shift
      const parent = ready(layer, level, i, j)
      if (parent) {
        const scale = 1 / 2 ** shift
        drawTile(node.box, parent, [(node.i - (i << shift)) * scale, (node.j - (j << shift)) * scale, scale], node.pixels)
        return
      }
    }
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    viewSize.width = canvas.clientWidth
    viewSize.height = canvas.clientHeight
    const width = Math.round(viewSize.width * ratio)
    const height = Math.round(viewSize.height * ratio)
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width
      canvas.height = height
      needsDraw = true
    }
  }

  function limits() {
    const focal = canvas.height / (2 * Math.tan(FOV / 2))
    return { min: focal / (2048 * 3), max: minZoom ? MAP_WIDTH_METRES / UNIT_METRES / minZoom * focal / Math.max(canvas.width, 1) - relief : 240 }
  }

  function clampCamera() {
    const { min, max } = limits()
    camera.target = Math.min(Math.max(camera.target, min), max)
    camera.distance = Math.min(Math.max(camera.distance, min), max)
    camera.x = Math.min(Math.max(camera.x, extent.minX), extent.maxX)
    camera.y = Math.min(Math.max(camera.y, extent.minY), extent.maxY)
  }

  function approach(value, target, ease, epsilon) {
    if (Math.abs(target - value) <= epsilon) {
      return target
    }
    needsDraw = true
    return value + (target - value) * ease
  }

  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1)
    lastTime = now
    const ease = Math.min(1, dt * 8)
    relief = approach(relief, threeD ? fullRelief : fullRelief / 2, ease, 1e-4)
    camera.tilt = approach(camera.tilt, camera.tiltTarget, ease, 1e-4)
    camera.heading = approach(camera.heading, camera.headingTarget, ease, 1e-4)
    const base = orbitEye()
    camera.lift = approach(camera.lift, Math.max(heightAt(base[0], base[1]) + CAMERA_CLEARANCE_METRES / UNIT_METRES - base[2], 0), ease, 1e-5)
    if (flight) {
      const t = Math.min((now - flight.start) / FLIGHT_MS, 1)
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      camera.x = flight.from.x + (flight.to.x - flight.from.x) * e
      camera.y = flight.from.y + (flight.to.y - flight.from.y) * e
      camera.distance = camera.target = Math.exp(Math.log(flight.from.distance) + (Math.log(flight.to.distance) - Math.log(flight.from.distance)) * e)
      if (t >= 1) {
        flight = null
      }
      needsDraw = true
      return
    }
    if (Math.abs(camera.target - camera.distance) > camera.distance * 0.0005) {
      camera.distance += (camera.target - camera.distance) * Math.min(1, dt * 14)
      needsDraw = true
    } else if (camera.distance !== camera.target) {
      camera.distance = camera.target
      needsDraw = true
    }
    if (!dragging && (spin.heading || spin.tilt)) {
      turn(camera.heading + spin.heading * dt, camera.tilt + spin.tilt * dt)
      const decay = Math.exp(-dt * SPIN_DECAY)
      spin = Math.hypot(spin.heading, spin.tilt) * decay < SPIN_STOP ? { heading: 0, tilt: 0 } : { heading: spin.heading * decay, tilt: camera.tilt === 0 || camera.tilt === MAX_TILT ? 0 : spin.tilt * decay }
    }
    if (!dragging && Math.hypot(velocity.x, velocity.y) > camera.distance * 0.002) {
      camera.x += velocity.x * dt
      camera.y += velocity.y * dt
      const decay = Math.exp(-dt * 5)
      velocity.x *= decay
      velocity.y *= decay
      needsDraw = true
    }
  }

  function fitBox(box, snap, inset, start) {
    const height = canvas.clientHeight
    const top = inset ? FIT_TOP : 0
    const usable = Math.max(height - inset - top, height * 0.3) / height
    const aspect = canvas.width / (canvas.height * usable)
    const span = Math.max(box.maxY - box.minY, (box.maxX - box.minX) / aspect) * 1.2 / usable
    const to = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 - span * (inset - top) / height / 2, distance: Math.max(span / 2 / Math.tan(FOV / 2), limits().min * 40) }
    if (camera.z !== null) {
      anchorPivot(false)
    }
    velocity = { x: 0, y: 0 }
    if (snap) {
      flight = null
      camera.x = to.x
      camera.y = to.y
      camera.distance = camera.target = to.distance
    } else {
      const from = start ? { x: start.x, y: start.y, distance: to.distance * start.zoom } : { x: camera.x, y: camera.y, distance: camera.distance }
      flight = { from, to, start: performance.now() }
    }
    needsDraw = true
  }

  function position(item, point) {
    const transform = `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px)`
    item.screen = point
    if (item.transform !== transform) {
      item.transform = transform
      item.element.style.transform = transform
    }
  }

  function terrainBetween(x, y, z) {
    for (let n = 1; n < OCCLUSION_STEPS; n++) {
      const t = n / OCCLUSION_STEPS * OCCLUSION_END
      const px = eye[0] + (x - eye[0]) * t, py = eye[1] + (y - eye[1]) * t, pz = eye[2] + (z - eye[2]) * t
      if (heightAt(px, py) > pz) {
        return true
      }
    }
    return false
  }

  function hiddenByTerrain(x, y, z) {
    const screen = project(x, y, z)
    if (screen.x < -POI_MARGIN || screen.y < -POI_MARGIN || screen.x > viewSize.width + POI_MARGIN || screen.y > viewSize.height + POI_MARGIN) {
      return false
    }
    const radius = POI_OCCLUSION_RADIUS * Math.hypot(eye[0] - x, eye[1] - y, eye[2] - z) * 2 * Math.tan(FOV / 2) / Math.max(viewSize.height, 1)
    const st = Math.sin(camera.tilt), ct = Math.cos(camera.tilt)
    const sh = Math.sin(camera.heading), ch = Math.cos(camera.heading)
    for (let k = 0; k <= POI_OCCLUSION_SAMPLES; k++) {
      const angle = (k - 1) / POI_OCCLUSION_SAMPLES * 2 * Math.PI
      const across = k ? Math.cos(angle) * radius : 0, upward = k ? Math.sin(angle) * radius : 0
      if (!terrainBetween(x + ch * across + sh * ct * upward, y - sh * across + ch * ct * upward, z + st * upward)) {
        return false
      }
    }
    return true
  }

  function spread(placed) {
    for (let pass = 0; pass < POI_SPREAD_PASSES; pass++) {
      for (let a = 0; a < placed.length; a++) {
        const first = placed[a].point
        for (let b = a + 1; b < placed.length; b++) {
          const second = placed[b].point
          let dx = second.x - first.x, dy = second.y - first.y
          const away = Math.hypot(dx, dy)
          if (away >= POI_SPACING) {
            continue
          }
          if (away < 0.01) {
            dx = 0
            dy = 1
          } else {
            dx /= away
            dy /= away
          }
          const push = (POI_SPACING - away) / 2
          first.x -= dx * push
          first.y -= dy * push
          second.x += dx * push
          second.y += dy * push
        }
      }
    }
  }

  function updateTooltip() {
    let nearest = null
    let best = POI_HOVER_RADIUS
    if (hover && !dragging) {
      const rect = canvas.getBoundingClientRect()
      const x = hover.x - rect.left, y = hover.y - rect.top
      for (const poi of pointsOfInterest) {
        if (poi.shown && poi.inside && poi.screen) {
          const away = Math.hypot(poi.screen.x - x, poi.screen.y - y)
          if (away < best) {
            best = away
            nearest = poi
          }
        }
      }
    }
    if (nearest !== tooltipPoi) {
      tooltipPoi?.element.classList.remove("hovered")
      nearest?.element.classList.add("hovered")
      tooltipPoi = nearest
      tooltip.classList.toggle("shown", Boolean(nearest))
      if (nearest) {
        tooltip.textContent = nearest.label
      }
    }
    if (nearest) {
      tooltip.style.transform = `translate(${nearest.screen.x.toFixed(1)}px, ${nearest.screen.y.toFixed(1)}px)`
    }
  }

  function updateMarkers() {
    const origin = project(camera.x, camera.y, 0)
    const across = project(camera.x + 1, camera.y, 0)
    const unitPixels = Math.hypot(across.x - origin.x, across.y - origin.y)
    const zoomPerPixel = MAP_WIDTH_METRES / (UNIT_METRES * Math.max(viewSize.width, 1))
    const gameZoom = zoomPerPixel * unitPixels
    const focal = viewSize.height / (2 * Math.tan(FOV / 2))
    const now = performance.now()
    const placed = []
    for (const poi of pointsOfInterest) {
      let z = null
      const visibleZoom = POI_ZOOM[poi.type]
      let shown = gameZoom >= visibleZoom
      if (threeD) {
        const reach = zoomPerPixel * focal / visibleZoom
        const away = Math.hypot(eye[0] - poi.x, eye[1] - poi.y)
        z = away <= reach ? heightAt(poi.x, poi.y) : null
        shown = z !== null && Math.hypot(away, eye[2] - z) <= reach
      }
      shown = shown && iconsOn && !hiddenTypes.has(poi.type)
      if (shown && threeD && hiddenByTerrain(poi.x, poi.y, z)) {
        shown = false
      }
      if (shown !== poi.shown) {
        poi.shown = shown
        poi.hiddenAt = now
        poi.element.classList.toggle("shown", shown)
      }
      if (!shown && now - poi.hiddenAt > POI_FADE_MS) {
        continue
      }
      if (threeD && z === null) {
        z = heightAt(poi.x, poi.y)
      }
      const rough = project(poi.x, poi.y, z ?? 0)
      const inside = rough.x > -POI_MARGIN && rough.y > -POI_MARGIN && rough.x < viewSize.width + POI_MARGIN && rough.y < viewSize.height + POI_MARGIN
      if (inside !== poi.inside) {
        poi.inside = inside
        poi.element.style.display = inside ? "" : "none"
      }
      if (inside) {
        placed.push({ poi, point: threeD ? rough : project(poi.x, poi.y, heightAt(poi.x, poi.y)) })
      }
    }
    spread(placed)
    for (const { poi, point } of placed) {
      position(poi, point)
    }
    if (scale && unitPixels > 0) {
      const metresPerPixel = UNIT_METRES / unitPixels
      const metres = SCALE_STEPS.filter(value => value <= SCALE_TARGET * metresPerPixel).pop() || SCALE_STEPS[0]
      scaleLine.style.width = `${(metres / metresPerPixel).toFixed(1)}px`
      scaleLabel.textContent = metres < 1000 ? `${metres} m` : `${metres / 1000} km`
    }
    for (const marker of markers) {
      position(marker, project(marker.x, marker.y, heightAt(marker.x, marker.y)))
    }
    for (const entry of lines) {
      const [a, b] = entry.ends.map(end => project(end.x, end.y, heightAt(end.x, end.y)))
      entry.element.setAttribute("x1", a.x)
      entry.element.setAttribute("y1", a.y)
      entry.element.setAttribute("x2", b.x)
      entry.element.setAttribute("y2", b.y)
    }
    if (modes) {
      compass.setHeading((camera.heading * 180 / Math.PI % 360 + 360) % 360)
    }
    return gameZoom
  }

  function render(now) {
    requestAnimationFrame(render)
    resize()
    if (!layers.length || !canvas.width || !canvas.height) {
      return
    }
    if (pendingFit) {
      fitBox(pendingFit.box, pendingFit.snap, pendingFit.inset, pendingFit.start)
      pendingFit = null
    }
    step(now)
    processUploads()
    if (hoverMoved && !needsDraw) {
      hoverMoved = false
      updateHover()
    }
    if (!needsDraw) {
      return
    }
    needsDraw = false
    frame++
    clampCamera()
    updateCamera()
    const wanted = selectTiles()
    schedule(wanted)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(program)
    boundMesh = null
    gl.uniformMatrix4fv(uniforms.uViewProj, false, viewProj)
    gl.uniform1f(uniforms.uRelief, relief)
    gl.uniform1f(uniforms.uSolid, Math.min(Math.max(relief / fullRelief * 2 - 1, 0), 1))
    gl.uniform1i(uniforms.uColor, 0)
    gl.uniform1i(uniforms.uDepth, 1)
    gl.uniform1i(uniforms.uBorder, 2)
    gl.uniform1i(uniforms.uHatch, 3)
    gl.uniform1i(uniforms.uOccupancy, 4)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, hatchTexture)
    drawn = []
    lastTile = null
    for (const layer of layers) {
      gl.uniform4f(uniforms.uDomain, layer.border[0], layer.border[1], layer.border[2], layer.border[3])
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, layer.borderTexture)
      gl.activeTexture(gl.TEXTURE4)
      gl.bindTexture(gl.TEXTURE_2D, layer.occupancyTexture)
      gl.uniform3f(uniforms.uGrid, layer.grid[0], layer.grid[1], layer.grid[2])
      gl.uniform2f(uniforms.uOffset, layer.offset[0], layer.offset[1])
      wanted.filter(node => node.layer === layer).forEach(drawNode)
    }
    const gameZoom = updateMarkers()
    if (onView) {
      onView({ zoom: gameZoom, pending: inflight + uploads.length })
    }
    if (tracksHover && hover) {
      hoverMoved = false
      updateHover()
    }
    evict()
  }

  let dragging = false
  const pointers = new Map()
  let grab = null
  let pinch = null
  let press = null
  let lastMove = { time: 0, x: 0, y: 0 }

  function pinchState() {
    const [a, b] = Array.from(pointers.values())
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, span: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x) }
  }

  function turn(heading, tilt) {
    camera.heading = camera.headingTarget = heading
    camera.tilt = camera.tiltTarget = Math.min(Math.max(tilt, 0), MAX_TILT)
    needsDraw = true
  }

  function setMode(on, instant = false) {
    threeD = on
    spin = { heading: 0, tilt: 0 }
    if (on) {
      if (camera.tiltTarget === 0) {
        camera.tiltTarget = START_TILT
      }
    } else {
      anchorPivot(false)
      camera.heading = Math.atan2(Math.sin(camera.heading), Math.cos(camera.heading))
      camera.headingTarget = 0
      camera.tiltTarget = 0
    }
    if (instant) {
      relief = on ? fullRelief : fullRelief / 2
      camera.tilt = camera.tiltTarget
      camera.heading = camera.headingTarget
    }
    compassHolder.classList.toggle("shown", on)
    for (const button of modeToggle.children) {
      button.classList.toggle("selected", (button.dataset.mode === "3d") === on)
    }
    needsDraw = true
  }

  function anchorPivot(ground) {
    if (ground && pivotSet) {
      return
    }
    updateCamera()
    const rect = canvas.getBoundingClientRect()
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
    const hit = ground ? pick(x, y) : planeHit(x, y, relief)
    camera.z = ground && hit ? hit.z : null
    pivotSet = camera.z !== null
    if (!hit) {
      return
    }
    camera.distance = camera.target = Math.hypot(eye[0] - hit.x, eye[1] - hit.y, eye[2] - hit.z)
    camera.x = hit.x
    camera.y = hit.y
    velocity = { x: 0, y: 0 }
    needsDraw = true
  }

  function updateHover() {
    const point = hover && pick(hover.x, hover.y)
    const place = point && locate(point.x, point.y)
    const elevation = place && Math.round((point.z / relief * 255 - (games[place.layer.game].seaLevel || 0)) * DEPTH_METRES / 255)
    if (scale) {
      elevationLabel.textContent = place ? `Elevation ${elevation} m` : ""
    }
    if (onHover) {
      onHover(place ? { game: place.layer.game, x: place.worldX, y: place.worldY, elevation } : null)
    }
    updateTooltip()
  }

  function startGrab(x, y) {
    updateCamera()
    grab = pick(x, y)
    velocity = { x: 0, y: 0 }
    lastMove = { time: performance.now(), x: camera.x, y: camera.y }
  }

  function dragTo(x, y) {
    if (!grab) {
      return
    }
    updateCamera()
    const now = planeHit(x, y, grab.z)
    if (!now) {
      return
    }
    camera.x += grab.x - now.x
    pivotSet = false
    camera.y += grab.y - now.y
    trackVelocity()
    camera.target = camera.distance
    needsDraw = true
  }

  function panBy(dx, dy) {
    const k = camera.distance * 2 * Math.tan(FOV / 2) / Math.max(viewSize.height, 1)
    const sh = Math.sin(camera.heading), ch = Math.cos(camera.heading)
    camera.x += (dy * sh - dx * ch) * k
    camera.y += (dx * sh + dy * ch) * k
    pivotSet = false
    trackVelocity()
    camera.target = camera.distance
    needsDraw = true
  }

  function trackVelocity() {
    const time = performance.now()
    const elapsed = (time - lastMove.time) / 1000
    if (elapsed > 0.004) {
      const blend = Math.min(elapsed / 0.05, 1)
      velocity = { x: velocity.x + ((camera.x - lastMove.x) / elapsed - velocity.x) * blend, y: velocity.y + ((camera.y - lastMove.y) / elapsed - velocity.y) * blend }
      const speed = Math.hypot(velocity.x, velocity.y)
      const cap = camera.distance * 3
      if (speed > cap) {
        velocity = { x: velocity.x * cap / speed, y: velocity.y * cap / speed }
      }
      lastMove = { time, x: camera.x, y: camera.y }
    }
  }

  function pickAt(x, y) {
    updateCamera()
    const point = pick(x, y)
    if (point) {
      velocity = { x: 0, y: 0 }
      onPick(locate(point.x, point.y) || { x: point.x, y: point.y, layer: null })
    }
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) {
      return
    }
    flight = null
    spin = { heading: 0, tilt: 0 }
    canvas.setPointerCapture(event.pointerId)
    if (threeD && event.pointerType === "mouse") {
      if (event.button === 0) {
        orbit = { x: event.clientX, y: event.clientY, time: performance.now() }
        press = { x: event.clientX, y: event.clientY }
      } else {
        panning = { x: event.clientX, y: event.clientY }
        velocity = { x: 0, y: 0 }
        lastMove = { time: performance.now(), x: camera.x, y: camera.y }
      }
      dragging = true
      canvas.classList.add("dragging")
      return
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    press = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY } : null
    dragging = true
    canvas.classList.add("dragging")
    if (pointers.size === 2) {
      if (threeD) {
        anchorPivot(true)
      }
      pinch = pinchState()
      startGrab(pinch.x, pinch.y)
    } else {
      startGrab(event.clientX, event.clientY)
    }
  })

  canvas.addEventListener("pointermove", event => {
    if (tracksHover && event.pointerType === "mouse") {
      hover = { x: event.clientX, y: event.clientY }
      hoverMoved = true
    }
    if (orbit) {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_DISTANCE) {
        press = null
        anchorPivot(true)
      }
      if (!press) {
        const deltaHeading = (event.clientX - orbit.x) * ORBIT_SPEED, deltaTilt = -(event.clientY - orbit.y) * ORBIT_SPEED
        turn(camera.heading + deltaHeading, camera.tilt + deltaTilt)
        const time = performance.now()
        const elapsed = (time - orbit.time) / 1000
        if (elapsed > 0) {
          const blend = Math.min(elapsed / 0.05, 1)
          spin = { heading: spin.heading + (deltaHeading / elapsed - spin.heading) * blend, tilt: spin.tilt + (deltaTilt / elapsed - spin.tilt) * blend }
          const speed = Math.hypot(spin.heading, spin.tilt)
          if (speed > SPIN_MAX) {
            spin = { heading: spin.heading * SPIN_MAX / speed, tilt: spin.tilt * SPIN_MAX / speed }
          }
        }
        orbit = { x: event.clientX, y: event.clientY, time }
      }
      return
    }
    if (panning) {
      panBy(event.clientX - panning.x, event.clientY - panning.y)
      panning = { x: event.clientX, y: event.clientY }
      return
    }
    const held = pointers.get(event.pointerId)
    if (!held) {
      return
    }
    const previous = { x: held.x, y: held.y }
    held.x = event.clientX
    held.y = event.clientY
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_DISTANCE) {
      press = null
    }
    if (pointers.size === 2 && pinch && threeD) {
      const next = pinchState()
      turn(camera.heading + (next.angle - pinch.angle), camera.tilt - (next.y - pinch.y) * ORBIT_SPEED)
      camera.distance *= pinch.span / Math.max(next.span, 1)
      clampCamera()
      camera.target = camera.distance
      pinch = next
    } else if (pointers.size === 2 && pinch) {
      const next = pinchState()
      dragTo(next.x, next.y)
      camera.distance *= pinch.span / Math.max(next.span, 1)
      clampCamera()
      camera.target = camera.distance
      pinch = next
      startGrab(next.x, next.y)
    } else if (threeD) {
      panBy(event.clientX - previous.x, event.clientY - previous.y)
    } else {
      dragTo(event.clientX, event.clientY)
    }
  })

  function endPointer(event) {
    if (orbit || panning) {
      if (orbit && press && event.type === "pointerup" && onPick) {
        pickAt(event.clientX, event.clientY)
      }
      if (!orbit || performance.now() - orbit.time > SPIN_HOLD_MS) {
        spin = { heading: 0, tilt: 0 }
      } else {
        spin = { heading: spin.heading * SPIN_CARRY, tilt: spin.tilt * SPIN_CARRY }
      }
      orbit = null
      panning = null
      grab = null
      press = null
      dragging = false
      canvas.classList.remove("dragging")
      if (performance.now() - lastMove.time > 80) {
        velocity = { x: 0, y: 0 }
      }
      return
    }
    if (event.type === "pointerup" && press && pointers.size === 1 && onPick) {
      pickAt(event.clientX, event.clientY)
    }
    press = null
    pointers.delete(event.pointerId)
    if (pointers.size === 1) {
      const [rest] = Array.from(pointers.values())
      pinch = null
      startGrab(rest.x, rest.y)
      return
    }
    if (pointers.size === 0) {
      dragging = false
      grab = null
      pinch = null
      canvas.classList.remove("dragging")
      if (performance.now() - lastMove.time > 80) {
        velocity = { x: 0, y: 0 }
      }
    }
  }

  canvas.addEventListener("pointerleave", () => {
    if (tracksHover) {
      hover = null
      hoverMoved = true
    }
  })
  canvas.addEventListener("pointerup", endPointer)
  canvas.addEventListener("pointercancel", endPointer)
  let suppressMenu = false
  window.addEventListener("pointerdown", () => suppressMenu = false, true)
  canvas.addEventListener("pointerdown", event => suppressMenu = event.button === 2)
  window.addEventListener("contextmenu", event => {
    if (suppressMenu || event.target === canvas) {
      event.preventDefault()
      suppressMenu = false
    }
  }, true)

  function zoomWheel(event) {
    event.preventDefault()
    flight = null
    const delta = event.deltaY * (event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 400 : 1)
    camera.target *= Math.exp(delta * 0.0018)
    velocity = { x: 0, y: 0 }
    clampCamera()
    needsDraw = true
  }

  canvas.addEventListener("wheel", zoomWheel, { passive: false })
  markerLayer.addEventListener("wheel", zoomWheel, { passive: false })

  function locate(x, y) {
    for (const layer of layers) {
      const col = Math.floor((x - layer.offset[0]) / layer.scale) - layer.domain.minX
      const row = layer.domain.maxY - Math.floor((y - layer.offset[1]) / layer.scale)
      if (exists(layer, 1, col, row)) {
        return { x, y, layer, worldX: (x - layer.offset[0]) * UNIT_METRES, worldY: (y - layer.offset[1]) * UNIT_METRES }
      }
    }
    return null
  }

  function place(game, worldX, worldY) {
    const candidates = layers.filter(layer => layer.game === game)
    const tileMetres = candidates[0].scale * UNIT_METRES
    const tx = Math.floor(worldX / tileMetres), ty = Math.floor(worldY / tileMetres)
    const layer = candidates.find(entry => entry.regions.some(([x0, y0, x1, y1]) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1)) || candidates[0]
    return { x: layer.offset[0] + worldX / UNIT_METRES, y: layer.offset[1] + worldY / UNIT_METRES, layer }
  }

  function tileExtent(game) {
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    for (const layer of layers.filter(layer => !game || layer.game === game)) {
      for (const [col, row] of layer.tiles) {
        const x = layer.offset[0] + (layer.domain.minX + col) * layer.scale
        const y = layer.offset[1] + (layer.domain.maxY - row) * layer.scale
        box.minX = Math.min(box.minX, x)
        box.maxX = Math.max(box.maxX, x + layer.scale)
        box.minY = Math.min(box.minY, y)
        box.maxY = Math.max(box.maxY, y + layer.scale)
      }
    }
    return box
  }

  async function loadOverlay(url, wrap, fallback) {
    try {
      return uploadTexture(await fetchBitmap(url, "none"), { single: true, mipmaps: true, wrap })
    } catch (error) {
      console.warn(error)
      return placeholderTexture(fallback)
    }
  }

  async function loadLayer(config, games, masks, index) {
    const game = games[config.game]
    const scale = game.tileMetres / UNIT_METRES
    const offset = [config.offsetMetres[0] / UNIT_METRES, config.offsetMetres[1] / UNIT_METRES]
    const mask = game.mask
    const maskUrl = `${root}${config.game}/${mask.file}`
    if (!masks.has(maskUrl)) {
      masks.set(maskUrl, loadOverlay(maskUrl, gl.CLAMP_TO_EDGE, 255))
    }
    const borderTexture = await masks.get(maskUrl)
    const domain = { minX: game.domain.left, maxY: game.domain.top - 1, tiles: game.domain.size }
    const n = domain.tiles
    const occupancy = new Uint32Array((n + 1) * (n + 1))
    const grid = new Uint8Array(n * n)
    config.tiles.forEach(([col, row]) => grid[row * n + col] = 1)
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        occupancy[(row + 1) * (n + 1) + col + 1] = grid[row * n + col] + occupancy[row * (n + 1) + col + 1] + occupancy[(row + 1) * (n + 1) + col] - occupancy[row * (n + 1) + col]
      }
    }
    const occupancyTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, occupancyTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, n, n, 0, gl.RED, gl.UNSIGNED_BYTE, grid.map(value => value * 255))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const hidden = new Set(config.hidden.map(([i, j]) => `${i}_${j}`))
    return { index, id: config.id, game: config.game, regions: config.regions, tiles: config.tiles, scale, offset, domain, levels: Math.log2(domain.tiles) + 2, cells: grid, occupancy, occupancyTexture, grid: [offset[0] + domain.minX * scale, offset[1] + (domain.maxY + 1) * scale, n * scale], hidden, borderTexture, border: [offset[0] + mask.left * scale, offset[1] + mask.top * scale, mask.width * scale, mask.height * scale] }
  }

  const world = await (await fetch(`${root}world.json`)).json()
  games = world.games
  hatchTexture = await loadOverlay(`${root}hatch.avif`, gl.REPEAT, 0)
  const masks = new Map()
  layers = await Promise.all(world.layers.map((config, index) => loadLayer(config, world.games, masks, index)))
  extent = tileExtent()
  for (const layer of layers) {
    for (let level = layer.levels - 1; level >= layer.levels - KEEP_LEVELS; level--) {
      const count = Math.ceil(layer.domain.tiles / tileSize(level))
      for (let j = 0; j < count; j++) {
        for (let i = 0; i < count; i++) {
          if (exists(layer, level, i, j)) {
            request(layer, level, i, j)
          }
        }
      }
    }
  }
  pendingFit = { box: extent, snap: true, inset: 0 }
  if (modes) {
    setMode(false, true)
  }
  requestAnimationFrame(render)
  if (pois) {
    loadPointsOfInterest(Object.keys(world.games))
  }

  function addPointOfInterest(game, type, icon, marker) {
    const element = document.createElement("div")
    element.className = "map-poi"
    const image = document.createElement("img")
    image.src = `${root}icons/${icon}.avif`
    image.alt = ""
    element.append(image)
    markerLayer.prepend(element)
    const point = place(game, marker.x, marker.y)
    const label = type === "campfire" ? "Campfire" : marker.name
    pointsOfInterest.push({ type, label, x: point.x, y: point.y, element })
  }

  async function loadPointsOfInterest(games) {
    try {
      const response = await fetch(`${root}icons/markers.json`)
      if (!response.ok) {
        return
      }
      const data = await response.json()
      for (const game of games.filter(game => data[game])) {
        for (const marker of data[game].campfires) {
          addPointOfInterest(game, "campfire", "campfire", marker)
        }
        for (const marker of data[game].machines) {
          addPointOfInterest(game, "machine-site", marker.machine, marker)
        }
        for (const marker of data[game].settlements || []) {
          addPointOfInterest(game, "settlement", marker.icon, marker)
        }
        for (const marker of data[game].tallnecks || []) {
          addPointOfInterest(game, "tallneck", marker.icon, marker)
        }
      }
      needsDraw = true
    } catch (error) {
      console.warn(error)
    }
  }

  return {
    place,
    setMode,
    addMarker(element, x, y) {
      markerLayer.append(element)
      const marker = { element, x, y }
      markers.add(marker)
      needsDraw = true
      return {
        move(nx, ny) {
          marker.x = nx
          marker.y = ny
          needsDraw = true
        },
        remove() {
          markers.delete(marker)
          element.remove()
          needsDraw = true
        }
      }
    },
    setLines(pairs) {
      overlay.replaceChildren()
      lines = pairs.map(ends => {
        const element = document.createElementNS("http://www.w3.org/2000/svg", "line")
        element.setAttribute("class", "map-line")
        overlay.append(element)
        return { ends, element }
      })
      needsDraw = true
    },
    fit(points, { snap = false, inset = 0, start = null, game = null } = {}) {
      const box = points?.length ? { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) } : game ? tileExtent(game) : extent
      pendingFit = { box, snap, inset, start }
      needsDraw = true
    },
    refresh() {
      needsDraw = true
    },
    setFeatures({ modes: modesOn = true, readouts = true, compass: compassOn = true, icons = true }) {
      modeToggle.hidden = !modesOn
      if (!modesOn) {
        setMode(false, true)
      }
      scaleBar.hidden = !readouts
      compassFrame.hidden = !compassOn
      iconsOn = icons
      needsDraw = true
    },
    setPoiShown(type, shown) {
      if (shown) {
        hiddenTypes.delete(type)
      } else {
        hiddenTypes.add(type)
      }
      needsDraw = true
    },
    nudge(x, y) {
      pivotSet = false
      const speed = camera.distance * 0.75
      const sh = Math.sin(camera.heading), ch = Math.cos(camera.heading)
      flight = null
      velocity = { x: (x * ch + y * sh) * speed, y: (y * ch - x * sh) * speed }
      needsDraw = true
    },
    zoomBy(factor) {
      flight = null
      camera.target *= factor
      clampCamera()
      needsDraw = true
    }
  }
}
