/*
 * Hero option 1, "Early warning": a calm price line drifts across; under it
 * a faint row of on-chain activity ticks along. One tick flags a signal
 * (red, or now and then green) with a short label, and about 1.5 s later
 * the price reacts (down, or up). The story: on-chain signals come before
 * the price moves. Settings in hero-visuals.config.js ("early-warning");
 * run by hero-visuals.js. Fictional data only.
 */
(function () {
  var STEPS = 120; // points along the price line

  function build(stage, cfg, u) {
    var svg = u.svg("svg", { class: "hv-ew", "aria-hidden": "true", focusable: "false" }, stage);
    var priceLabel = u.svg("text", { class: "hv-eyebrow" }, svg);
    priceLabel.textContent = cfg.priceLabel;
    var activityLabel = u.svg("text", { class: "hv-eyebrow" }, svg);
    activityLabel.textContent = cfg.activityLabel;

    // The line is revealed left to right by a clip that scales with time.
    var clipId = "hv-ew-clip-" + Math.random().toString(36).slice(2, 8);
    var clip = u.svg("clipPath", { id: clipId }, u.svg("defs", {}, svg));
    var clipRect = u.svg("rect", { x: 0, y: 0, width: 1, height: 1 }, clip);
    var guide = u.svg("line", { class: "hv-ew__guide" }, svg);
    var line = u.svg("path", { class: "hv-ew__line", "clip-path": "url(#" + clipId + ")" }, svg);
    var head = u.svg("circle", { class: "hv-ew__head", r: 3.5 }, svg);

    var ticksGroup = u.svg("g", { class: "hv-ew__ticks" }, svg);
    var ticks = [];
    for (var i = 0; i < cfg.markers; i++) ticks.push(u.svg("rect", { class: "hv-ew__tick", width: 2 }, ticksGroup));
    var signal = u.svg("circle", { class: "hv-ew__signal", r: 5 }, svg);
    var label = u.svg("text", { class: "hv-ew__label" }, svg);

    var data = null, box = { w: 0, h: 0 }, geo = null;

    // Price (0 = bottom of its band, 1 = top) at x in 0..1.
    function priceAt(d, x) {
      var i = u.clamp(x, 0, 1) * (STEPS - 1), a = Math.floor(i), b = Math.min(a + 1, STEPS - 1);
      return d.price[a] + (d.price[b] - d.price[a]) * (i - a);
    }

    function layout(fullW, h) {
      // A little room on the right, so the line's end dot is never cut off.
      var w = fullW - 4;
      box = { w: w, h: h };
      var small = h < 220;
      var g = {
        top: Math.round(h * 0.16),
        bottom: Math.round(h * (small ? 0.6 : 0.62)),
        base: h - 20,           // ticks stand on this; their label sits under it
        bar: Math.max(10, Math.round(h * 0.12))
      };
      g.signalY = g.base - g.bar - 10;
      g.labelY = g.signalY - 12;
      geo = g;
      svg.setAttribute("viewBox", "0 0 " + fullW + " " + h);
      svg.setAttribute("width", fullW);
      svg.setAttribute("height", h);
      priceLabel.setAttribute("x", 0);
      priceLabel.setAttribute("y", 10);
      activityLabel.setAttribute("x", 0);
      activityLabel.setAttribute("y", h - 2);
      clipRect.setAttribute("width", fullW);
      clipRect.setAttribute("height", h);
      ticks.forEach(function (tick, i) { tick.setAttribute("x", Math.round((i + 0.5) / cfg.markers * w) - 1); });
      if (data) place();
    }

    function y(v) { return geo.bottom - v * (geo.bottom - geo.top); }

    // Writes the run's shapes for the current size.
    function place() {
      var w = box.w;
      var d = "";
      for (var i = 0; i < STEPS; i++) {
        var x = i / (STEPS - 1);
        d += (i ? "L" : "M") + (x * w).toFixed(1) + " " + y(data.price[i]).toFixed(1);
      }
      line.setAttribute("d", d);
      ticks.forEach(function (tick, i) {
        var hgt = Math.max(3, Math.round(data.bars[i] * geo.bar));
        tick.setAttribute("y", geo.base - hgt);
        tick.setAttribute("height", hgt);
        tick.classList.toggle("is-signal", i === data.marker);
        tick.classList.toggle("is-good", data.good);
      });
      var sx = (data.marker + 0.5) / cfg.markers * w;
      signal.setAttribute("cx", sx);
      signal.setAttribute("cy", geo.signalY);
      signal.classList.toggle("is-good", data.good);
      guide.setAttribute("x1", sx);
      guide.setAttribute("x2", sx);
      guide.setAttribute("y1", geo.signalY - 7);
      guide.setAttribute("y2", y(priceAt(data, sx / w)) + 6);
      label.textContent = data.text;
      // Centred on the marker, kept inside the box.
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("x", sx);
      label.setAttribute("y", geo.labelY);
      var width = label.getComputedTextLength ? label.getComputedTextLength() : 0;
      if (sx - width / 2 < 0) { label.setAttribute("text-anchor", "start"); label.setAttribute("x", 0); }
      else if (sx + width / 2 > w) { label.setAttribute("text-anchor", "end"); label.setAttribute("x", w); }
      label.classList.toggle("is-good", data.good);
    }

    return {
      duration: cfg.duration,

      generate: function (rng, last) {
        var good = rng() < cfg.positiveChance;
        // Never the same label twice in a row.
        var texts = (good ? cfg.positive : cfg.negative).filter(function (t) { return !last || t !== last.template; });
        var template = u.pick(rng, texts);
        var text = u.fill(template, {
          amount: u.between(rng, cfg.amount.min, cfg.amount.max).toFixed(1) + "M",
          pct: Math.round(u.between(rng, cfg.pct.min, cfg.pct.max))
        });
        var marker = Math.round(u.between(rng, cfg.signalAt.min, cfg.signalAt.max) * cfg.markers - 0.5);
        var signalTime = (marker + 0.5) / cfg.markers * cfg.duration;
        var lag = u.between(rng, cfg.lag.min, cfg.lag.max);
        var react = (signalTime + lag) / cfg.duration; // where the price turns, 0..1
        var move = u.between(rng, cfg.move.min, cfg.move.max) * (good ? 1 : -1);
        var start = good ? u.between(rng, 0.25, 0.4) : u.between(rng, 0.6, 0.75);
        // A calm drift: a few slow waves, small.
        var waves = [0, 1, 2].map(function (k) {
          return { f: 1.5 + k * 2.3 + rng(), p: rng() * Math.PI * 2, a: 0.045 / (k + 1) };
        });
        var price = [];
        for (var i = 0; i < STEPS; i++) {
          var x = i / (STEPS - 1);
          var v = start + 0.06 * (x - 0.5) * (good ? -1 : 1) * 0.5;
          // After the turn the waves calm down, so the move reads clearly.
          var turned = u.easeInOut(u.clamp((x - react) / 0.16, 0, 1));
          waves.forEach(function (wv) { v += wv.a * Math.sin(wv.f * x * Math.PI * 2 + wv.p) * (1 - 0.6 * turned); });
          v += move * turned;
          price.push(u.clamp(v, 0.02, 0.98));
        }
        var bars = [];
        for (var j = 0; j < cfg.markers; j++) bars.push(0.25 + 0.55 * rng() * rng() + (j === marker ? 0.3 : 0));
        return {
          good: good, template: template, text: text, marker: marker,
          signalTime: signalTime, lag: Math.round(lag), price: price, bars: bars.map(function (b) { return Math.min(b, 1); })
        };
      },

      apply: function (d) {
        data = d;
        if (geo) place();
        return "Illustration with fictional data: on-chain activity ticks along under a price line. " +
          "A " + (d.good ? "positive" : "warning") + " signal appears, “" + d.text + "”, and about " +
          (d.lag / 1000).toFixed(1) + " seconds later the price " + (d.good ? "rises" : "falls") + ".";
      },

      layout: layout,

      frame: function (t) {
        if (!geo || !data) return;
        var w = box.w, p = u.clamp(t / cfg.duration, 0, 1);
        clipRect.setAttribute("transform", "scale(" + p.toFixed(4) + " 1)");
        head.setAttribute("transform", "translate(" + (p * w).toFixed(1) + " " + y(priceAt(data, p)).toFixed(1) + ")");
        head.style.opacity = p > 0 ? 1 : 0;
        // Each tick fades in as the line passes over it.
        ticks.forEach(function (tick, i) {
          var at = (i + 0.5) / cfg.markers * cfg.duration;
          var on = u.progress(t, at - 150, 450);
          tick.style.opacity = i === data.marker ? on : on * 0.45;
        });
        var s = u.progress(t, data.signalTime, 500);
        var sx = (data.marker + 0.5) / cfg.markers * w;
        signal.style.opacity = s;
        signal.setAttribute("transform", "translate(" + sx + " " + geo.signalY + ") scale(" +
          (0.4 + 0.6 * u.easeOut(s)).toFixed(3) + ") translate(" + -sx + " " + -geo.signalY + ")");
        var l = u.easeOut(u.progress(t, data.signalTime + 150, 700));
        label.style.opacity = l;
        label.setAttribute("transform", "translate(0 " + (4 * (1 - l)).toFixed(2) + ")");
        guide.style.opacity = 0.7 * u.progress(t, data.signalTime + 200, 600);
      }
    };
  }

  (window.CA_HERO_KINDS = window.CA_HERO_KINDS || {})["early-warning"] = { build: build };
})();
