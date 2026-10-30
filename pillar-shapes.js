/*
 * Section 5 value pillars: a shape above each column header that loops
 * dot -> shape -> dot, in a left-to-right wave across the four columns
 * (circle, triangle, square, pentagon).
 *
 * Every shape is sampled to the same 120 points (120 divides by 3, 4 and
 * 5, so polygon corners land exactly on samples), so the browser can
 * interpolate between the dot and the shape. The loop is a declarative SVG
 * <animate> (CSS d: path() animation doesn't work in Safari). This script
 * only builds the paths once, starts the loop and pauses it off screen.
 * With reduced motion, no IntersectionObserver or no JS, the exact shapes
 * already in the markup show and nothing animates.
 */
(function () {
  // Timing, in seconds. One cycle = DOT_HOLD + MORPH + SHAPE_HOLD + MORPH.
  var DOT_HOLD = 0.8, MORPH = 0.8, SHAPE_HOLD = 1.6, STAGGER = 0.15;
  var EASE = "0.65 0 0.35 1"; // ease-in-out, same curve both ways
  var N = 120, DOT_R = 6;

  var list = document.querySelector(".pillars");
  if (!list) return;
  var paths = Array.prototype.slice.call(list.querySelectorAll(".pillar-shape__path"));
  if (!paths.length) return;

  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) return;

  // Corners of a regular polygon, apex up (square sits flat). Radii are
  // trimmed per shape so the four read as the same visual size.
  function corners(sides) {
    var r = { 3: 46, 4: 46, 5: 44 }[sides];
    var start = sides === 4 ? -Math.PI * 3 / 4 : -Math.PI / 2;
    var dy = sides === 3 ? 8 : sides === 5 ? 3 : 0; // optical centring
    var pts = [];
    for (var i = 0; i < sides; i++) {
      var a = start + i * 2 * Math.PI / sides;
      pts.push([50 + r * Math.cos(a), 50 + dy + r * Math.sin(a)]);
    }
    return pts;
  }

  function target(sides) {
    var pts = [], i;
    if (sides === 0) {
      for (i = 0; i < N; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / N;
        pts.push([50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)]);
      }
      return pts;
    }
    var c = corners(sides), per = N / sides;
    for (i = 0; i < N; i++) {
      var e = Math.floor(i / per), t = (i % per) / per;
      var p = c[e], q = c[(e + 1) % sides];
      pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
    return pts;
  }

  // The dot: a small circle whose points sit at the same angles as the
  // target's, so each point travels straight outward and back.
  function dot(tgt) {
    return tgt.map(function (p) {
      var a = Math.atan2(p[1] - 50, p[0] - 50);
      return [50 + DOT_R * Math.cos(a), 50 + DOT_R * Math.sin(a)];
    });
  }

  function toD(pts) {
    return "M" + pts.map(function (p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }).join("L") + "Z";
  }

  var total = DOT_HOLD + MORPH + SHAPE_HOLD + MORPH;
  var keyTimes = [0, DOT_HOLD, DOT_HOLD + MORPH, DOT_HOLD + MORPH + SHAPE_HOLD, total]
    .map(function (t) { return +(t / total).toFixed(4); }).join(";");
  var svgs = paths.map(function (el) { return el.ownerSVGElement; });

  var anims = paths.map(function (el) {
    var tgt = target(Number(el.getAttribute("data-shape")));
    var d0 = toD(dot(tgt)), d1 = toD(tgt);
    el.setAttribute("d", d0);
    var a = document.createElementNS("http://www.w3.org/2000/svg", "animate");
    a.setAttribute("attributeName", "d");
    a.setAttribute("dur", total + "s");
    a.setAttribute("begin", "indefinite");
    a.setAttribute("repeatCount", "indefinite");
    a.setAttribute("calcMode", "spline");
    // dot hold, morph out, shape hold, morph back
    a.setAttribute("values", [d0, d0, d1, d1, d0].join(";"));
    a.setAttribute("keyTimes", keyTimes);
    a.setAttribute("keySplines", ["0 0 1 1", EASE, "0 0 1 1", EASE].join(";"));
    el.appendChild(a);
    return a;
  });

  // Start the wave the first time the pillars come into view. A low
  // threshold so it still fires when the columns stack taller than a phone
  // screen.
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    anims.forEach(function (a, i) { a.beginElementAt(i * STAGGER); });
  }, { threshold: 0.2 });
  io.observe(list);

  // Pause the loop while the pillars are off screen.
  new IntersectionObserver(function (entries) {
    var on = entries[0].isIntersecting;
    svgs.forEach(function (s) { on ? s.unpauseAnimations() : s.pauseAnimations(); });
  }).observe(list);
})();
