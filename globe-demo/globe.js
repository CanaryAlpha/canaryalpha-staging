/*
 * Globe demo: the page script. Owns the control panel, the city search, the
 * "Use my location" button and the OpenStreetMap street dots. It loads the
 * renderer (globe-engine.js, with its textures) only once the globe stage
 * has scrolled into view, and it stops rendering when the tab is hidden or
 * the stage scrolls off-screen.
 *
 * Data services, all free and keyless (see the page's note):
 *   - Nominatim (nominatim.openstreetmap.org) turns a typed city into
 *     coordinates: one request per search, on submit only (its usage policy
 *     forbids autocomplete and allows at most 1 request/second). The 100 or
 *     so best-known cities are built in, so most searches never leave the
 *     page.
 *   - Overpass API (overpass-api.de) returns the streets around the chosen
 *     city, fetched once per city and kept in memory for the visit.
 *   Both are run by volunteers for the OSM community: fine for a demo, not a
 *   contract. Location: the browser asks for permission only when the button
 *   is clicked; the coordinates are used for the flight and the Overpass
 *   query and are never stored or logged.
 */
(function () {
  "use strict";

  const stage = document.querySelector("[data-globe-stage]");
  if (!stage) return;
  const canvas = stage.querySelector("canvas");
  const poster = stage.querySelector("[data-globe-poster]");
  const status = document.querySelector("[data-globe-status]");
  const panel = document.querySelector("[data-globe-panel]");
  const spinToggle = panel.querySelector("[data-toggle='spin']");
  const zoomToggle = panel.querySelector("[data-toggle='zoom']");
  const zoomIn = panel.querySelector("[data-zoom='in']");
  const zoomOut = panel.querySelector("[data-zoom='out']");
  const form = panel.querySelector("[data-city-form]");
  const input = panel.querySelector("[data-city-input]");
  const locateBtn = panel.querySelector("[data-locate]");
  const backBtn = panel.querySelector("[data-back]");
  const cityLabel = document.querySelector("[data-city-label]");
  const fpsOut = document.querySelector("[data-fps]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const showFps = /[?&]fps=1/.test(location.search);
  if (showFps && fpsOut) fpsOut.hidden = false;

  // Phones and small tablets get the 1024 textures, fewer storms and a lower
  // pixel ratio. Decided when the globe starts (a background tab can report
  // a zero-width viewport before it is shown; that counts as desktop).
  let isMobile = false;
  function decideQuality() {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    isMobile = (width > 0 && width <= 760) || (coarse && width <= 1100)
      || (coarse && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
  }

  let globe = null, engine = null, loading = null;
  let inCity = false, cityToken = 0;
  const dotsCache = new Map();

  function say(text, busy) {
    if (!status) return;
    status.textContent = text || "";
    status.classList.toggle("is-busy", !!busy);
  }

  // ---- lazy load ------------------------------------------------------------
  function supportsWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function showFallback(reason) {
    stage.classList.add("is-fallback");
    canvas.hidden = true;
    panel.querySelectorAll("button, input").forEach((el) => { el.disabled = true; });
    say(reason || "WebGL is not available in this browser, so this is a still image of the globe.");
  }

  // ?nowebgl=1 forces the still-image path, for testing the fallback.
  if (!supportsWebGL() || /[?&]nowebgl=1/.test(location.search)) {
    showFallback();
    return;
  }

  async function boot() {
    if (loading) return loading;
    say("Loading the globe…", true);
    loading = (async () => {
      decideQuality();
      const mod = await import("./globe-engine.js?v=1");
      engine = mod;
      globe = mod.createGlobe({
        canvas,
        textureBase: "./textures/",
        quality: isMobile ? "low" : "high",
        reducedMotion: reducedMotion.matches,
        cityMode: () => inCity,
        onFps: (v) => { if (showFps && fpsOut) fpsOut.textContent = v + " fps"; }
      });
      applyTheme();
      if (showFps) window.__globe = globe; // ?fps=1: testing hook
      await globe.load();
      stage.classList.add("is-ready");
      if (poster) poster.setAttribute("aria-hidden", "true");
      spinToggle.setAttribute("aria-pressed", String(globe.state.spin));
      say(reducedMotion.matches ? "Reduced motion is on: the globe holds still. Drag to turn it." : "");
      if (visible && !document.hidden) globe.start();
      globe.redraw();
    })().catch((err) => {
      console.error(err);
      showFallback("The globe could not start (" + (err && err.message || "WebGL error") + "), so this is a still image.");
    });
    return loading;
  }

  let visible = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0.05;
      if (visible) { boot().then(() => { if (globe && !document.hidden) globe.start(); }); }
      else if (globe) globe.stop();
    });
  }, { threshold: [0, 0.05, 0.5] });
  io.observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (!globe) return;
    if (document.hidden) globe.stop(); else if (visible) globe.start();
  });

  // ---- theme ------------------------------------------------------------------
  function isDark() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme() {
    if (!globe) return;
    // Dark page: a pale glow. Light page: the glow is a grey shadow around the planet.
    globe.setTheme(isDark() ? { glow: 0.82, glowStrength: 1.0, dot: 1.0 } : { glow: 0.3, glowStrength: 0.85, dot: 1.0 });
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  // ---- controls -----------------------------------------------------------------
  function setPressed(btn, on) { btn.setAttribute("aria-pressed", String(!!on)); }
  spinToggle.addEventListener("click", () => {
    const on = spinToggle.getAttribute("aria-pressed") !== "true";
    setPressed(spinToggle, on);
    if (globe) globe.setSpin(on);
  });
  setPressed(spinToggle, !reducedMotion.matches);
  zoomToggle.addEventListener("click", () => {
    const on = zoomToggle.getAttribute("aria-pressed") !== "true";
    setPressed(zoomToggle, on);
    zoomIn.disabled = zoomOut.disabled = !on;
    if (globe) globe.setZoomEnabled(on);
  });
  setPressed(zoomToggle, true);
  zoomIn.addEventListener("click", () => { if (globe) globe.zoomIn(); });
  zoomOut.addEventListener("click", () => { if (globe) globe.zoomOut(); });

  // ---- cities ---------------------------------------------------------------------
  const CITIES = window.GLOBE_DEMO_CITIES || [];
  function findBuiltIn(q) {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    let best = null;
    for (const c of CITIES) {
      const names = [c.n].concat(c.a || []);
      for (const name of names) {
        const n = name.toLowerCase();
        if (n === s) return c;
        if (!best && n.startsWith(s) && s.length >= 3) best = c;
      }
    }
    return best;
  }

  async function geocode(q) {
    const hit = findBuiltIn(q);
    if (hit) return { name: hit.n + ", " + hit.c, lat: hit.lat, lon: hit.lon };
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&featureType=settlement&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("Nominatim answered " + res.status);
    const list = await res.json();
    if (!list.length) return null;
    const r = list[0];
    const name = (r.name || r.display_name.split(",")[0]) + (r.address && r.address.country ? ", " + r.address.country : "");
    return { name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
  }

  // Streets around a point. First choice: OpenStreetMap vector tiles from
  // OpenFreeMap (tiles.openfreemap.org; free, no key, commercial use
  // allowed, attribution required), decoded here from the Mapbox Vector
  // Tile format: a block of zoom-13 tiles around the city (nine on a desktop,
  // four on a phone, more towards the poles), in well under a second. Fallback: the public Overpass API, which is
  // slower (tens of seconds in a dense city). Returns a Float32Array of
  // [east, north] metres from the centre, one per dot.
  const TILEJSON = "https://tiles.openfreemap.org/planet";
  const ROAD_CLASSES = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "minor"]);
  let tileTemplate = null;

  async function fetchStreetDots(lat, lon) {
    const key = lat.toFixed(3) + "," + lon.toFixed(3);
    if (dotsCache.has(key)) return dotsCache.get(key);
    const step = isMobile ? 70 : 55;
    let result;
    try {
      const { ways, radius } = await tileStreets(lat, lon);
      result = { dots: sampleDots(ways, lat, lon, step, radius), radius };
    } catch (err) {
      console.warn("streets: tiles failed, trying Overpass", err.message);
      const radius = isMobile ? 3000 : 4000;
      result = { dots: sampleDots(await overpassStreets(lat, lon), lat, lon, step, radius), radius };
    }
    dotsCache.set(key, result);
    return result;
  }

  // ---- vector tiles --------------------------------------------------------------
  async function tileStreets(lat, lon) {
    if (!tileTemplate) {
      const res = await fetch(TILEJSON);
      if (!res.ok) throw new Error("tilejson " + res.status);
      tileTemplate = (await res.json()).tiles[0];
    }
    const z = 13, n = 1 << z;
    const px = (lon + 180) / 360 * n;
    const latR = lat * Math.PI / 180;
    const py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
    // Tiles shrink towards the poles (a zoom-13 tile is 4.9 km at the
    // equator, 2.4 km at 60 degrees), so the block grows with latitude:
    // 3x3 tiles on a desktop (5x5 beyond 45 degrees), 2x2 on a phone (3x3).
    const far = Math.cos(latR) < 0.71;
    const span = isMobile ? (far ? 3 : 2) : (far ? 5 : 3);
    const x0 = Math.floor(px - (span % 2 ? 0 : 0.5)) - (span - 1 >> 1), y0 = Math.floor(py - (span % 2 ? 0 : 0.5)) - (span - 1 >> 1);
    const tiles = [];
    for (let dy = 0; dy < span; dy++) for (let dx = 0; dx < span; dx++) tiles.push([x0 + dx, y0 + dy]);
    // Data ends at the block's edge: the distance from the city to the
    // nearest edge, in metres (the city sits somewhere inside its tile).
    const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
    const edge = Math.min(px - Math.min(...xs), Math.max(...xs) + 1 - px, py - Math.min(...ys), Math.max(...ys) + 1 - py);
    const tileMetres = 40075016.7 * Math.cos(latR) / n;
    const radius = edge * tileMetres;
    const ways = [];
    await Promise.all(tiles.map(async ([x, y]) => {
      if (y < 0 || y >= n) return;
      const url = tileTemplate.replace("{z}", z).replace("{x}", ((x % n) + n) % n).replace("{y}", y);
      const res = await fetch(url);
      if (res.status === 404 || res.status === 204) return; // empty tile (open sea)
      if (!res.ok) throw new Error("tile " + res.status);
      const buf = new Uint8Array(await res.arrayBuffer());
      for (const line of decodeRoads(buf)) {
        // Tile units -> lon/lat (web mercator), as Overpass-style geometry.
        const geometry = [];
        for (let i = 0; i < line.length; i += 2) {
          const tx = x + line[i] / 4096, ty = y + line[i + 1] / 4096;
          geometry.push({ lon: tx / n * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / n))) * 180 / Math.PI });
        }
        ways.push({ geometry });
      }
    }));
    return { ways, radius };
  }

  // Minimal Mapbox Vector Tile reader: the "transportation" layer's line
  // features whose class is a road. Returns arrays of [x, y, x, y, ...] in
  // tile units (extent 4096).
  function decodeRoads(buf) {
    let pos = 0;
    function varint() {
      let r = 0, s = 0, b;
      do { b = buf[pos++]; r += s < 28 ? (b & 0x7f) << s : (b & 0x7f) * Math.pow(2, s); s += 7; } while (b & 0x80);
      return r;
    }
    function skip(type) {
      if (type === 0) varint(); else if (type === 2) pos += varint(); else if (type === 5) pos += 4; else if (type === 1) pos += 8;
      else throw new Error("mvt wire type " + type);
    }
    const out = [];
    while (pos < buf.length) {
      const key = varint(), field = key >> 3, type = key & 7;
      if (field !== 3 || type !== 2) { skip(type); continue; }
      const layerLen = varint(), end = pos + layerLen;
      // Layer: name(1), features(2), keys(3), values(4), extent(5)
      let name = "";
      const features = [], keys = [], values = [];
      while (pos < end) {
        const k = varint(), f = k >> 3, t = k & 7;
        if (f === 1) { const l = varint(); name = utf8(buf, pos, l); pos += l; }
        else if (f === 2) { const l = varint(); features.push([pos, pos + l]); pos += l; }
        else if (f === 3) { const l = varint(); keys.push(utf8(buf, pos, l)); pos += l; }
        else if (f === 4) {
          const l = varint(), vend = pos + l;
          let v = null;
          while (pos < vend) { const vk = varint(), vf = vk >> 3, vt = vk & 7; if (vf === 1) { const sl = varint(); v = utf8(buf, pos, sl); pos += sl; } else { skip(vt); } }
          values.push(v);
        }
        else skip(t);
      }
      if (name !== "transportation") continue;
      const classIdx = keys.indexOf("class");
      for (const [fs, fe] of features) {
        pos = fs;
        let geomType = 0, isRoad = false, geom = null;
        while (pos < fe) {
          const k = varint(), f = k >> 3, t = k & 7;
          if (f === 2) {
            const tagsLen = varint(), tend = pos + tagsLen;
            while (pos < tend) { const ki = varint(), vi = varint(); if (ki === classIdx && ROAD_CLASSES.has(values[vi])) isRoad = true; }
          } else if (f === 3) geomType = varint();
          else if (f === 4) { const l = varint(); geom = [pos, pos + l]; pos += l; }
          else skip(t);
        }
        if (!isRoad || geomType !== 2 || !geom) continue;
        pos = geom[0];
        let cx = 0, cy = 0, line = null;
        while (pos < geom[1]) {
          const cmd = varint(), id = cmd & 7, count = cmd >> 3;
          if (id === 1 || id === 2) {
            for (let i = 0; i < count; i++) {
              const dx = varint(), dy = varint();
              cx += (dx >> 1) ^ -(dx & 1); cy += (dy >> 1) ^ -(dy & 1);
              if (id === 1) { line = [cx, cy]; out.push(line); } else if (line) line.push(cx, cy);
            }
          } else if (id === 7) { /* ClosePath: polygons only */ }
          else break;
        }
      }
      pos = end;
    }
    return out;
  }
  const decoder = new TextDecoder();
  function utf8(buf, start, len) { return decoder.decode(buf.subarray(start, start + len)); }

  // ---- Overpass fallback -----------------------------------------------------------
  const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  function bbox(lat, lon, metres) {
    const dLat = metres / 111320, dLon = metres / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    return [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(5)).join(",");
  }
  function streetQuery(lat, lon, wide, near) {
    return `[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${bbox(lat, lon, wide)});
  way["highway"~"^(tertiary|residential|unclassified|living_street|pedestrian)$"](${bbox(lat, lon, near)});
);
out skel geom qt;`;
  }
  async function overpassStreets(lat, lon) {
    const wide = isMobile ? 3000 : 4000, near = isMobile ? 1200 : 1600;
    const query = streetQuery(lat, lon, wide, near);
    let lastErr;
    for (const url of OVERPASS) {
      try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(query) });
        if (!res.ok) throw new Error("Overpass answered " + res.status);
        const data = await res.json();
        if (data.remark && !(data.elements && data.elements.length)) throw new Error("Overpass: " + data.remark);
        return data.elements || [];
      } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }

  // Walk every way, drop a dot every `step` metres, snap to a grid of the
  // same size so parallel dense streets do not pile up.
  function sampleDots(elements, lat0, lon0, step, radius) {
    const R = 6371000, DEG = Math.PI / 180;
    const kx = R * Math.cos(lat0 * DEG) * DEG, ky = R * DEG;
    const r2 = radius ? radius * radius : Infinity;
    const cells = new Set();
    const out = [];
    for (const el of elements) {
      const g = el.geometry;
      if (!g || g.length < 2) continue;
      let carry = 0;
      for (let i = 1; i < g.length; i++) {
        const ax = (g[i - 1].lon - lon0) * kx, ay = (g[i - 1].lat - lat0) * ky;
        const bx = (g[i].lon - lon0) * kx, by = (g[i].lat - lat0) * ky;
        const len = Math.hypot(bx - ax, by - ay);
        if (!len) continue;
        for (let d = carry; d <= len; d += step) {
          const t = d / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
          if (x * x + y * y > r2) continue;
          const cell = Math.round(x / step) + ":" + Math.round(y / step);
          if (cells.has(cell)) continue;
          cells.add(cell);
          out.push(x, y);
        }
        carry = (carry + Math.ceil((len - carry) / step) * step) - len;
        if (carry < 0 || carry > step) carry = 0;
      }
    }
    return new Float32Array(out);
  }

  async function goToCity(place) {
    const token = ++cityToken;
    inCity = true;
    panel.classList.add("is-city");
    backBtn.hidden = false;
    cityLabel.textContent = place.name;
    say("Flying to " + place.name + "…", true);
    await boot();
    if (!globe || token !== cityToken) return;
    globe.clearDots();
    const flight = globe.flyTo(place.lon, place.lat, globe.cityDistance);
    const dots = fetchStreetDots(place.lat, place.lon).catch((err) => { console.warn(err); return null; });
    await flight;
    if (token !== cityToken) return;
    say("Loading streets from OpenStreetMap…", true);
    const result = await dots;
    const pts = result && result.dots;
    if (token !== cityToken) return;
    if (pts && pts.length) {
      globe.setDots(place.lon, place.lat, pts, result.radius);
      say(place.name + ": " + (pts.length / 2).toLocaleString() + " dots along its streets. Data © OpenStreetMap contributors, tiles by OpenFreeMap.");
    } else {
      say("No street data came back for " + place.name + ". Drag to look around, or try another city.");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    say("Looking up " + q + "…", true);
    try {
      const place = await geocode(q);
      if (!place) { say("No city found for “" + q + "”. Try the city's name on its own."); return; }
      await goToCity(place);
    } catch (err) {
      console.warn(err);
      say("The city lookup failed (" + err.message + "). Please try again in a moment.");
    } finally {
      submit.disabled = false;
    }
  });

  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) { say("This browser has no location service."); return; }
    say("Asking the browser for your location…", true);
    locateBtn.disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      locateBtn.disabled = false;
      const { latitude, longitude } = pos.coords;
      // The coordinates go to the renderer and the Overpass query only.
      goToCity({ name: "Your location", lat: latitude, lon: longitude });
    }, (err) => {
      locateBtn.disabled = false;
      say(err.code === 1 ? "Location permission was declined. Type a city instead." : "Your location could not be found (" + err.message + ").");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });

  backBtn.addEventListener("click", async () => {
    cityToken++;
    inCity = false;
    panel.classList.remove("is-city");
    backBtn.hidden = true;
    cityLabel.textContent = "";
    if (!globe) return;
    say("");
    await globe.flyTo(globe.state.lon / (Math.PI / 180) - globe.state.rotation / (Math.PI / 180), 20, globe.homeDistance);
    globe.clearDots();
  });

  // Keyboard users: the canvas is focusable; arrows turn, +/- zoom.
  canvas.addEventListener("focus", () => { if (!globe) boot(); });
})();
