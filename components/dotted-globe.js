/*
 * Dotted globe component: a sphere of evenly spaced dots forming the
 * continents, drawn with cobe (vendor/cobe-2.0.1.js, which must load first).
 *
 *   <link rel="stylesheet" href="../components/dotted-globe.css">
 *   <div class="dotted-globe" data-dotted-globe role="img"
 *        aria-label="..."><canvas></canvas></div>
 *   <script src="../vendor/cobe-2.0.1.js"></script>
 *   <script src="../components/dotted-globe.js"></script>
 *
 * Colours come from theme tokens in dotted-globe.css (--globe-*), re-read
 * whenever the page theme changes. Motion: slow idle spin; drag to spin by
 * hand, release keeps the flick's momentum and eases back to idle.
 */
(function () {
  var TAU = Math.PI * 2;
  var IDLE_SPEED = TAU / 35;          // rad/s: one turn every ~35s
  var REDUCED_IDLE_SPEED = TAU / 120; // "Reduce motion": a much slower turn
  var MAX_SPEED = TAU * 1.5;          // cap on flick speed (rad/s)
  var EASE_TIME = 0.6;                // s; ~4x this to settle back to idle
  var BASE_THETA = 0.25;              // resting tilt (rad)
  var MAX_TILT = 0.35;                // tilt allowed either side of rest
  var MAX_DPR = 2;                    // sharp on Retina, bounded GPU cost

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function hexToRgb(value) {
    var hex = value.trim().replace("#", "");
    if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [0.5, 0.5, 0.5];
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function readTheme(el) {
    var s = getComputedStyle(el);
    var num = function (name, fallback) {
      var v = parseFloat(s.getPropertyValue(name));
      return isNaN(v) ? fallback : v;
    };
    return {
      baseColor: hexToRgb(s.getPropertyValue("--globe-base")),
      glowColor: hexToRgb(s.getPropertyValue("--globe-glow")),
      markerColor: hexToRgb(s.getPropertyValue("--globe-base")),
      dark: num("--globe-dark", 0),
      diffuse: num("--globe-diffuse", 1.2),
      mapBrightness: num("--globe-brightness", 6),
      mapBaseBrightness: num("--globe-ocean", 0),
      opacity: num("--globe-opacity", 1)
    };
  }

  function mount(el) {
    var canvas = el.querySelector("canvas") || el.appendChild(document.createElement("canvas"));
    if (typeof window.createGlobe !== "function") return;

    var size = Math.max(1, Math.round(el.clientWidth));
    var phi = 0.6;           // start with Europe/Africa roughly facing
    var theta = BASE_THETA;
    var speed = reducedMotion.matches ? REDUCED_IDLE_SPEED : IDLE_SPEED; // rad/s
    var dragging = false;
    var pointerId = null;
    var lastX = 0, lastY = 0, lastMoveTime = 0, dragVelocity = 0;
    var raf = 0, lastFrame = 0;
    var visible = true;

    var globe = window.createGlobe(canvas, Object.assign({
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      width: size,
      height: size,
      phi: phi,
      theta: theta,
      mapSamples: 16000,
      markers: [],
      scale: 1
    }, readTheme(el)));

    function idleSpeed() {
      return reducedMotion.matches ? REDUCED_IDLE_SPEED : IDLE_SPEED;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;

      if (!dragging) {
        var idle = idleSpeed();
        // Exponential ease from the flick speed back to idle: smooth, no
        // jumps, settles in ~2.5s, and never stops (idle is never zero).
        speed = idle + (speed - idle) * Math.exp(-dt / EASE_TIME);
        phi += speed * dt;
        theta = BASE_THETA + (theta - BASE_THETA) * Math.exp(-dt / EASE_TIME);
      }
      globe.update({ phi: phi, theta: theta });
    }

    function start() {
      if (raf || document.hidden || !visible) return;
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // ---- Drag ------------------------------------------------------------
    canvas.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || dragging) return;
      dragging = true;
      pointerId = e.pointerId;
      canvas.setPointerCapture(pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveTime = e.timeStamp;
      dragVelocity = 0;
      el.classList.add("is-dragging");
      e.preventDefault();
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pointerId) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      var dt = Math.max((e.timeStamp - lastMoveTime) / 1000, 1 / 240);
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveTime = e.timeStamp;

      // Dragging across the whole globe turns it by half a revolution.
      var dPhi = (dx / size) * Math.PI;
      phi += dPhi;
      theta = Math.max(BASE_THETA - MAX_TILT,
        Math.min(BASE_THETA + MAX_TILT, theta + (dy / size) * Math.PI * 0.5));
      // Smoothed velocity of the last few moves = the flick speed.
      dragVelocity = dragVelocity * 0.6 + (dPhi / dt) * 0.4;
    });

    function release(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      el.classList.remove("is-dragging");
      // A pause before letting go means no flick.
      if (e.timeStamp - lastMoveTime > 80) dragVelocity = 0;
      speed = reducedMotion.matches
        ? idleSpeed()
        : Math.max(-MAX_SPEED, Math.min(MAX_SPEED, dragVelocity));
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    // ---- Size: always square, follows the element's CSS size -------------
    new ResizeObserver(function () {
      var next = Math.max(1, Math.round(el.clientWidth));
      if (next === size) return;
      size = next;
      globe.update({ width: size, height: size, phi: phi, theta: theta });
    }).observe(el);

    // ---- Theme: re-read tokens when the page theme changes ---------------
    function applyTheme() {
      globe.update(Object.assign(readTheme(el), { phi: phi, theta: theta }));
    }
    new MutationObserver(applyTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

    // ---- Pause when the tab is hidden or the globe is off screen ---------
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }).observe(el);

    start();
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-dotted-globe]"), mount);
})();
