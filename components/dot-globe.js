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

  // Rotation: turn about the vertical axis to face longitude `lon`, then tip
  // the north pole towards the reader by `tilt` (both degrees). Column-major.
  function rotation(lon, tilt) {
    var a = lon * DEG, t = tilt * DEG, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(t), st = Math.sin(t);
    return [ca, -sa * st, sa * ct,  0, ct, st,  -sa, -ca * st, ca * ct];
  }
  function apply3(m, x, y, z) {
    return [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
  }

  var VS =
    "attribute vec3 aPos;uniform mat3 uRot;uniform vec2 uCenter;uniform vec2 uScale;uniform float uSize;varying float vZ;" +
    "void main(){vec3 r=uRot*aPos;gl_Position=vec4(uCenter+r.xy*uScale,0.0,1.0);gl_PointSize=uSize;vZ=r.z;}";
  var FS =
    "precision mediump float;uniform vec4 uColor;varying float vZ;" +
    "void main(){if(vZ<0.0)discard;vec2 c=gl_PointCoord-0.5;float d=dot(c,c);if(d>0.25)discard;" +
    "float a=uColor.a*(0.3+0.7*smoothstep(0.0,0.45,vZ))*(1.0-smoothstep(0.16,0.25,d));gl_FragColor=vec4(uColor.rgb*a,a);}";

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
    this.glow = el.appendChild(document.createElement("div"));
    this.glow.className = "dot-globe__glow";
    this.canvas = el.appendChild(document.createElement("canvas"));
    this.canvas.className = "dot-globe__canvas";
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "A slowly turning globe of dots marking the land. Drag it, or use the arrow keys, to turn it.");

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

    this.rebuild();
    this.bindInput();
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(el);
    else window.addEventListener("resize", function () { self.resize(); });
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
    if (rebuild) this.rebuild();
    this.layout();
    this.themeChanged();
  };

  Globe.prototype.phone = function () { return window.innerWidth < 600; };

  Globe.prototype.rebuild = function () {
    var o = this.opts;
    this.dots = landDots(Math.max(500, Math.min(60000, this.phone() ? o.dotsPhone : o.dots)));
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
    if (this.builtForPhone !== this.phone()) this.rebuild();
    this.layout();
    this.wake();
  };

  // Where the globe sits in its stage, in CSS px: centre and radius.
  Globe.prototype.layout = function () {
    var o = this.opts, w = this.w, h = this.h, wide = window.innerWidth >= 1100;
    var d = Math.max(60, o.size * Math.min(h, w * 0.98));
    var cx = w / 2;
    if (wide) {
      var share = { left: 0.3, center: 0.5, right: 0.7 }[o.placement] || 0.5;
      if (o.layer === "beside" && o.placement !== "center") {
        share = o.placement === "left" ? 0.25 : 0.75;
        d = Math.min(d, w * 0.46);
      }
      cx = w * share;
    }
    // Offsets are desktop only: on smaller screens they would push the
    // globe out of its row.
    this.cx = cx + (wide ? (+o.offsetX || 0) : 0);
    this.cy = h / 2 + (wide ? (+o.offsetY || 0) : 0);
    this.radius = d / 2;
    this.el.setAttribute("data-layer", o.layer === "beside" ? "beside" : "behind");
    this.wake();
  };

  Globe.prototype.themeChanged = function () {
    var dark = isDark(), o = this.opts, key = dark ? "dark" : "light";
    this.dotRgb = rgb(o.dotColor && o.dotColor[key]);
    this.dotAlpha = Math.max(0, Math.min(1, +(o.dotOpacity && o.dotOpacity[key]) || 0.8));
    this.el.style.setProperty("--dot-globe-glow", dark ? "255,255,255" : "0,0,0");
    this.el.style.setProperty("--dot-globe-glow-a", dark ? "0.22" : "0.09");
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
    var o = this.opts, R = this.radius, m = rotation(this.lon, this.tilt);
    // Glow ring just outside the sphere.
    var g = this.glow.style;
    g.display = o.glow ? "" : "none";
    if (o.glow) {
      var gs = R * 2.5;
      g.width = g.height = gs + "px";
      g.transform = "translate(" + (this.cx - gs / 2) + "px," + (this.cy - gs / 2) + "px)";
      g.opacity = Math.max(0, Math.min(1, o.glowStrength));
    }
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(p.aPos);
    gl.vertexAttribPointer(p.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.dots.length / 3);
  };

  // No WebGL: a still picture of the same globe on a 2D canvas.
  Globe.prototype.draw2D = function (m, R) {
    var c = this.ctx2d, dpr = this.dpr, d = this.dots;
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    var col = this.dotRgb.map(function (v) { return Math.round(v * 255); }).join(",");
    var s = Math.max(1, this.opts.dotSize);
    for (var i = 0; i < d.length; i += 3) {
      var p = apply3(m, d[i], d[i + 1], d[i + 2]);
      if (p[2] <= 0) continue;
      c.fillStyle = "rgba(" + col + "," + (this.dotAlpha * (0.3 + 0.7 * Math.min(1, p[2] / 0.45))) + ")";
      c.fillRect(this.cx + p[0] * R - s / 2, this.cy - p[1] * R - s / 2, s, s);
    }
  };

  Globe.prototype.overGlobe = function (e) {
    var r = this.el.getBoundingClientRect(), x = e.clientX - r.left - this.cx, y = e.clientY - r.top - this.cy;
    return Math.sqrt(x * x + y * y) <= this.radius * 1.08;
  };

  // Drag to turn. One pointer only; no wheel, trackpad or pinch handling, so
  // those always scroll or zoom the page as usual.
  Globe.prototype.bindInput = function () {
    var self = this, el = this.el, canvas = this.canvas, active = null, last = null;
    canvas.addEventListener("pointerdown", function (e) {
      if (active !== null || (e.pointerType === "mouse" && (e.button !== 0 || !self.overGlobe(e)))) return;
      active = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      self.dragging = true; self.vel = 0; last = { x: e.clientX, y: e.clientY };
      el.classList.add("is-dragging");
      self.touch();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (e.pointerId !== active) {
        if (e.pointerType === "mouse") canvas.style.cursor = self.overGlobe(e) ? "grab" : "";
        return;
      }
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
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    el.addEventListener("keydown", function (e) {
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
