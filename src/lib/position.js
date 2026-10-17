const SECRET = "horizon-panorama"

export async function decodePosition(name, text) {
  const key = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SECRET + name)))
  const bytes = Uint8Array.from(atob(text), character => character.charCodeAt(0)).map((value, n) => value ^ key[n])
  const view = new DataView(bytes.buffer)
  return [0, 4, 8].map(offset => Math.round(view.getFloat32(offset, true) * 100) / 100)
}
