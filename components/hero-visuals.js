/*
 * Hero visuals: runs the animation in the homepage hero (and the three side
 * by side on /hero-options/). Inline SVG and plain DOM; no libraries,
 * no canvas, no WebGL.
 *
 *   <link rel="stylesheet" href="../components/hero-visuals.css">
 *   <div data-hero-visual></div>                <- shows config.heroVariant
 *   <div data-hero-visual="verdict"></div>      <- always this option
 *   <script src="../components/feature-visuals.config.js"></script>
 *   <script src="../components/hero-visuals.config.js"></script>
 *   <script src="../components/hero-early-warning.js"></script>
 *   <script src="../components/hero-verdict.js"></script>
 *   <script src="../components/hero-noise.js"></script>
 *   <script src="../components/hero-visuals.js"></script>
 *
 * An empty data-hero-visual shows the option named by heroVariant in
 * hero-visuals.config.js, or by ?hero=... in the page address.
 *
 * Each option file registers itself in window.CA_HERO_KINDS with a build()
 * that creates its markup once and returns:
 *   generate(rng, last) -> one run's results (fictional, consistent)
 *   apply(data)         -> writes them into the markup; returns the label
 *   layout(w, h)        -> places everything for the visual's pixel size
 *   frame(t)            -> draws the run at t ms; only sets transform and
 *                          opacity, so nothing on the page ever moves
 *   duration            -> how long a run animates, in ms
 *   still (optional)    -> the time shown with reduced motion (default:
 *                          duration)
 *   continuous (opt.)   -> true if a run flows straight into the next (the
 *                          option draws its own hold and change-over)
 *
 * The visual's box has a fixed size per breakpoint (hero-visuals.css), so it
 * never changes size while it plays. The clock only runs while it is on
 * screen and the tab is visible. With "reduce motion" on, it shows one still
 * final frame and never cycles.
 */
(function () {
  var CONFIG = window.CA_HERO_VISUALS;
  var KINDS = window.CA_HERO_KINDS || {};
  var roots = document.querySelectorAll("[data-hero-visual]");
  if (!CONFIG || !roots.length) return;
  var CYCLE = CONFIG.cycle;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  /* ---- Helpers shared with the option files ---------------------------- */

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  // Seeded random (mulberry32), so the first run is the same on every load.
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Verdict bands and scoring from feature-visuals.config.js, so the hero
  // and the "80-point scoring framework" visual always agree.
  var SCORING = (window.CA_FEATURE_VISUALS || {}).scoring;
  var BANDS = SCORING ? SCORING.bands.slice().sort(function (a, b) { return b.min - a.min; }) : [];
  var MAX_SCORE = SCORING ? SCORING.categories.reduce(function (a, c) { return a + c.weight; }, 0) : 80;

  var util = {
    SVG_NS: SVG_NS,
    clamp: clamp,
    el: function (tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    },
    svg: function (tag, attrs, parent) {
      var node = document.createElementNS(SVG_NS, tag);
      for (var key in attrs) node.setAttribute(key, attrs[key]);
      if (parent) parent.appendChild(node);
      return node;
    },
    between: function (rng, min, max) { return min + rng() * (max - min); },
    pick: function (rng, list) { return list[Math.floor(rng() * list.length)]; },
    fill: function (template, values) {
      return template.replace(/\{(\w+)\}/g, function (m, key) { return values[key]; });
    },
    // 0..1 progress of [start, start + length] at time t.
    progress: function (t, start, length) { return clamp((t - start) / length, 0, 1); },
    // Calm easings, like the feature visuals' cubic-bezier(0.22, 0.61, 0.36, 1).
    easeOut: function (p) { return 1 - Math.pow(1 - p, 3); },
    easeInOut: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    scoring: SCORING,
    bands: BANDS,
    maxScore: MAX_SCORE,
    bandRank: function (score) {
      for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) return i;
      return BANDS.length - 1;
    },
    // One fictional report's scores, generated exactly like the scoring
    // visual's: each category clusters mid-range, extremes are rare.
    score: function (rng) {
      var scores = SCORING.categories.map(function (c) {
        var mid = (rng() + rng() + rng()) / 3;
        var share = clamp(SCORING.center + (mid - 0.5) * SCORING.spread, SCORING.floor, 1);
        return Math.round(share * c.weight);
      });
      var total = scores.reduce(function (a, b) { return a + b; }, 0);
      return { scores: scores, total: total, band: util.bandRank(total) };
    }
  };

  /* ---- Visuals ---------------------------------------------------------- */

  var asked = new URLSearchParams(location.search).get("hero");
  var visuals = [];

  Array.prototype.forEach.call(roots, function (root, index) {
    var name = root.getAttribute("data-hero-visual") ||
      (asked && KINDS[asked] ? asked : CONFIG.heroVariant);
    if (!KINDS[name] || !CONFIG[name]) return;
    root.classList.add("hv", "hv--" + name);
    root.setAttribute("role", "img");
    var stage = util.el("div", "hv__stage");
    root.appendChild(stage);
    var v = {
      root: root,
      stage: stage,
      run: KINDS[name].build(stage, CONFIG[name], util, CONFIG),
      rng: seeded(CYCLE.seed + index * 7919),
      reseeded: false,
      data: null,
      w: 0,
      h: 0,
      t: 0,
      fade: 0,
      phase: "running",
      visible: false
    };
    root._hv = v;
    nextRun(v);
    measure(v);
    visuals.push(v);
  });
  if (!visuals.length) return;

  // Writes a fresh run's results into the visual. Replays reseed from the
  // clock once, so they differ from load to load.
  function nextRun(v) {
    if (v.data && !v.reseeded) {
      v.rng = seeded(Date.now() ^ CYCLE.seed);
      v.reseeded = true;
    }
    v.data = v.run.generate(v.rng, v.data);
    v.root.setAttribute("aria-label", v.run.apply(v.data));
  }

  function draw(v) {
    var still = v.run.still != null ? v.run.still : v.run.duration;
    v.run.frame(reduceMotion || !canObserve ? still : v.t);
  }

  // The box's size comes from CSS and only changes with the window; the
  // option re-lays itself out for it.
  function measure(v) {
    var w = v.stage.clientWidth, h = v.stage.clientHeight;
    if (!w || !h || (w === v.w && h === v.h)) return;
    v.w = w;
    v.h = h;
    v.run.layout(w, h);
    draw(v);
  }
  if ("ResizeObserver" in window) {
    var sizer = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { measure(entry.target._hv); });
    });
    visuals.forEach(function (v) { sizer.observe(v.root); });
  } else {
    window.addEventListener("resize", function () { visuals.forEach(measure); });
  }

  if (reduceMotion || !canObserve) return;

  // Phases: running (play, then hold) -> fading out -> new results ->
  // fading in -> running. A continuous option runs straight into the next.
  function advance(v, dt) {
    var run = v.run;
    if (v.phase === "running") {
      v.t += dt;
      if (run.continuous && v.t >= run.duration) {
        v.t -= run.duration;
        nextRun(v);
      } else if (!run.continuous && v.t >= run.duration + CYCLE.hold) {
        v.phase = "out";
        v.fade = 0;
      }
    } else if (v.phase === "out") {
      v.fade += dt;
      v.stage.style.opacity = String(1 - clamp(v.fade / CYCLE.fade, 0, 1));
      if (v.fade >= CYCLE.fade) {
        nextRun(v);
        v.t = 0;
        v.phase = "in";
        v.fade = 0;
      }
    } else if (v.phase === "in") {
      v.fade += dt;
      v.stage.style.opacity = String(clamp(v.fade / (CYCLE.fade / 2), 0, 1));
      if (v.fade >= CYCLE.fade / 2) {
        v.stage.style.opacity = "";
        v.phase = "running";
      }
    }
    draw(v);
  }

  var lastFrame = null, ticking = false;
  function tick(now) {
    // Capped, so a long gap between frames never skips ahead.
    var dt = lastFrame === null ? 0 : Math.min(now - lastFrame, 100);
    lastFrame = now;
    var running = false;
    if (!document.hidden) {
      visuals.forEach(function (v) {
        if (!v.visible) return;
        running = true;
        advance(v, dt);
      });
    }
    if (running) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
      lastFrame = null;
    }
  }
  function startTicking() {
    if (ticking || document.hidden) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { entry.target._hv.visible = entry.isIntersecting; });
    startTicking();
  });
  document.addEventListener("visibilitychange", startTicking);
  visuals.forEach(function (v) { watcher.observe(v.root); });
})();
