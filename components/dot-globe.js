/*
 * Dot globe: the homepage hero's globe. Thousands of small dots mark the
 * land. Written for this site (WebGL 1, no library, no images and no network
 * requests). Settings: components/dot-globe.config.js.
 *
 *   <div class="dot-globe" data-dot-globe></div>   (inside .hero__stage)
 *
 * The land outline is a 256 x 128 bit mask (1 = land, equirectangular, west
 * to east from 180W, north to south) decoded from the world map embedded in
 * cobe 2.0.1 (MIT, vendor/cobe-2.0.1.js; "World map blank without borders",
 * Wikimedia Commons). It is stored below as base64, so nothing is fetched.
 *
 * The globe's layer covers the whole hero (dot-globe.css), so the globe is
 * never cut off by its stage: it fades out softly at its rim and at the
 * hero's edges, and wherever it passes under the headline, the subheading
 * or the buttons its dots dim to textDim (a soft-edged area around each line
 * of text), so the text stays readable with no shadow or box behind it.
 *
 * Motion: a slow spin; drag to turn it (on touch screens sideways only, so a
 * vertical swipe still scrolls the page); arrow keys turn it too. The spin
 * comes back 2.5s after the last touch. It never zooms and never takes the
 * mouse wheel, trackpad or a pinch: those always reach the page. Reduced
 * motion: no spin. Off screen or in a hidden tab nothing is drawn. Without
 * WebGL a still picture is drawn instead.
 *
 * window.CA_DOT_GLOBE.instances[0].set({...}) changes settings live (the
 * design panel uses it; keys that aren't in the config are ignored); .get()
 * returns them; .fps is the frame rate.
 */
(function () {
  "use strict";
  var DEFAULTS = window.CA_DOT_GLOBE_DEFAULTS || {};
  var MASK_W = 256, MASK_H = 128;
  var MASK_B64 = "////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Dj///////6n////////////////////////////////8AAACAAAAgP8AP////////////////////////////8AAAP/gAAAAAAA+gf//////////////////////////wAAAfQAAAAAAAADg////////////////////g//////AAAAQAAAAGYAAAf8H//////////////////4AJ////8AAAAAAAAD4AAP//4AAfn/////////x/////4AB////wAAAAAAAAcAAL///gKAef////////+H/////8zD///+AAAAAAAAHAHH/////8A/AAO//P/+AAM//////+H///wAAAAAIAAcA//////////uAA/gP//z/5//////4f//+AAAAB/8AAB73//////////9/+D////////////w///gAAAAf//mf//f////////////+H////////////D//gAAAAD///f////////////////5////////////4P/4A/AAA/3+P////////////////CAf///////+8T/Af8AD8AAH+f/////////////////4AP////////ghTwA/gAAAAB/n//////////////////wA////////8APwAB8AAAAAP+f///////////////z/gAB/sX/////gA/mAAwAAAAA/4///////////////8OAAABeAD/////AD/8AAAAAAMBPB/////////////+ABwAAABkAH/////gH/wAAAAAAwDcf/////////////gAfAAAAQAAH/////wf/gAAAAADgPB/////////////4AB4AAAAAAAH/////3//wAAAAB3A///////////////8AHAAAAAAAAP/////P//gAAAAHeP///////////////8AYAAAAAAAAf///////8AAAAAB7////////////////wBAAAAAAAAA///////+YAAAAABf///////////////9gAAAAAAAAAB////v//DwAAAAAf/////5//////////0AAAAAAAAAAD///+P/8HAAAAAA/////+B/////////+QAAAAAAAAAAP////v/+AAAAAAB///9nwHf////////wAAAAAAAAAAB////2/9gAAAAAAH/v/ifj9////////+OAAAAAAAAAAH//////AAAAAAAP8nP8AfH/////////w4AAAAAAAAAAf/////8AAAAAAB/wnP3x+P////////4AAAAAAAAAAAA//////AAAAAAAH+CG7//4/////////AYAAAAAAAAAAD/////4AAAAAAAfwARn//j///////wYBgAAAAAAAAAAH/////AAAAAAAA+AmGf//P///////4wMAAAAAAAAAAAP////8AAAAAAAAj/AAF//////////DHwAAAAAAAAAAA/////gAAAAAAAH/8AAH/////////4J8AAAAAAAAAAAA////8AAAAAAAA//8GAf/////////wOAAAAAAAAAAAAB////AAAAAAAAH//8/L//////////gQAAAAAAAAAAAAG//+8AAAAAAAAf//////////////+AAAAAAAAAAAAAAP/8AYAAAAAAAD//////+////////4AAAAAAAAAAAAAAX/gBgAAAAAAA/////9/5////////AAAAAAAAAAAAAAAv+ACAAAAAAAD/////7/wf//////4AAAAAAAAAAAAAADf4AAAAAAAAAf/////v/uB//////IAAAAAAAAAAAAAAE/gBgAAAAAAD//////f/8B/////5gAAAAAAAAAAAAAAB+ADwAAAAAAP/////8//wH//f/+AAAAAAAAAAAAAAAAH4MBgAAAAAA//////7//AH/w/8gAAAAAAAAAAAAAAAAfxwA4AAAAAD//////n/4AP+B/mAAAAAAAAAAAAAAAAAf+ABAAAAAAP//////P/AA/gH/AGAAAAAAAAAAAAAAAAP4AAAAAAAA//////8/wAD8AX+AYAAAAAAAAAAAAAAAAD+AAAAAAAD//////78AAPgAf8BgAAAAAAAAAAAAAAAAD4AAAAAAAP///////AAAeAA/wDAAAAAAAAAAAAAAAAADgAAAAAAA///////gAAB4ACfADAAAAAAAAAAAAAAAAAGD+wAAAAB///////+AADgAI4AQAAAAAAAAAAAAAAAAAP//gAAAAD///////wAANAAhABQAAAAAAAAAAAAAAAAAb//AAAAAH///////AAAMADAAHAAAAAAAAAAAAAAAAAAH//AAAAAP//////4AAAwAGAMMAAAAAAAAAAAAAAAAAAf//gAAAAOw/////gAAAADcB4AAAAAAAAAAAAAAAAAAB///AAAAAAAf///8AAAAAOwPAAAAAAAAAAAAAAAAAAAP//8AAAAAAB////gAAAAAfB8AAAAAAAAAAAAAAAAAAB///4AAAAAAP///4AAAAAA8fzoAAAAAAAAAAAAAAAAAP///4AAAAAA//+/AAAAAABx/MGAAAAAAAAAAAAAAAAA////4AAAAAD//78AAAAAADz7gNgAAAAAAAAAAAAAAAB////+AAAAAH///gAAAAAAPHuO/4AAAAAAAAAAAAAAAP////8AAAAAP//8AAAAAAAYAcA/wAAAAAAAAAAAAAAAf////4AAAAAf//wAAAAAAAcAAA/sAAAAAAAAAAAAAAB/////gAAAAB///AAAAAAAA+AAD+AAAAAAAAAAAAAAAD////+AAAAAH//8AAAAAAAAADADMAAAAAAAAAAAAAAAP////wAAAAAP//4AAAAAAAAAAAAYAAAAAAAAAAAAAAAf///+AAAAAA///gAAAAAAAAAA4QAAAAAAAAAAAAAAAA////4AAAAAH//+DAAAAAAAAAPjAAAAAAAAAAAAAAAAD////gAAAAA///4cAAAAAAAAH+GAAAAAAAAAAAAAAAAH///8AAAAAD///jwAAAAAAAA/88AAAAAAAAAAAAAAAAH///wAAAAAP//4fAAAAAAAAH//wAAAgAAAAAAAAAAAAP///AAAAAAf//B4AAAAAAAA///gAAAAAAAAAAAAAAAA///4AAAAAB//4HgAAAAAAAf///AAAAAAAAAAAAAAAAD///gAAAAAD//gcAAAAAAAD///+AEAAAAAAAAAAAAAAP//8AAAAAAP//BwAAAAAAAf///8AAAAAAAAAAAAAAAA//+AAAAAAA//4HAAAAAAAB////wAAAAAAAAAAAAAAAH//wAAAAAAD//AAAAAAAAAH////gAAAAAAAAAAAAAAAf//AAAAAAAH/4AAAAAAAAAf///+AAAAAAAAAAAAAAAB//4AAAAAAAf/gAAAAAAAAB////4AAAAAAAAAAAAAAAH//AAAAAAAA/8AAAAAAAAAD////gAAAAAAAAAAAAAAAf/4AAAAAAAB/gAAAAAAAAAP///+AAAAAAAAAAAAAAAB//gAAAAAAAH8AAAAAAAAAA/gf/wAAAAAAAAAAAAAAAP/8AAAAAAAAdAAAAAAAAAADgAv/AAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAf4AAQAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAB/gAAgAAAAAAAAAAAAP/AAAAAAAAAAAAAAAAAAAAAAAB4AADgAAAAAAAAAAAB/wAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAHAADAAAAAAAAAAAAAfwAAAAAAAAAAAAAAAAAAAAAAAAYAAcAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAg/gGB8AAAAAAAAAAAAAAAAAAfgAAAAAAAAAAAAfwAD///////8AAAAAAAAAAAAAAAAB/AAAAAAAAAAAA///8f////////4AAAAAAAAAAAAAAD/4AAAAAAAAPAf///////////////AAAAAAAAAAAAAAP/gAAAAA/////////////////////8AAAAAAAAAD/4D//AAAAA//////////////////////8AAAAABv/3P////4AAAAP//////////////////////wAAAA//////////4AAAH//////////////////////wAAAB///////////+AAH//////////////////////+AMA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==";
  var DEG = Math.PI / 180;
  var IDLE_RESUME_MS = 2500;
  var MAX_DPR = 2;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var maskBits = null;
  function landAt(lat, lon) {
    if (!maskBits) {
      var s = atob(MASK_B64);
      maskBits = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) maskBits[i] = s.charCodeAt(i);
    }
    if (lat > 78) return false; // the mask's top rows are solid: no real land there
    var x = Math.floor((lon + 180) / 360 * MASK_W) % MASK_W;
    var y = Math.min(MASK_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * MASK_H)));
    if (x < 0) x += MASK_W;
    var idx = y * MASK_W + x;
    return (maskBits[idx >> 3] >> (7 - (idx & 7))) & 1;
  }

  // Evenly spread points on the sphere (Fibonacci), kept where there is land.
  // x east, y north, z towards latitude 0, longitude 0.
  function landDots(n) {
    var out = [], golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * golden;
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (landAt(Math.asin(y) / DEG, Math.atan2(x, z) / DEG)) out.push(x, y, z);
    }
    return new Float32Array(out);
  }

  function rgb(hex) {
    var h = String(hex || "#888").trim().replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0.5, 0.5, 0.5];
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function isDark() {
    var g = rgb(getComputedStyle(document.documentElement).getPropertyValue("--ground"));
    return 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2] < 0.5;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // A custom property's raw value ("2.5rem", "16px") in px.
  function lengthPx(v, fallback) {
    var n = parseFloat(v);
    if (isNaN(n)) return fallback;
    if (/rem\s*$/.test(v)) n *= parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return n;
  }

  // Rotation: turn about the vertical axis to face longitude `lon`, then tip
  // the north pole towards the reader by `tilt` (both degrees). Column-major.
  function rotation(lon, tilt) {
    var a = lon * DEG, t = tilt * DEG, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(t), st = Math.sin(t);
    return [ca, -sa * st, sa * ct,  0, ct, st,  -sa, -ca * st, ca * ct];
  }
  function apply3(m, x, y, z) {
    return [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
  }

  // Text areas the dots dim under: centre and half size in device px, GL
  // y (from the bottom). Unused slots sit far off screen.
  var RECTS = 16;
  // Per dot: the rim fade (0 at the sphere's edge, full a little inside it)
  // and the dimming under text, worked out once per dot in the vertex shader.
  var VS =
    "attribute vec3 aPos;uniform mat3 uRot;uniform vec2 uCenter;uniform vec2 uScale;uniform float uSize;" +
    "uniform vec2 uRes;uniform vec4 uRect[" + RECTS + "];uniform float uDim;uniform float uFeather;varying float vA;" +
    "void main(){vec3 r=uRot*aPos;vec2 p=uCenter+r.xy*uScale;gl_Position=vec4(p,0.0,1.0);gl_PointSize=uSize;" +
    "vec2 f=(p*0.5+0.5)*uRes;float t=0.0;" +
    "for(int i=0;i<" + RECTS + ";i++){vec2 q=max(abs(f-uRect[i].xy)-uRect[i].zw,0.0);t=max(t,1.0-smoothstep(0.0,uFeather,length(q)));}" +
    "vA=r.z<0.0?-1.0:smoothstep(0.0,0.5,r.z)*mix(1.0,uDim,t);}";
  var FS =
    "precision mediump float;uniform vec4 uColor;varying float vA;" +
    "void main(){if(vA<0.0)discard;vec2 c=gl_PointCoord-0.5;float d=dot(c,c);if(d>0.25)discard;" +
    "float a=uColor.a*vA*(1.0-smoothstep(0.16,0.25,d));gl_FragColor=vec4(uColor.rgb*a,a);}";
  // The same dimming for the no-WebGL picture (CSS px, y down).
  function dimAt(rects, x, y, dim, feather) {
    var t = 0;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i], qx = Math.max(0, Math.abs(x - r[0]) - r[2]), qy = Math.max(0, Math.abs(y - r[1]) - r[3]);
      var e = Math.min(1, Math.sqrt(qx * qx + qy * qy) / feather), s = e * e * (3 - 2 * e);
      t = Math.max(t, 1 - s);
    }
    return 1 + (dim - 1) * t;
  }
  function smooth(e) { e = Math.max(0, Math.min(1, e)); return e * e * (3 - 2 * e); }

  function shader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u, aPos: gl.getAttribLocation(p, "aPos") };
  }

  function Globe(el) {
    var self = this;
    this.el = el;
    this.opts = clone(DEFAULTS);
    this.fps = 0;
    this.lon = this.opts.startLon;
    this.tilt = this.opts.tilt;
    this.vel = 0;           // drag momentum, degrees a frame
    this.lastInput = -1e9;  // ms
    this.visible = true;

    el.innerHTML = "";
    this.canvas = el.appendChild(document.createElement("canvas"));
    this.canvas.className = "dot-globe__canvas";
    // The canvas covers the hero but ignores the pointer; this circle over
    // the globe takes the drags and the keys, so the rest of the hero
    // scrolls and clicks as usual.
    var grab = this.grab = el.appendChild(document.createElement("div"));
    grab.className = "dot-globe__grab";
    grab.setAttribute("tabindex", "0");
    grab.setAttribute("role", "img");
    grab.setAttribute("aria-label", "A slowly turning globe of dots marking the land. Drag it, or use the arrow keys, to turn it.");
    this.rects = [];

    var gl = null;
    try {
      gl = this.canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true }) ||
           this.canvas.getContext("experimental-webgl");
      if (gl) this.prog = program(gl);
    } catch (e) { gl = null; }
    this.gl = gl;
    if (gl) this.buf = gl.createBuffer();
    else {
      el.classList.add("dot-globe--still");
      this.ctx2d = this.canvas.getContext("2d");
    }

    this.bindInput();
    this.resize(); // lays out, which builds the dots for this size
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { self.resize(); });
      ro.observe(el);
      // The text it dims under moves when the headline or the buttons change.
      var hero = el.closest(".hero");
      if (hero) Array.prototype.forEach.call(hero.querySelectorAll(".hero__title, .hero__foot"), function (t) { ro.observe(t); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.resize(); });
    // The window too: crossing a breakpoint changes which screen size's
    // settings apply even when the stage itself keeps its size.
    window.addEventListener("resize", function () { self.resize(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; self.wake(); }).observe(el);
    }
    document.addEventListener("visibilitychange", function () { self.wake(); });
    new MutationObserver(function () { self.themeChanged(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { self.themeChanged(); });
    reduced.addEventListener("change", function () { self.wake(); });
    this.themeChanged();
  }

  Globe.prototype.get = function () { return clone(this.opts); };

  // Only keys the config has are taken (older saved settings may hold others).
  Globe.prototype.set = function (partial) {
    var o = this.opts, rebuild = false;
    Object.keys(partial || {}).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, k)) return;
      if (k === "dots" || k === "dotsPhone") rebuild = true;
      o[k] = clone(partial[k]);
    });
    if ("startLon" in partial) this.lon = o.startLon;
    if ("tilt" in partial) this.tilt = o.tilt;
    if (rebuild) this.builtDots = 0; // layout() rebuilds for the new count
    this.layout();
    this.themeChanged();
  };

  Globe.prototype.phone = function () { return window.innerWidth < 600; };
  // Screen size, by window width: the hero's own breakpoints (styles.css).
  function device() { var w = window.innerWidth; return w >= 1100 ? "desktop" : w >= 600 ? "tablet" : "phone"; }
  Globe.prototype.device = device;
  var DEVICE_DEFAULT = { visible: true, size: 50, maxSize: 860, x: "center", offsetX: 0, y: "middle", offsetY: 0, layer: "behind" };
  Globe.prototype.place = function () {
    var all = this.opts.devices || {}, d = device();
    return Object.assign({}, DEVICE_DEFAULT, (DEFAULTS.devices || {})[d], all[d]);
  };

  // Sample points for a globe `d` px across: the desktop count (dots) at
  // the desktop size (720px), scaled by area, so the dots sit as far apart
  // on a phone as on desktop (a fixed count on a small globe packed them
  // into a solid disc). Phones never draw more than dotsPhone.
  var REF_D = 720;
  Globe.prototype.dotCount = function (d) {
    var o = this.opts, n = Math.round((+o.dots || 40000) * Math.pow(d / REF_D, 2));
    if (this.phone()) n = Math.min(n, +o.dotsPhone || 15000);
    return Math.max(800, Math.min(60000, n));
  };
  Globe.prototype.rebuild = function () {
    var o = this.opts, n = this.wantDots || Math.max(500, Math.min(60000, this.phone() ? o.dotsPhone : o.dots));
    this.dots = landDots(n);
    this.builtDots = n;
    this.builtForPhone = this.phone();
    if (this.gl) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.dots, this.gl.STATIC_DRAW);
    }
  };

  Globe.prototype.resize = function () {
    var r = this.el.getBoundingClientRect();
    var dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.layout();
    this.wake();
  };

  // Where the globe sits, in CSS px of its layer (which covers the hero):
  // centre and radius, from this screen size's settings (opts.devices),
  // placed in an area: the hero under the menu bar, or on tablet and phone,
  // beside, the stage's own row. The hero gets data-globe-layer ("behind" |
  // "beside") and data-globe="off" when it is hidden (dot-globe.css); beside
  // on tablet and phone, the stage's row is as tall as the globe needs. The
  // globe may reach past its area: it is only cut where the hero ends, and
  // fades out there.
  Globe.prototype.layout = function () {
    var p = this.place(), dev = device(), w = this.w, h = this.h;
    var stage = this.el.parentNode, hero = this.el.closest(".hero");
    var beside = p.layer === "beside", narrowBeside = dev !== "desktop" && beside;
    var heroW = hero ? hero.clientWidth : w;
    var cs = hero ? getComputedStyle(hero) : null;
    var top = cs ? lengthPx(cs.getPropertyValue("--site-header-h"), 0) : 0;
    var d = (+p.size || 50) / 100 * heroW;
    if (+p.maxSize > 0) d = Math.min(d, +p.maxSize);
    if (dev === "desktop") {
      d = Math.min(d, h - top);
      if (beside && p.x !== "center") d = Math.min(d, w * 0.46);
    }
    d = Math.max(60, d);
    // Rebuild the dots when the size calls for a clearly different count.
    var want = this.dotCount(d);
    if (!this.builtDots || Math.abs(want - this.builtDots) / this.builtDots > 0.08 || (this.builtForPhone !== this.phone() && want !== this.builtDots)) {
      this.wantDots = want; this.rebuild();
    }
    var R = d / 2, m = cs ? lengthPx(cs.getPropertyValue("--pad"), 16) : 16;
    if (hero) {
      hero.setAttribute("data-globe-layer", beside ? "beside" : "behind");
      if (p.visible === false) hero.setAttribute("data-globe", "off");
      else if (hero.hasAttribute("data-globe")) {
        // Shown again: measure the stage once it is back in the layout.
        hero.removeAttribute("data-globe");
        var self = this;
        setTimeout(function () { self.resize(); }, 0);
      }
    }
    // Beside, the row is as tall as the globe needs; a globe moved up into
    // the headline gives back that much of its row, so no gap opens below.
    if (stage && stage.style) stage.style.minHeight = narrowBeside ? Math.max(0, Math.ceil(d / 0.85 + Math.min(0, +p.offsetY || 0))) + "px" : "";
    var area = { x: 0, y: top, w: w, h: Math.max(1, h - top) };
    if (narrowBeside && stage && stage.getBoundingClientRect) {
      var er = this.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      area = { x: sr.left - er.left, y: sr.top - er.top, w: sr.width, h: Math.max(1, sr.height) };
    }
    var cx = p.x === "left" ? m + R : p.x === "right" ? area.w - m - R : area.w / 2;
    var cy = p.y === "top" ? m + R : p.y === "bottom" ? area.h - m - R : area.h / 2;
    this.cx = area.x + cx + (+p.offsetX || 0);
    this.cy = area.y + cy + (+p.offsetY || 0);
    this.radius = R;
    var g = this.grab.style;
    g.width = g.height = d + "px";
    g.transform = "translate(" + (this.cx - R) + "px," + (this.cy - R) + "px)";
    this.el.setAttribute("data-layer", beside ? "beside" : "behind");
    this.measureText();
    this.wake();
  };

  // The text the dots dim under: each line of the headline and the
  // subheading, and each button, in CSS px of the layer (centre, half size).
  Globe.prototype.measureText = function () {
    var hero = this.el.closest(".hero"), out = [], er = this.el.getBoundingClientRect();
    function addRect(r) {
      if (r.width < 1 || r.height < 1 || out.length >= RECTS) return;
      out.push([r.left - er.left + r.width / 2, r.top - er.top + r.height / 2, r.width / 2, r.height / 2]);
    }
    function lines(node) {
      if (!node || !document.createRange) return;
      var range = document.createRange(), rows = [];
      range.selectNodeContents(node);
      Array.prototype.forEach.call(range.getClientRects(), function (r) {
        if (r.width < 1) return;
        // Merge the pieces of each line into one box.
        var row = rows.filter(function (x) { return Math.abs(x.top - r.top) < r.height / 2; })[0];
        if (!row) rows.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        else { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); row.top = Math.min(row.top, r.top); row.bottom = Math.max(row.bottom, r.bottom); }
      });
      rows.forEach(function (x) { addRect({ left: x.left, top: x.top, width: x.right - x.left, height: x.bottom - x.top }); });
    }
    if (hero) {
      lines(hero.querySelector(".hero__title"));
      lines(hero.querySelector(".hero__text"));
      Array.prototype.forEach.call(hero.querySelectorAll(".hero__actions .button"), function (b) { addRect(b.getBoundingClientRect()); });
    }
    this.rects = out;
    var dpr = this.dpr || 1, h = this.h, a = new Float32Array(RECTS * 4);
    for (var i = 0; i < RECTS; i++) {
      var r = out[i];
      if (r) { a[i * 4] = r[0] * dpr; a[i * 4 + 1] = (h - r[1]) * dpr; a[i * 4 + 2] = r[2] * dpr; a[i * 4 + 3] = r[3] * dpr; }
      else { a[i * 4] = -1e5; a[i * 4 + 1] = -1e5; }
    }
    this.rectData = a;
  };

  Globe.prototype.themeChanged = function () {
    var dark = isDark(), o = this.opts, key = dark ? "dark" : "light";
    this.dotRgb = rgb(o.dotColor && o.dotColor[key]);
    this.dotAlpha = Math.max(0, Math.min(1, +(o.dotOpacity && o.dotOpacity[key]) || 0.8));
    this.wake();
  };

  Globe.prototype.touch = function () { this.lastInput = performance.now(); this.wake(); };

  // Still drawing every frame? (The no-WebGL picture only moves when dragged.)
  Globe.prototype.animating = function () {
    if (!this.gl) return !!this.dragging;
    return (this.opts.autoRotate && !reduced.matches) || Math.abs(this.vel) > 0.01 || !!this.dragging;
  };

  Globe.prototype.wake = function () {
    var self = this;
    if (this.raf || document.hidden || !this.visible) return;
    this.raf = requestAnimationFrame(function (t) { self.raf = 0; self.frame(t); });
  };

  Globe.prototype.frame = function (now) {
    var o = this.opts, dt = this.prev ? Math.min(0.1, (now - this.prev) / 1000) : 0;
    this.prev = now;
    // Frame rate, averaged over each second.
    this.fpsCount = (this.fpsCount || 0) + 1;
    if (!this.fpsStart) this.fpsStart = now;
    if (now - this.fpsStart >= 1000) { this.fps = Math.round(this.fpsCount * 1000 / (now - this.fpsStart)); this.fpsCount = 0; this.fpsStart = now; }

    var idle = now - this.lastInput > IDLE_RESUME_MS && !this.dragging;
    if (!this.dragging) {
      this.lon += this.vel;
      this.vel *= Math.pow(0.04, dt);
      if (Math.abs(this.vel) < 0.01) this.vel = 0;
    }
    if (idle && o.autoRotate && !reduced.matches && this.gl) {
      this.spinEase = Math.min(1, (this.spinEase || 0) + dt / 1.2);
      this.lon += (o.direction < 0 ? -1 : 1) * o.speed * dt * this.spinEase;
    } else if (!idle) this.spinEase = 0;

    this.draw();
    if (this.animating() || !idle) this.wake();
    else { this.prev = 0; this.fps = 0; this.fpsStart = 0; this.fpsCount = 0; }
  };

  Globe.prototype.draw = function () {
    var R = this.radius, m = rotation(this.lon, this.tilt);
    if (this.gl) this.drawGL(m, R); else this.draw2D(m, R);
  };

  Globe.prototype.drawGL = function (m, R) {
    var gl = this.gl, p = this.prog;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(p.p);
    gl.uniformMatrix3fv(p.u.uRot, false, m);
    gl.uniform2f(p.u.uCenter, (this.cx / this.w) * 2 - 1, 1 - (this.cy / this.h) * 2);
    gl.uniform2f(p.u.uScale, R / (this.w / 2), R / (this.h / 2));
    gl.uniform1f(p.u.uSize, Math.max(1, this.opts.dotSize * this.dpr));
    gl.uniform4f(p.u.uColor, this.dotRgb[0], this.dotRgb[1], this.dotRgb[2], this.dotAlpha);
    gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height);
    if (this.rectData) gl.uniform4fv(p.u["uRect[0]"] || gl.getUniformLocation(p.p, "uRect"), this.rectData);
    gl.uniform1f(p.u.uDim, this.textDim());
    gl.uniform1f(p.u.uFeather, FEATHER * this.dpr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(p.aPos);
    gl.vertexAttribPointer(p.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.dots.length / 3);
  };

  // How strongly dots show under text (0 = not at all, 1 = no dimming).
  var FEATHER = 28; // CSS px: the soft edge around each text area
  Globe.prototype.textDim = function () {
    var v = +this.opts.textDim;
    return isNaN(v) ? 0.2 : Math.max(0, Math.min(1, v));
  };

  // No WebGL: a still picture of the same globe on a 2D canvas.
  Globe.prototype.draw2D = function (m, R) {
    var c = this.ctx2d, dpr = this.dpr, d = this.dots;
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    var col = this.dotRgb.map(function (v) { return Math.round(v * 255); }).join(",");
    var s = Math.max(1, this.opts.dotSize), dim = this.textDim(), rects = this.rects || [];
    for (var i = 0; i < d.length; i += 3) {
      var p = apply3(m, d[i], d[i + 1], d[i + 2]);
      if (p[2] <= 0) continue;
      var x = this.cx + p[0] * R, y = this.cy - p[1] * R;
      c.fillStyle = "rgba(" + col + "," + (this.dotAlpha * smooth(p[2] / 0.5) * dimAt(rects, x, y, dim, FEATHER)) + ")";
      c.fillRect(x - s / 2, y - s / 2, s, s);
    }
  };

  // Drag to turn, on the circle over the globe (.dot-globe__grab). One
  // pointer only; no wheel, trackpad or pinch handling, so those always
  // scroll or zoom the page as usual.
  Globe.prototype.bindInput = function () {
    var self = this, el = this.el, grab = this.grab, active = null, last = null;
    grab.addEventListener("pointerdown", function (e) {
      if (active !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      active = e.pointerId;
      try { grab.setPointerCapture(e.pointerId); } catch (err) {}
      self.dragging = true; self.vel = 0; last = { x: e.clientX, y: e.clientY };
      el.classList.add("is-dragging");
      self.touch();
    });
    grab.addEventListener("pointermove", function (e) {
      if (e.pointerId !== active) return;
      var R = Math.max(40, self.radius), dx = e.clientX - last.x, dy = e.clientY - last.y;
      var dLon = -dx / R / DEG * 0.9;
      self.lon += dLon; self.vel = dLon * 0.5;
      // Touch turns sideways only: vertical swipes belong to the page.
      if (e.pointerType !== "touch") self.tilt = Math.max(-60, Math.min(75, self.tilt + dy / R / DEG * 0.9));
      last = { x: e.clientX, y: e.clientY };
      self.touch();
    });
    function up(e) {
      if (e.pointerId !== active) return;
      active = null; last = null; self.dragging = false;
      el.classList.remove("is-dragging");
      self.touch();
    }
    grab.addEventListener("pointerup", up);
    grab.addEventListener("pointercancel", up);

    grab.addEventListener("keydown", function (e) {
      var k = e.key, step = 6;
      if (k === "ArrowLeft") self.lon -= step;
      else if (k === "ArrowRight") self.lon += step;
      else if (k === "ArrowUp") self.tilt = Math.min(75, self.tilt + step);
      else if (k === "ArrowDown") self.tilt = Math.max(-60, self.tilt - step);
      else return;
      e.preventDefault();
      self.touch();
    });
  };

  var api = window.CA_DOT_GLOBE = window.CA_DOT_GLOBE || { instances: [] };
  api.defaults = DEFAULTS;
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-dot-globe]"), function (el) {
      if (el.__dotGlobe) return;
      el.__dotGlobe = new Globe(el);
      api.instances.push(el.__dotGlobe);
    });
    document.dispatchEvent(new CustomEvent("dot-globe:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
