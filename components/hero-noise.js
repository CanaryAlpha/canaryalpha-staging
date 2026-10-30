/*
 * Hero option 3, "Signal from noise": a field of faint scattered points
 * slowly gathers into one clean line that ends at a verdict marker, holds,
 * then scatters back into noise and the next run gathers again. The line
 * ends higher for a better score; the verdict uses the bands in
 * feature-visuals.config.js. Settings in hero-visuals.config.js ("noise");
 * run by hero-visuals.js.
 */
(function () {
  var SPREAD = 1800;   // points set off left to right over this long, in ms
  var LINE_IN = 1200;  // then the line, marker and verdict fade in
  var SCATTER = 2000;  // after the hold, the points scatter

  function build(stage, cfg, u, all) {
    var gather = cfg.duration - LINE_IN;      // points moving into the line
    var still = cfg.duration;                 // resolved: line and verdict shown
    var scatterAt = still + all.cycle.hold;
    var total = scatterAt + SCATTER;
    var MAX = cfg.points.desktop;

    var svg = u.svg("svg", { class: "hv-noise", "aria-hidden": "true", focusable: "false" }, stage);
    var line = u.svg("path", { class: "hv-noise__line" }, svg);
    var dotsGroup = u.svg("g", { class: "hv-noise__dots" }, svg);
    var dots = [];
    for (var i = 0; i < MAX; i++) dots.push(u.svg("circle", { class: "hv-noise__dot", r: 1.8 }, dotsGroup));
    var marker = u.svg("circle", { class: "hv-noise__marker", r: 6 }, svg);
    var eyebrow = u.svg("text", { class: "hv-eyebrow", "text-anchor": "end" }, svg);
    eyebrow.textContent = cfg.verdictLabel;
    var verdict = u.svg("text", { class: "hv-noise__verdict", "text-anchor": "end" }, svg);

    var data = null, box = { w: 0, h: 0 }, n = MAX, end = null;

    // Line height (0 = bottom, 1 = top) at x in 0..1.
    function lineAt(d, x) {
      var v = d.from + (d.to - d.from) * u.easeInOut(x);
      d.waves.forEach(function (wv) { v += wv.a * Math.sin(wv.f * x * Math.PI * 2 + wv.p) * (1 - x * 0.6); });
      return v;
    }
    // Pixel position of a 0..1 point in the drawing area.
    function px(x) { return box.w * 0.02 + x * box.w * 0.84; }
    function py(v) { return box.h * 0.88 - v * box.h * 0.76; }

    function place() {
      var d = "";
      for (var i = 0; i <= 80; i++) {
        var x = i / 80;
        d += (i ? "L" : "M") + px(x).toFixed(1) + " " + py(lineAt(data, x)).toFixed(1);
      }
      line.setAttribute("d", d);
      end = { x: px(1), y: py(lineAt(data, 1)) };
      marker.setAttribute("cx", end.x);
      marker.setAttribute("cy", end.y);
      // Verdict text just left of and above the marker.
      var above = end.y > box.h * 0.35;
      var ty = above ? end.y - 16 : end.y + 32;
      verdict.setAttribute("x", end.x + 6);
      verdict.setAttribute("y", ty);
      eyebrow.setAttribute("x", end.x + 6);
      eyebrow.setAttribute("y", ty - 18);
      verdict.textContent = u.bands[data.band].label + " · " + data.total + " / " + u.maxScore;
    }

    return {
      duration: total,
      still: still,
      continuous: true,

      generate: function (rng, last) {
        var result = u.score(rng);
        // Better scores end higher. The start is mid-range, a little random.
        var share = (result.total - 24) / (u.maxScore - 24);
        result.from = u.between(rng, 0.35, 0.55);
        result.to = u.clamp(0.15 + 0.75 * share, 0.12, 0.9);
        result.waves = [0, 1].map(function (k) {
          return { f: 1.2 + k * 1.9 + rng(), p: rng() * Math.PI * 2, a: 0.06 / (k + 1) };
        });
        function scatter() {
          var list = [];
          for (var i = 0; i < MAX; i++) list.push([rng(), rng()]);
          return list;
        }
        // Each run gathers from where the last one scattered to.
        result.scatterFrom = last ? last.scatterTo : scatter();
        result.scatterTo = scatter();
        return result;
      },

      apply: function (d) {
        data = d;
        if (box.w) place();
        return "Illustration: scattered data points slowly gather into one clear line that ends at a verdict: " +
          u.bands[d.band].label + ", " + d.total + " out of " + u.maxScore + " (fictional).";
      },

      layout: function (w, h) {
        box = { w: w, h: h };
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);
        svg.setAttribute("width", w);
        svg.setAttribute("height", h);
        n = w < 600 ? cfg.points.phone : cfg.points.desktop;
        dots.forEach(function (dot, i) { dot.style.display = i < n ? "" : "none"; });
        if (data) place();
      },

      frame: function (t) {
        if (!data || !box.w) return;
        var w = box.w, h = box.h;
        var out = u.progress(t, scatterAt, SCATTER);
        for (var i = 0; i < n; i++) {
          var x = i / (n - 1);
          var a = data.scatterFrom[i], b = data.scatterTo[i];
          var lx = px(x), ly = py(lineAt(data, x));
          // Set off left to right; each point takes the rest of `gather`.
          var go = u.easeInOut(u.progress(t, x * SPREAD, gather - SPREAD));
          var away = u.easeInOut(u.clamp(out * 1.4 - x * 0.4, 0, 1));
          var gx = a[0] * w + (lx - a[0] * w) * go, gy = a[1] * h + (ly - a[1] * h) * go;
          var X = gx + (b[0] * w - gx) * away, Y = gy + (b[1] * h - gy) * away;
          dots[i].setAttribute("transform", "translate(" + X.toFixed(1) + " " + Y.toFixed(1) + ")");
          var resolved = u.progress(t, gather, LINE_IN);
          // Faint as noise, clearer as they line up, dimmer once the line shows.
          dots[i].style.opacity = (0.3 + (0.55 * go - 0.4 * resolved) * (1 - away)).toFixed(3);
        }
        var shown = u.progress(t, gather, LINE_IN) * (1 - u.progress(t, scatterAt, SCATTER * 0.5));
        line.style.opacity = shown;
        var m = u.easeOut(u.progress(t, gather + 300, 600)) * (1 - u.progress(t, scatterAt, SCATTER * 0.4));
        marker.style.opacity = m;
        marker.setAttribute("transform", "translate(" + end.x + " " + end.y + ") scale(" + (0.4 + 0.6 * m).toFixed(3) +
          ") translate(" + -end.x + " " + -end.y + ")");
        var l = u.easeOut(u.progress(t, gather + 600, 600)) * (1 - u.progress(t, scatterAt, SCATTER * 0.4));
        verdict.style.opacity = l;
        eyebrow.style.opacity = l;
      }
    };
  }

  (window.CA_HERO_KINDS = window.CA_HERO_KINDS || {}).noise = { build: build };
})();
