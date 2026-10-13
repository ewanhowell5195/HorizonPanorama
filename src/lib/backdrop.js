export const SLIDE_MS = 9000
const DRIFT_MS = 18000
const FADE_MS = 1800
const HATCH_SCREEN_PX = 300
const FOG_COLOR = [7 / 255, 9 / 255, 12 / 255]
const FOG_OPACITY = 0.9

const vertexSource = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }`

const fragmentSource = `#version 300 es
  precision highp float;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform sampler2D uHatch;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform vec4 uFrontView;
  uniform vec4 uBackView;
  uniform vec2 uAspect;
  uniform float uFade;
  uniform vec4 uFog;
  uniform vec2 uHatchOffset;
  uniform vec3 uFogColor;
  uniform float uFogOpacity;
  out vec4 outColor;

  vec2 cover(vec2 p, float imageAspect, vec4 view) {
    float screenAspect = uResolution.x / uResolution.y;
    vec2 uv = p;
    if (screenAspect > imageAspect) {
      uv.y = 0.5 + (p.y - 0.5) * imageAspect / screenAspect;
    } else {
      uv.x = 0.5 + (p.x - 0.5) * screenAspect / imageAspect;
    }
    return 0.5 + (uv - 0.5) / view.z + view.xy;
  }

  void main() {
    vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 p = pixel / uResolution;
    vec3 back = texture(uBack, cover(p, uAspect.y, uBackView)).rgb;
    vec3 front = texture(uFront, cover(p, uAspect.x, uFrontView)).rgb;
    vec3 color = mix(back, front, uFade);
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
    outColor = vec4(mix(color, uFogColor, fog * uFogOpacity), 1.0);
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
  const uniforms = Object.fromEntries(["uFront", "uBack", "uHatch", "uResolution", "uPixelRatio", "uFrontView", "uBackView", "uAspect", "uFade", "uFog", "uHatchOffset", "uFogColor", "uFogOpacity"].map(name => [name, gl.getUniformLocation(program, name)]))
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

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
  const hatchImage = await bitmap("/map/hatch.png", { colorSpaceConversion: "none" }).catch(() => null)
  const hatch = texture(hatchImage || new ImageData(new Uint8ClampedArray([128, 128, 128, 255]), 1, 1), gl.REPEAT)
  const blank = texture(new ImageData(new Uint8ClampedArray(FOG_COLOR.map(value => Math.round(value * 255)).concat(255)), 1, 1), gl.CLAMP_TO_EDGE)
  const cache = new Map()
  const phase = Math.random() * Math.PI * 2
  const hatchOffset = [Math.random(), Math.random()]
  let order = []
  let front = { texture: blank, aspect: 16 / 9, start: 0, drift: 0 }
  let back = front
  let fadeStart = -FADE_MS
  let cycle = 0
  let current = null
  let token = 0
  let active = false

  function nextEntry() {
    if (!order.length) {
      order = entries.slice().sort(() => Math.random() - 0.5)
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
    const now = performance.now()
    back = front
    front = { texture: slide.texture, aspect: slide.aspect, start: now, drift: Math.random() < 0.5 ? 0 : 1 }
    fadeStart = now
    onSlide?.(entry)
  }

  function view(slide, now) {
    const t = Math.min(Math.max((now - slide.start) / DRIFT_MS, 0), 1)
    const k = slide.drift ? 1 - t : t
    return slide.drift ? [0.014 * k, -0.01 * k, 1.02 + 0.08 * k, 0] : [-0.016 * k, -0.008 * k, 1.02 + 0.08 * k, 0]
  }

  function frame(now) {
    requestAnimationFrame(frame)
    if (!active) {
      return
    }
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
    const fade = Math.min(Math.max((now - fadeStart) / FADE_MS, 0), 1)
    gl.viewport(0, 0, width, height)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, front.texture)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, back.texture)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, hatch)
    gl.uniform1i(uniforms.uFront, 0)
    gl.uniform1i(uniforms.uBack, 1)
    gl.uniform1i(uniforms.uHatch, 2)
    gl.uniform2f(uniforms.uResolution, width, height)
    gl.uniform1f(uniforms.uPixelRatio, width / screenWidth)
    gl.uniform4fv(uniforms.uFrontView, view(front, now))
    gl.uniform4fv(uniforms.uBackView, view(back, now))
    gl.uniform2f(uniforms.uAspect, front.aspect, back.aspect)
    gl.uniform1f(uniforms.uFade, fade * fade * (3 - 2 * fade))
    gl.uniform4f(uniforms.uFog, middle, band, phase, portrait ? 1 : 0)
    gl.uniform2f(uniforms.uHatchOffset, hatchOffset[0], hatchOffset[1])
    gl.uniform3f(uniforms.uFogColor, FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2])
    gl.uniform1f(uniforms.uFogOpacity, FOG_OPACITY)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  requestAnimationFrame(frame)

  return {
    next() {
      return show(nextEntry())
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
