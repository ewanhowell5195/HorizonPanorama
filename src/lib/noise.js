export const NOISE_REVEAL_SECONDS = 0.9
export const NOISE_PX = 280
const SOFTNESS = 0.35

export const NOISE_REVEAL_GLSL = `
  vec2 noiseGradient(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
  }
  float perlin(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(dot(noiseGradient(i), f), dot(noiseGradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x), mix(dot(noiseGradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(noiseGradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }
  float noiseField(float size) {
    vec2 uv = gl_FragCoord.xy / size;
    return clamp(0.5 + perlin(uv) * 0.75 + perlin(uv * 2.3 + 17.0) * 0.35, 0.0, 1.0);
  }
  float noiseReveal(float progress, float size) {
    float threshold = noiseField(size) * ${(1 - SOFTNESS).toFixed(2)};
    return smoothstep(threshold, threshold + ${SOFTNESS.toFixed(2)}, progress);
  }
`
