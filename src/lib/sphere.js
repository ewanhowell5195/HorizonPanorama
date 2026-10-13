const MIN_FOV = 15
const MAX_FOV = 110

const vertexSource = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }`

const fragmentSource = `#version 300 es
  precision highp float;
  uniform sampler2D panorama;
  uniform vec2 resolution;
  uniform float yaw;
  uniform float pitch;
  uniform float tanHalf;
  out vec4 color;
  const float PI = 3.14159265358979;

  void main() {
    vec2 ndc = gl_FragCoord.xy / resolution * 2.0 - 1.0;
    float aspect = resolution.x / resolution.y;
    vec3 forward = vec3(sin(yaw) * cos(pitch), cos(yaw) * cos(pitch), sin(pitch));
    vec3 right = vec3(cos(yaw), -sin(yaw), 0.0);
    vec3 up = cross(right, forward);
    vec3 dir = normalize(forward + right * ndc.x * tanHalf * aspect + up * ndc.y * tanHalf);
    vec2 uv = vec2(atan(dir.x, dir.y) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(dir.z, -1.0, 1.0)) / PI);
    vec2 dx = dFdx(uv);
    vec2 dy = dFdy(uv);
    dx.x -= round(dx.x);
    dy.x -= round(dy.x);
    color = textureGrad(panorama, uv, dx, dy);
  }`

export function createSphere(canvas, { onHeading } = {}) {
  const gl = canvas.getContext("webgl2", { antialias: false })
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }

  const view = { yaw: 0, pitch: 0, fov: 75 }
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic")
  let texture = null
  let needsDraw = true
  let active = true
  let locked = false

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
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  const uniforms = Object.fromEntries(["panorama", "resolution", "yaw", "pitch", "tanHalf"].map(name => [name, gl.getUniformLocation(program, name)]))

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, "position")
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  async function fitToTexture(source) {
    const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    if (source.width <= limit && source.height <= limit) {
      return source
    }
    const scale = Math.min(limit / source.width, limit / source.height)
    const resized = await createImageBitmap(source, { resizeWidth: Math.floor(source.width * scale), resizeHeight: Math.floor(source.height * scale), resizeQuality: "high" })
    source.close()
    return resized
  }

  async function decode(url, onProgress) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`)
    }
    const total = Number(response.headers.get("Content-Length")) || 0
    let blob
    if (onProgress && total && response.body) {
      const reader = response.body.getReader()
      const chunks = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
        received += value.length
        onProgress(received / total)
      }
      blob = new Blob(chunks, { type: response.headers.get("Content-Type") || "image/avif" })
    } else {
      blob = await response.blob()
    }
    onProgress?.(1)
    return fitToTexture(await createImageBitmap(blob))
  }

  function upload(image) {
    const result = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, result)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (anisotropy) {
      gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
    }
    image.close()
    return result
  }

  function resize() {
    const scale = window.devicePixelRatio || 1
    const width = Math.round(canvas.clientWidth * scale)
    const height = Math.round(canvas.clientHeight * scale)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      needsDraw = true
    }
  }

  function draw() {
    requestAnimationFrame(draw)
    resize()
    if (!needsDraw || !texture || !canvas.width) {
      return
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.panorama, 0)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.yaw, view.yaw)
    gl.uniform1f(uniforms.pitch, view.pitch)
    gl.uniform1f(uniforms.tanHalf, Math.tan(view.fov * Math.PI / 360))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    onHeading?.(((view.yaw * 180 / Math.PI) % 360 + 360) % 360)
    needsDraw = false
  }

  function look(deltaYaw, deltaPitch) {
    const limit = Math.PI / 2 - 0.001
    view.yaw += deltaYaw
    view.pitch = Math.max(-limit, Math.min(limit, view.pitch + deltaPitch))
    needsDraw = true
  }

  function zoom(factor) {
    view.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, view.fov * factor))
    needsDraw = true
  }

  const pointers = new Map()
  let pinchDistance = 0

  function pinchSpan() {
    const [a, b] = Array.from(pointers.values())
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  canvas.addEventListener("pointerdown", event => {
    if (locked) {
      return
    }
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.classList.add("dragging")
    if (pointers.size === 2) {
      pinchDistance = pinchSpan()
    }
  })

  canvas.addEventListener("pointermove", event => {
    const previous = pointers.get(event.pointerId)
    if (!previous) {
      return
    }
    const current = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, current)
    if (pointers.size === 2) {
      const span = pinchSpan()
      zoom(pinchDistance / span)
      pinchDistance = span
      return
    }
    const step = 2 * Math.tan(view.fov * Math.PI / 360) / canvas.clientHeight
    look(-(current.x - previous.x) * step, (current.y - previous.y) * step)
  })

  function endPointer(event) {
    pointers.delete(event.pointerId)
    if (!pointers.size) {
      canvas.classList.remove("dragging")
    }
  }

  canvas.addEventListener("pointerup", endPointer)
  canvas.addEventListener("pointercancel", endPointer)

  canvas.addEventListener("wheel", event => {
    event.preventDefault()
    if (!locked) {
      zoom(Math.exp(event.deltaY * 0.001))
    }
  }, { passive: false })

  window.addEventListener("keydown", event => {
    if (!active || locked || event.target.closest?.("input, textarea")) {
      return
    }
    const step = 2 * Math.PI / 180
    if (event.key === "ArrowLeft") {
      look(-step, 0)
    } else if (event.key === "ArrowRight") {
      look(step, 0)
    } else if (event.key === "ArrowUp") {
      look(0, step)
    } else if (event.key === "ArrowDown") {
      look(0, -step)
    } else if (event.key === "+" || event.key === "=") {
      zoom(0.9)
    } else if (event.key === "-") {
      zoom(1 / 0.9)
    }
  })

  requestAnimationFrame(draw)

  return {
    decode,
    upload,
    present(next, yaw, pitch = 0) {
      if (texture) {
        gl.deleteTexture(texture)
      }
      texture = next
      view.yaw = yaw
      view.pitch = pitch
      view.fov = 75
      needsDraw = true
    },
    discard(unused) {
      gl.deleteTexture(unused)
    },
    setActive(value) {
      active = value
    },
    setLocked(value) {
      locked = value
      pointers.clear()
      canvas.classList.remove("dragging")
      canvas.classList.toggle("locked", value)
    }
  }
}
