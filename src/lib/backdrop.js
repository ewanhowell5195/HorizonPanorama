export const SLIDE_MS = 9000
const DRIFT_MS = 18000
const FADE_MS = 1800
const HATCH_SCREEN_PX = 300
const FOG_COLOR = [7 / 255, 9 / 255, 12 / 255]
const FOG_OPACITY = 0.9
// must match CLOSE_UPS in tools/game/build_map_previews.py
const MAP_CLOSE_UPS = 8

const vertexSource = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }`

const fragmentSource = `#version 300 es
  precision highp float;
  uniform sampler2D uImage;
  uniform sampler2D uHatch;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform vec4 uView;
  uniform vec4 uBox;
  uniform float uAspect;
  uniform float uFocus;
  uniform float uAlpha;
  uniform vec4 uFog;
  uniform vec2 uHatchOffset;
  uniform vec3 uFogColor;
  uniform float uFogOpacity;
  out vec4 outColor;

  vec2 cover(vec2 p, float imageAspect, vec4 view, float focus) {
    float screenAspect = uResolution.x / uResolution.y;
    vec2 uv = p;
    if (screenAspect > imageAspect) {
      uv.y = 0.5 + (p.y - 0.5) * imageAspect / screenAspect;
    } else {
      uv.x = 0.5 + (p.x - 0.5) * screenAspect / imageAspect;
    }
    float visible = min(screenAspect / imageAspect, 1.0) / view.z;
    float edge = visible / 2.0 + abs(view.x);
    float centre = edge < 0.5 ? clamp(0.5 - (focus - 0.5) * visible, edge, 1.0 - edge) : 0.5;
    return 0.5 + (uv - 0.5) / view.z + view.xy + vec2(centre - 0.5, 0.0);
  }

  vec3 slide(sampler2D image, vec2 p, float imageAspect, vec4 view, vec4 box, float focus) {
    if (box.z <= box.x) {
      return texture(image, cover(p, imageAspect, view, focus)).rgb;
    }
    vec2 uv = (p - box.xy) / (box.zw - box.xy);
    float boxAspect = (box.z - box.x) * uResolution.x / ((box.w - box.y) * uResolution.y);
    if (boxAspect > imageAspect) {
      uv.x = 0.5 + (uv.x - 0.5) * boxAspect / imageAspect;
    } else {
      uv.y = 0.5 + (uv.y - 0.5) * imageAspect / boxAspect;
    }
    uv = 0.5 + (uv - 0.5) / view.z;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
      return vec3(0.0);
    }
    return texture(image, uv).rgb;
  }

  void main() {
    vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 p = pixel / uResolution;
    vec3 color = slide(uImage, p, uAspect, uView, uBox, uFocus);
    vec2 css = pixel / uPixelRatio;
    vec2 screen = uResolution / uPixelRatio;
    bool portrait = uFog.w > 0.5;
    float across = portrait ? css.x / screen.x : css.y / screen.y;
    float wave = (sin(across * 5.1 + uFog.z) * 0.6 + sin(across * 11.7 + uFog.z * 2.0) * 0.4) * (portrait ? 28.0 : 46.0);
    float along = portrait ? screen.y - css.y : css.x;
    float mask = clamp(0.5 + (along - uFog.x - wave) / uFog.y, 0.0, 1.0);
    float edge = (clamp((mask - 0.5) / 0.3, 0.0, 1.0) + clamp((mask - 0.2) / 0.3, 0.0, 1.0)) * 0.5;
    float hatch = texture(uHatch, css / ${HATCH_SCREEN_PX.toFixed(1)} + uHatchOffset).r;
    float fog = 1.0 - clamp((hatch * 0.4 - 0.7 + edge) * 50.0, 0.0, 1.0);
    outColor = vec4(mix(color, uFogColor, fog * uFogOpacity), uAlpha);
  }`

export async function createBackdrop(canvas, { onSlide } = {}) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false })
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic")

  function compile(type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader))
    }
    return shader
  }

  const program = gl.createProgram()
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
  gl.bindAttribLocation(program, 0, "position")
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  const uniforms = Object.fromEntries(["uImage", "uHatch", "uResolution", "uPixelRatio", "uView", "uBox", "uAspect", "uFocus", "uAlpha", "uFog", "uHatchOffset", "uFogColor", "uFogOpacity"].map(name => [name, gl.getUniformLocation(program, name)]))
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  function texture(source, wrap) {
    const result = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, result)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (anisotropy) {
      gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 4)
    }
    return result
  }

  async function bitmap(url, options) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`)
    }
    return createImageBitmap(await response.blob(), options)
  }

  const entries = Object.entries(await (await fetch("/backgrounds/backgrounds.json")).json()).flatMap(([game, files]) => files.map(file => ({ file, game })))
  const hatchImage = await bitmap("/map/hatch.avif", { colorSpaceConversion: "none" }).catch(() => null)
  const hatch = texture(hatchImage || new ImageData(new Uint8ClampedArray([128, 128, 128, 255]), 1, 1), gl.REPEAT)
  const blank = texture(new ImageData(new Uint8ClampedArray(FOG_COLOR.map(value => Math.round(value * 255)).concat(255)), 1, 1), gl.CLAMP_TO_EDGE)
  const cache = new Map()
  const phase = Math.random() * Math.PI * 2
  const hatchOffset = [Math.random(), Math.random()]
  let source = entries
  let order = []
  let layers = [{ texture: blank, aspect: 16 / 9, start: -FADE_MS, drift: 0 }]
  let cycle = 0
  let current = null
  let token = 0
  let active = false

  function nextEntry() {
    if (!order.length) {
      order = source.slice().sort(() => Math.random() - 0.5)
      if (current && order[0] === current && order.length > 1) {
        order.push(order.shift())
      }
    }
    return order.shift()
  }

  function load(entry) {
    if (!cache.has(entry.file)) {
      cache.set(entry.file, bitmap(`/backgrounds/${entry.file}.avif`).then(image => {
        const slide = { texture: texture(image, gl.CLAMP_TO_EDGE), aspect: image.width / image.height }
        image.close()
        return slide
      }))
    }
    return cache.get(entry.file)
  }

  async function show(entry) {
    const mine = ++token
    current = entry
    const slide = await load(entry)
    if (mine !== token) {
      return
    }
    layers.push({ texture: slide.texture, aspect: slide.aspect, start: performance.now(), drift: Math.random() < 0.5 ? 0 : 1, boxed: Boolean(entry.boxed), focused: Boolean(entry.focused) })
    onSlide?.(entry)
  }

  function view(slide, now) {
    const t = Math.min(Math.max((now - slide.start) / DRIFT_MS, 0), 1)
    const k = slide.drift ? 1 - t : t
    if (slide.boxed) {
      return [0, 0, 0.99 + 0.01 * t, 0]
    }
    return slide.drift ? [0.014 * k, -0.01 * k, 1.02 + 0.08 * k, 0] : [-0.016 * k, -0.008 * k, 1.02 + 0.08 * k, 0]
  }

  function frame(now) {
    requestAnimationFrame(frame)
    if (active) {
      draw(now)
    }
  }

  function opacity(layer, now) {
    const fade = Math.min(Math.max((now - layer.start) / FADE_MS, 0), 1)
    return fade * fade * (3 - 2 * fade)
  }

  function draw(now) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const screenWidth = canvas.clientWidth, screenHeight = canvas.clientHeight
    const width = Math.round(screenWidth * ratio)
    const height = Math.round(screenHeight * ratio)
    if (!width || !height) {
      return
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const portrait = screenWidth < 760
    const middle = portrait ? screenHeight * 0.6 : Math.min(Math.max(screenWidth * 0.52, 940), screenWidth * 0.72)
    const band = portrait ? screenHeight * 0.5 : 900
    gl.viewport(0, 0, width, height)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, hatch)
    gl.uniform1i(uniforms.uImage, 0)
    gl.uniform1i(uniforms.uHatch, 1)
    gl.uniform2f(uniforms.uResolution, width, height)
    gl.uniform1f(uniforms.uPixelRatio, width / screenWidth)
    const box = portrait ? [0.04, 70 / screenHeight, 0.96, Math.max((screenHeight - middle - band * 0.12) / screenHeight, 0.3)] : [(middle + band * 0.12) / screenWidth, 80 / screenHeight, 1 - 16 / screenWidth, 1 - 96 / screenHeight]
    const focus = portrait ? 0.5 : Math.min((middle + band * 0.3 + screenWidth) / 2 / screenWidth, 0.8)
    gl.uniform4f(uniforms.uFog, middle, band, phase, portrait ? 1 : 0)
    gl.uniform2f(uniforms.uHatchOffset, hatchOffset[0], hatchOffset[1])
    gl.uniform3f(uniforms.uFogColor, FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2])
    gl.uniform1f(uniforms.uFogOpacity, FOG_OPACITY)
    const covered = layers.findLastIndex(layer => opacity(layer, now) >= 1)
    layers = layers.slice(Math.max(covered, 0))
    gl.activeTexture(gl.TEXTURE0)
    for (const layer of layers) {
      gl.bindTexture(gl.TEXTURE_2D, layer.texture)
      gl.uniform4fv(uniforms.uView, view(layer, now))
      gl.uniform4fv(uniforms.uBox, layer.boxed ? box : [0, 0, 0, 0])
      gl.uniform1f(uniforms.uFocus, layer.focused ? focus : 0.5)
      gl.uniform1f(uniforms.uAspect, layer.aspect)
      gl.uniform1f(uniforms.uAlpha, opacity(layer, now))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }

  requestAnimationFrame(frame)

  return {
    next() {
      return show(nextEntry())
    },
    useMaps(game, title) {
      source = Array.from({ length: MAP_CLOSE_UPS }, (_, n) => ({ file: `map-${game}-${n + 1}`, game: title, label: "Map", focused: true }))
      order = []
      return show({ file: `map-${game}`, game: title, label: "Map", boxed: true })
    },
    useScreenshots() {
      if (source !== entries) {
        source = entries
        order = []
      }
    },
    cycle(on) {
      clearInterval(cycle)
      cycle = on ? setInterval(() => show(nextEntry()), SLIDE_MS) : 0
    },
    setActive(on) {
      active = on
    },
    preload(count) {
      entries.slice().sort(() => Math.random() - 0.5).slice(0, count).forEach(load)
    }
  }
}
