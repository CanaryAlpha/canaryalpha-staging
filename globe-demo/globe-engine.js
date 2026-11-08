/*
 * Globe demo: the WebGL renderer. Loaded by globe.js only once the globe
 * is on screen (dynamic import), so nothing here costs the page anything
 * until then. Plain WebGL 1, no library: about 20 KB, versus ~170 KB
 * gzipped for three.js.
 *
 * What it draws, back to front:
 *   1. the planet: a unit sphere textured with a greyscale NASA Blue Marble
 *      image, relief from a GEBCO elevation map (bump mapping: the normal is
 *      tilted by the elevation gradient), oceans darker with a specular
 *      highlight, a soft terminator, night lights on the dark side, cloud
 *      shadows;
 *   2. the clouds: a second sphere just above the surface, semi-transparent,
 *      turning a little faster than the planet, with a few procedural storm
 *      systems (spiral vortices) swirling in the cloud layer;
 *   3. the city dots: GL_POINTS on the surface in a local east/north frame
 *      around the chosen city (positions stay small numbers, so no
 *      float precision jitter when zoomed in to a few kilometres);
 *   4. the atmosphere: one screen-facing quad whose fragments measure the
 *      ray's distance from the planet's edge, drawn as a soft glow.
 *
 * The sun is fixed in camera space (upper right, in front), so the visible
 * hemisphere is always lit and the night side sits at the lower left limb.
 *
 * Texture sources, conversion and licences: tools/globe-textures.py and the
 * page's "About this demo" note.
 */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

// ---- small matrix helpers (column-major Float64 arrays) -------------------
function mat4Identity() {
  return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
function mat4Multiply(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const o = new Float64Array(16);
  o[0] = f / aspect; o[5] = f;
  o[10] = (far + near) / (near - far); o[11] = -1;
  o[14] = (2 * far * near) / (near - far);
  return o;
}
function mat4LookAt(eye, target, up) {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  const o = new Float64Array(16);
  o[0] = x[0]; o[4] = x[1]; o[8] = x[2];
  o[1] = y[0]; o[5] = y[1]; o[9] = y[2];
  o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
  o[12] = -dot(x, eye); o[13] = -dot(y, eye); o[14] = -dot(z, eye); o[15] = 1;
  return o;
}
function mat4RotateY(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const o = mat4Identity();
  o[0] = c; o[8] = s; o[2] = -s; o[10] = c;
  return o;
}
function mat4FromBasis(x, y, z, t) {
  return new Float64Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, t[0], t[1], t[2], 1]);
}
function mat3NormalFromMat4(m) {
  // Rotation-only matrices here, so the upper 3x3 is its own inverse transpose.
  return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
}
function f32(m) { return new Float32Array(m); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// Geographic (degrees) to a unit vector; lon 0 faces +z, east is +x.
export function geoToVec(lonDeg, latDeg) {
  const lon = lonDeg * DEG, lat = latDeg * DEG;
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}

// ---- shaders ---------------------------------------------------------------
const SPHERE_VS = `
attribute vec3 aPos;
attribute vec2 aUV;
uniform mat4 uMV;
uniform mat4 uProj;
uniform mat3 uNormalMV;
varying vec3 vNormal;    // view space
varying vec3 vViewPos;   // view space
varying vec2 vUV;
varying vec3 vObjPos;    // object space (for tangent frames)
void main() {
  vec4 p = uMV * vec4(aPos, 1.0);
  vViewPos = p.xyz;
  vNormal = uNormalMV * aPos;
  vUV = aUV;
  vObjPos = aPos;
  gl_Position = uProj * p;
}`;

const PLANET_FS = `
precision highp float;
uniform sampler2D tDay;
uniform sampler2D tElev;
uniform sampler2D tNight;
uniform sampler2D tClouds;
uniform vec3 uSun;          // view space, normalised
uniform vec2 uTexel;        // 1 / texture size
uniform float uBump;        // relief strength
uniform float uCloudShift;  // cloud layer's extra rotation (uv units)
uniform mat3 uNormalMV;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec2 vUV;
varying vec3 vObjPos;

float elev(vec2 uv) { return texture2D(tElev, uv).r; }

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vViewPos);

  // Elevation gradient -> perturbed normal. Tangent frame on the sphere from
  // the object-space position: east (du) and north (dv) directions.
  float h = elev(vUV);
  float hx = elev(vUV + vec2(uTexel.x, 0.0)) - elev(vUV - vec2(uTexel.x, 0.0));
  float hy = elev(vUV + vec2(0.0, uTexel.y)) - elev(vUV - vec2(0.0, uTexel.y));
  vec3 P = normalize(vObjPos);
  vec3 east = normalize(vec3(P.z, 0.0, -P.x) + vec3(1e-5, 0.0, 0.0));
  vec3 north = cross(P, east);
  float ocean = 1.0 - smoothstep(0.03, 0.08, h);
  float bump = uBump * (1.0 - ocean);
  vec3 Nobj = normalize(P - east * hx * bump - north * (-hy) * bump);
  vec3 Nb = normalize(uNormalMV * Nobj);

  float day = texture2D(tDay, vUV).r;
  float night = texture2D(tNight, vUV).r;
  // Cloud shadow: the cloud layer sits above, turned a little further on.
  float cloud = texture2D(tClouds, vec2(vUV.x - uCloudShift, vUV.y)).r;
  float shadow = 1.0 - 0.45 * smoothstep(0.25, 0.9, cloud);

  float ndl = dot(Nb, uSun);
  float ndlSmooth = dot(N, uSun);
  float lit = smoothstep(-0.12, 0.35, ndlSmooth);        // soft terminator
  float diffuse = max(ndl, 0.0) * 0.85 + 0.15 * max(ndlSmooth, 0.0);

  // Land: the greyscale image with relief; ocean: darker, with a highlight.
  float land = day * (0.55 + 0.75 * diffuse);
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * 0.55 * lit;
  float sea = day * 0.42 * (0.45 + 0.8 * diffuse) + spec;
  float surface = mix(land, sea, ocean) * shadow;

  // Night side: a dim surface plus city lights.
  float dark = (0.045 + 0.02 * day) + night * 0.55;
  float c = mix(dark, surface, lit);

  // Thin bright rim where the atmosphere scatters, on the lit side.
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5) * 0.35 * (0.3 + 0.7 * lit);
  c += rim;
  gl_FragColor = vec4(vec3(c), 1.0);
}`;

const CLOUD_FS = `
precision highp float;
#define MAX_STORMS 6
uniform sampler2D tClouds;
uniform vec3 uSun;
uniform float uTime;
uniform float uShift;              // cloud rotation offset (uv units)
uniform int uStormCount;
uniform vec4 uStorms[MAX_STORMS];  // x: lon (rad), y: lat (rad), z: radius (rad), w: spin
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec2 vUV;
varying vec3 vObjPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vViewPos);
  vec3 P = normalize(vObjPos);
  vec2 uv = vec2(vUV.x - uShift, vUV.y);

  // Storms: each one twists the cloud texture around its centre (a vortex,
  // tightest at the eye) and adds a textured mass of cloud in spiral bands
  // that turn with time, fading out towards its radius.
  float storm = 0.0;
  vec2 swirl = vec2(0.0);
  for (int i = 0; i < MAX_STORMS; i++) {
    if (i >= uStormCount) break;
    vec4 s = uStorms[i];
    vec3 C = vec3(cos(s.y) * sin(s.x), sin(s.y), cos(s.y) * cos(s.x));
    float d = acos(clamp(dot(P, C), -1.0, 1.0));
    if (d < s.z) {
      vec3 east = normalize(vec3(C.z, 0.0, -C.x) + vec3(1e-5, 0.0, 0.0));
      vec3 north = cross(C, east);
      vec2 local = vec2(dot(P - C, east), dot(P - C, north));  // radians on the sphere
      float r = d / s.z;                                        // 0 centre .. 1 edge
      float fall = 1.0 - smoothstep(0.3, 1.0, r);
      float ang = atan(local.y, local.x);
      float t = uTime * s.w;
      float dir = s.w < 0.0 ? -1.0 : 1.0;
      // Vortex: rotate the sampling point about the centre, most near the eye.
      float rot = dir * (5.0 * (1.0 - r) * (1.0 - r) + 1.2 * (1.0 - r)) + t * 0.25;
      float cr = cos(rot), sr = sin(rot);
      vec2 rl = vec2(local.x * cr - local.y * sr, local.x * sr + local.y * cr) - local;
      // Radians to texture units: u spans 2*pi, v spans pi (and points south).
      swirl += vec2(rl.x / 6.2831853, -rl.y / 3.1415927) * fall;
      // Spiral bands with gaps between them, turning with time; a clear eye.
      float arms = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(dir * ang * 2.0 + 7.0 * log(max(r, 0.03)) - t * 1.1));
      float eye = smoothstep(0.03, 0.12, r);
      storm = max(storm, fall * eye * (0.2 + 0.8 * arms));
    }
  }
  vec2 suv = uv + swirl;
  float c = texture2D(tClouds, suv).r;
  float alpha = smoothstep(0.12, 0.85, c);
  // Storm mass: the bands are shaped by cloud texture (a swizzled, finer
  // read of the same map), so they break up like real cloud rather than
  // painting a smooth spiral.
  float ct = texture2D(tClouds, vec2(suv.y * 2.0 + 0.3, suv.x)).r;
  float stormAlpha = storm * smoothstep(0.08, 0.7, 0.3 + 0.7 * ct);
  alpha = clamp(max(alpha, stormAlpha) + 0.25 * alpha * storm, 0.0, 1.0);
  alpha *= uOpacity;

  float lit = smoothstep(-0.2, 0.3, dot(N, uSun));
  float shade = 0.5 + 0.5 * max(dot(N, uSun), 0.0);
  float col = mix(0.08, 0.98, lit) * (0.55 + 0.45 * shade);
  float edge = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  alpha *= 1.0 - 0.35 * edge;
  gl_FragColor = vec4(vec3(col), alpha);
}`;

const ATMO_VS = `
attribute vec2 aQuad;
uniform vec3 uCenter;     // planet centre, view space
uniform float uHalfSize;
uniform mat4 uProj;
varying vec3 vViewPos;
void main() {
  vec3 p = uCenter + vec3(aQuad * uHalfSize, 0.0);
  vViewPos = p;
  gl_Position = uProj * vec4(p, 1.0);
}`;

const ATMO_FS = `
precision highp float;
uniform vec3 uCenter;
uniform vec3 uSun;
uniform float uGlow;       // glow colour (grey level)
uniform float uStrength;
varying vec3 vViewPos;
void main() {
  vec3 dir = normalize(vViewPos);
  float along = dot(uCenter, dir);
  vec3 closest = dir * along;                 // ray point nearest the centre
  float b = length(closest - uCenter);        // impact parameter (planet r = 1)
  vec3 n = normalize(closest - uCenter);      // outward normal at the limb
  float lit = smoothstep(-0.35, 0.45, dot(n, uSun));
  float outside = exp(-(b - 1.0) * 14.0) * step(1.0, b);
  float inside = pow(smoothstep(0.78, 1.0, b), 3.0) * step(b, 1.0) * 0.5;
  float a = (outside + inside) * uStrength * (0.25 + 0.75 * lit);
  gl_FragColor = vec4(vec3(uGlow), clamp(a, 0.0, 1.0));
}`;

const DOTS_VS = `
attribute vec3 aLocal;     // east, north (Earth radii), up
uniform mat4 uMV;
uniform mat4 uProj;
uniform float uDotPx;
uniform float uDpr;
uniform float uRadius;     // fade the dots out towards this distance from the centre
varying float vDepth;
varying float vFade;
void main() {
  vec4 p = uMV * vec4(aLocal, 1.0);
  vDepth = -p.z;
  vFade = 1.0 - smoothstep(0.7, 1.0, length(aLocal.xy) / uRadius);
  float px = uDotPx * (0.003 / max(-p.z, 1e-5));
  gl_PointSize = clamp(px, 0.6, 7.0) * uDpr;
  gl_Position = uProj * p;
}`;

const DOTS_FS = `
precision mediump float;
uniform float uColor;
uniform float uAlpha;
varying float vDepth;
varying float vFade;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.3, r) * uAlpha * vFade;
  gl_FragColor = vec4(vec3(uColor), a);
}`;

// ---- geometry --------------------------------------------------------------
function buildSphere(segX, segY) {
  const pos = [], uv = [], idx = [];
  for (let y = 0; y <= segY; y++) {
    const v = y / segY;
    const lat = (0.5 - v) * Math.PI;
    for (let x = 0; x <= segX; x++) {
      const u = x / segX;
      const lon = (u - 0.5) * TAU;
      pos.push(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      uv.push(u, v);
    }
  }
  for (let y = 0; y < segY; y++) {
    for (let x = 0; x < segX; x++) {
      const a = y * (segX + 1) + x, b = a + segX + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx), count: idx.length };
}

// ---- GL plumbing -----------------------------------------------------------
function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("shader: " + log);
  }
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("program: " + gl.getProgramInfoLog(p));
  const u = {}, a = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name); }
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) { const info = gl.getActiveAttrib(p, i); a[info.name] = gl.getAttribLocation(p, info.name); }
  return { p, u, a };
}
function buffer(gl, target, data, usage) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, usage || gl.STATIC_DRAW);
  return b;
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("texture failed: " + url));
    img.src = url;
  });
}
function texture(gl, img, wrapS) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS || gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch (e) { return false; }
}

// Storm systems: lon, lat (degrees), radius (degrees), spin (direction and
// speed). Northern hemisphere cyclones turn anticlockwise, southern clockwise.
const STORMS = [
  [-62, 24, 7.5, 1.0],    // West Atlantic hurricane
  [138, 18, 8.5, 1.15],   // West Pacific typhoon
  [68, -16, 6.5, -0.9],   // Indian Ocean cyclone (southern)
  [-122, -18, 6.0, -1.05],// South Pacific
  [-30, 50, 9.0, 0.6],    // North Atlantic low
  [100, -40, 7.5, -0.7]   // Southern Ocean low
];

/**
 * Creates the globe in a canvas.
 * options: { canvas, textureBase, quality: "high"|"low", reducedMotion,
 *            onStatus(fn) }.
 */
export function createGlobe(options) {
  const canvas = options.canvas;
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" })
    || canvas.getContext("experimental-webgl");
  if (!gl) throw new Error("no WebGL");

  const low = options.quality === "low";
  const maxDpr = low ? 1.25 : 2;
  const stormCount = low ? 2 : 5;
  const sphere = buildSphere(low ? 128 : 192, low ? 64 : 96);

  const planetProg = program(gl, SPHERE_VS, PLANET_FS);
  const cloudProg = program(gl, SPHERE_VS, CLOUD_FS);
  const atmoProg = program(gl, ATMO_VS, ATMO_FS);
  const dotsProg = program(gl, DOTS_VS, DOTS_FS);

  const posBuf = buffer(gl, gl.ARRAY_BUFFER, sphere.pos);
  const uvBuf = buffer(gl, gl.ARRAY_BUFFER, sphere.uv);
  const idxBuf = buffer(gl, gl.ELEMENT_ARRAY_BUFFER, sphere.idx);
  const quadBuf = buffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  let dotsBuf = null, dotsCount = 0, dotsModel = null, dotsAlpha = 0, dotsRadius = 0.001;

  const state = {
    // camera orbit (radians) and distance from the centre (planet radius 1)
    lon: 0.35, lat: 0.32, dist: 2.9,
    minDist: 1.0022, maxDist: 4.2,
    rotation: 0,            // planet's own rotation about its axis
    cloudShift: 0,          // clouds' extra rotation, in texture units
    spin: !options.reducedMotion,
    zoomEnabled: true,
    reducedMotion: !!options.reducedMotion,
    glowColor: 0.8, glowStrength: 1.0, dotColor: 1.0,
    time: 0,
    running: false,
    ready: false
  };
  const SPIN_RATE = TAU / 110;            // one turn every ~110 s
  const CLOUD_RATE = SPIN_RATE * 0.18;    // clouds gain ~18% on the planet
  let velLon = 0, velLat = 0;             // drag momentum (rad/s)
  let flight = null;                      // fly-to animation
  let textures = null;
  let width = 1, height = 1, dpr = 1;
  let lastFrame = 0, frameHandle = 0;
  const fps = { frames: 0, since: 0, value: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(rect.width * d)), h = Math.max(1, Math.round(rect.height * d));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    width = w; height = h; dpr = d;
    gl.viewport(0, 0, w, h);
  }

  async function loadTextures() {
    const base = options.textureBase;
    const size = low ? 1024 : 2048;
    const [day, elev, clouds, night] = await Promise.all([
      loadImage(`${base}earth-${size}.webp`),
      loadImage(`${base}elev-${size}.webp`),
      loadImage(`${base}clouds-${size}.webp`),
      loadImage(`${base}night-1024.webp`)
    ]);
    textures = {
      day: texture(gl, day), elev: texture(gl, elev), clouds: texture(gl, clouds), night: texture(gl, night),
      texel: [1 / day.width, 1 / day.height]
    };
    state.ready = true;
  }

  // ---- camera ---------------------------------------------------------------
  function cameraMatrices() {
    const eye = [Math.cos(state.lat) * Math.sin(state.lon), Math.sin(state.lat), Math.cos(state.lat) * Math.cos(state.lon)];
    for (let i = 0; i < 3; i++) eye[i] *= state.dist;
    const view = mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
    const h = state.dist - 1;
    const near = Math.max(0.0004, h * 0.22), far = state.dist + 1.6;
    const proj = mat4Perspective(45 * DEG, width / height, near, far);
    return { view, proj, eye };
  }

  // ---- interaction ----------------------------------------------------------
  const pointers = new Map();
  let dragging = false, pinchDist = 0, lastMove = 0, lastDx = 0, lastDy = 0;
  function rotateBy(dx, dy) {
    const k = 0.0045 * clamp(state.dist - 1, 0.002, 1.9) / 1.9 * 1.9; // slower when close
    const s = 0.0045 * Math.max(0.0025, Math.min(1, (state.dist - 1) / 1.9));
    state.lon -= dx * s;
    state.lat = clamp(state.lat + dy * s, -85 * DEG, 85 * DEG);
    void k;
  }
  function zoomBy(factor) {
    if (!state.zoomEnabled) return;
    const h = state.dist - 1;
    state.dist = clamp(1 + h * factor, state.minDist, state.maxDist);
    requestFrame();
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragging = true; velLon = velLat = 0; flight = null;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      rotateBy(dx, dy);
      const now = performance.now();
      lastDx = dx; lastDy = dy; lastMove = now;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0 && d > 0) zoomBy(pinchDist / d);
      pinchDist = d;
    }
    requestFrame();
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      dragging = false;
      canvas.classList.remove("is-dragging");
      const dt = performance.now() - lastMove;
      if (dt < 60 && !state.reducedMotion) {
        const s = 0.0045 * Math.max(0.0025, Math.min(1, (state.dist - 1) / 1.9));
        velLon = -lastDx * s * 30; velLat = lastDy * s * 30;
      }
    }
    requestFrame();
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (e) => {
    if (!state.zoomEnabled) return;
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomBy(Math.exp(clamp(delta, -120, 120) * 0.0022));
  }, { passive: false });
  canvas.addEventListener("keydown", (e) => {
    const step = 0.06;
    if (e.key === "ArrowLeft") { state.lon -= step; } else if (e.key === "ArrowRight") { state.lon += step; }
    else if (e.key === "ArrowUp") { state.lat = clamp(state.lat + step, -85 * DEG, 85 * DEG); }
    else if (e.key === "ArrowDown") { state.lat = clamp(state.lat - step, -85 * DEG, 85 * DEG); }
    else if (e.key === "+" || e.key === "=") { zoomBy(0.8); } else if (e.key === "-" || e.key === "_") { zoomBy(1.25); }
    else return;
    e.preventDefault(); flight = null; requestFrame();
  });

  // ---- fly to a place ---------------------------------------------------------
  function flyTo(lonDeg, latDeg, distance, duration) {
    const targetLon = lonDeg * DEG + state.rotation;
    const targetLat = clamp(latDeg * DEG, -85 * DEG, 85 * DEG);
    // Shortest way round.
    let fromLon = state.lon;
    const twoPi = TAU;
    fromLon = ((fromLon - targetLon + Math.PI) % twoPi + twoPi) % twoPi - Math.PI + targetLon;
    velLon = velLat = 0;
    if (state.reducedMotion || duration === 0) {
      state.lon = targetLon; state.lat = targetLat; state.dist = distance;
      flight = null; requestFrame();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const angular = Math.hypot(fromLon - targetLon, state.lat - targetLat);
      flight = {
        t0: performance.now(), duration: duration || Math.min(3200, 1400 + angular * 700),
        fromLon, fromLat: state.lat, fromDist: state.dist,
        toLon: targetLon, toLat: targetLat, toDist: distance,
        // Arc up on long trips so the surface does not whip past.
        lift: Math.min(1.2, angular * 0.6) * (state.dist < 1.5 || distance < 1.5 ? 1 : 0.3),
        resolve
      };
      requestFrame();
    });
  }
  function stepFlight(now) {
    if (!flight) return;
    const t = clamp((now - flight.t0) / flight.duration, 0, 1);
    const e = easeInOut(t);
    state.lon = flight.fromLon + (flight.toLon - flight.fromLon) * e;
    state.lat = flight.fromLat + (flight.toLat - flight.fromLat) * e;
    const base = flight.fromDist + (flight.toDist - flight.fromDist) * e;
    state.dist = base + flight.lift * Math.sin(Math.PI * e);
    if (t >= 1) { const r = flight.resolve; flight = null; r(); }
  }

  // ---- city dots ---------------------------------------------------------------
  // points: Float32Array of [east, north] offsets in metres around (lon, lat);
  // radiusMetres: where the data ends, so the dots can fade out before it.
  function setDots(lonDeg, latDeg, pointsMetres, radiusMetres) {
    dotsRadius = Math.max(500, radiusMetres || 6000) / EARTH_RADIUS_M;
    if (dotsBuf) { gl.deleteBuffer(dotsBuf); dotsBuf = null; dotsCount = 0; }
    if (!pointsMetres || !pointsMetres.length) { dotsModel = null; return; }
    const n = pointsMetres.length / 2;
    const local = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      local[i * 3] = pointsMetres[i * 2] / EARTH_RADIUS_M;
      local[i * 3 + 1] = pointsMetres[i * 2 + 1] / EARTH_RADIUS_M;
      local[i * 3 + 2] = 0.00012; // ~750 m above the surface, clear of the mesh facets
    }
    dotsBuf = buffer(gl, gl.ARRAY_BUFFER, local);
    dotsCount = n;
    const C = geoToVec(lonDeg, latDeg);
    const east = normalize([C[2], 0, -C[0]]);
    const north = cross(C, east);
    dotsModel = mat4FromBasis(east, north, C, C);
    dotsAlpha = 0;
    requestFrame();
  }
  function clearDots() { setDots(0, 0, null); }

  // ---- render --------------------------------------------------------------------
  function requestFrame() { if (!frameHandle && state.running) frameHandle = requestAnimationFrame(frame); }

  function frame(now) {
    frameHandle = 0;
    if (!state.running) return;
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    resize();

    let animating = false;
    if (!state.reducedMotion) { state.time += dt; animating = true; }
    if (state.spin && !dragging && !flight && !options.cityMode()) { state.rotation += SPIN_RATE * dt; animating = true; }
    if (!state.reducedMotion) state.cloudShift += CLOUD_RATE * dt / TAU;
    if (velLon || velLat) {
      state.lon += velLon * dt; state.lat = clamp(state.lat + velLat * dt, -85 * DEG, 85 * DEG);
      const damp = Math.exp(-dt * 3.2);
      velLon *= damp; velLat *= damp;
      if (Math.abs(velLon) < 0.002 && Math.abs(velLat) < 0.002) velLon = velLat = 0;
      animating = true;
    }
    if (flight) { stepFlight(now); animating = true; }
    if (dotsBuf && dotsAlpha < 1) { dotsAlpha = Math.min(1, dotsAlpha + dt * 1.5); animating = true; }

    draw();

    fps.frames++;
    if (now - fps.since > 1000) { fps.value = Math.round(fps.frames * 1000 / (now - fps.since)); fps.frames = 0; fps.since = now; if (options.onFps) options.onFps(fps.value); }
    if (animating || dragging) frameHandle = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function draw() {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!textures) return;
    const { view, proj } = cameraMatrices();
    const sun = normalize([0.62, 0.42, 0.66]);   // camera space: upper right, in front
    const model = mat4RotateY(state.rotation);
    const mv = mat4Multiply(view, model);
    const nmv = mat3NormalFromMat4(mv);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Planet
    let P = planetProg;
    gl.useProgram(P.p);
    bindSphere(P);
    gl.uniformMatrix4fv(P.u.uMV, false, f32(mv));
    gl.uniformMatrix4fv(P.u.uProj, false, f32(proj));
    gl.uniformMatrix3fv(P.u.uNormalMV, false, nmv);
    gl.uniform3fv(P.u.uSun, sun);
    gl.uniform2fv(P.u.uTexel, textures.texel);
    gl.uniform1f(P.u.uBump, low ? 9.0 : 12.0);
    gl.uniform1f(P.u.uCloudShift, state.cloudShift);
    bindTex(P.u.tDay, 0, textures.day); bindTex(P.u.tElev, 1, textures.elev);
    bindTex(P.u.tNight, 2, textures.night); bindTex(P.u.tClouds, 3, textures.clouds);
    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);

    // City dots (opaque-ish, before the translucent layers)
    if (dotsBuf && dotsModel && dotsAlpha > 0) {
      const fade = 1 - smooth(0.012, 0.09, state.dist - 1);
      if (fade > 0) {
        P = dotsProg;
        gl.useProgram(P.p);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, dotsBuf);
        gl.enableVertexAttribArray(P.a.aLocal);
        gl.vertexAttribPointer(P.a.aLocal, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(P.u.uMV, false, f32(mat4Multiply(mv, dotsModel)));
        gl.uniformMatrix4fv(P.u.uProj, false, f32(proj));
        gl.uniform1f(P.u.uDotPx, low ? 1.9 : 2.1);
        gl.uniform1f(P.u.uDpr, dpr);
        gl.uniform1f(P.u.uRadius, dotsRadius);
        gl.uniform1f(P.u.uColor, state.dotColor);
        gl.uniform1f(P.u.uAlpha, 0.95 * fade * dotsAlpha);
        gl.drawArrays(gl.POINTS, 0, dotsCount);
        gl.disableVertexAttribArray(P.a.aLocal);
      }
    }

    // Clouds: a slightly larger sphere, scaled in the model matrix.
    const cloudScale = 1.012;
    const cloudModel = mat4RotateY(state.rotation);
    for (let i = 0; i < 12; i++) if (i % 4 !== 3) cloudModel[i] *= cloudScale;
    const cmv = mat4Multiply(view, cloudModel);
    P = cloudProg;
    gl.useProgram(P.p);
    bindSphere(P);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.uniformMatrix4fv(P.u.uMV, false, f32(cmv));
    gl.uniformMatrix4fv(P.u.uProj, false, f32(proj));
    gl.uniformMatrix3fv(P.u.uNormalMV, false, nmv);
    gl.uniform3fv(P.u.uSun, sun);
    gl.uniform1f(P.u.uTime, state.time);
    gl.uniform1f(P.u.uShift, state.cloudShift);
    gl.uniform1i(P.u.uStormCount, stormCount);
    gl.uniform4fv(P.u.uStorms, stormUniforms);
    // Clouds thin out as the camera comes down to a city.
    gl.uniform1f(P.u.uOpacity, 0.92 * smooth(0.004, 0.06, state.dist - 1));
    bindTex(P.u.tClouds, 0, textures.clouds);
    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);

    // Atmosphere quad
    P = atmoProg;
    gl.useProgram(P.p);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(P.a.aQuad);
    gl.vertexAttribPointer(P.a.aQuad, 2, gl.FLOAT, false, 0, 0);
    const center = [view[12], view[13], view[14]];
    gl.uniform3fv(P.u.uCenter, center);
    gl.uniform1f(P.u.uHalfSize, 1.35);
    gl.uniformMatrix4fv(P.u.uProj, false, f32(proj));
    gl.uniform3fv(P.u.uSun, sun);
    gl.uniform1f(P.u.uGlow, state.glowColor);
    gl.uniform1f(P.u.uStrength, state.glowStrength * smooth(0.01, 0.2, state.dist - 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(P.a.aQuad);
    gl.depthMask(true);
  }
  function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function bindSphere(P) {
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(P.a.aPos);
    gl.vertexAttribPointer(P.a.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(P.a.aUV);
    gl.vertexAttribPointer(P.a.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  }
  function bindTex(loc, unit, tex) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }
  const stormUniforms = new Float32Array(6 * 4);
  STORMS.forEach((s, i) => { stormUniforms.set([s[0] * DEG, s[1] * DEG, s[2] * DEG, s[3]], i * 4); });

  // ---- public API ----------------------------------------------------------------
  const api = {
    state,
    start() { if (!state.running) { state.running = true; lastFrame = 0; requestFrame(); } },
    stop() { state.running = false; if (frameHandle) { cancelAnimationFrame(frameHandle); frameHandle = 0; } },
    redraw: requestFrame,
    setSpin(on) { state.spin = !!on; requestFrame(); },
    setZoomEnabled(on) { state.zoomEnabled = !!on; },
    zoomIn() { zoomBy(0.72); }, zoomOut() { zoomBy(1 / 0.72); },
    setTheme({ glow, glowStrength, dot }) { state.glowColor = glow; state.glowStrength = glowStrength; state.dotColor = dot; requestFrame(); },
    flyTo, setDots, clearDots,
    cityDistance: 1.0024,   // about 12 km across the view
    homeDistance: 2.9,
    fps: () => fps.value,
    load: loadTextures,
    isReady: () => state.ready,
    canvas
  };
  resize();
  return api;
}
