/*
 * Bubble map 2, "Scatter" (relationships): bubbles on two axes.
 * X: market cap, 24h volume or volume-to-market-cap ratio (log scales);
 * Y: % change (any timeframe) or Canary score; size: market cap or 24h
 * volume; colour: verdict or direction of the % change. Faint quadrant
 * labels name each corner. Uses bubble-core.js.
 */
(function () {
  var B = window.CA_BUBBLES, UI = window.CA_DASH_UI;
  var X = {
    marketCap: { label: "Market cap", get: function (a) { return a.marketCap; }, fmt: UI.usdShort, hi: "Large cap", lo: "Small cap" },
    volume: { label: "24h volume", get: function (a) { return a.volume24h; }, fmt: UI.usdShort, hi: "High volume", lo: "Low volume" },
    ratio: { label: "Volume / market cap", get: function (a) { return a.volume24h / a.marketCap; },
      fmt: function (v) { return (v * 100 >= 1 ? Math.round(v * 100) : (v * 100).toFixed(1)) + "%"; }, hi: "Busy trading", lo: "Quiet trading" }
  };

  B.register("scatter", {
    describe: function (v) {
      return "Scatter bubble chart. Across: " + X[v.x].label.toLowerCase() + " (log scale). Up: " +
        (v.y === "score" ? "Canary score" : UI.tfLabel(v.y) + " price change") + ".";
    },
    controls: [
      { key: "x", label: "X axis", value: "marketCap", options: [
        { value: "marketCap", label: "Market cap" }, { value: "volume", label: "24h volume" }, { value: "ratio", label: "Volume / market cap" }] },
      { key: "y", label: "Y axis", value: "h24", options: UI.TIMEFRAMES.map(function (t) {
        return { value: t.key, label: "% change, " + t.label };
      }).concat([{ value: "score", label: "Canary score" }]) },
      { key: "size", label: "Size", value: "marketCap", options: [
        { value: "marketCap", label: "Market cap" }, { value: "volume", label: "24h volume" }] },
      { key: "color", label: "Color", value: "verdict", options: [
        { value: "verdict", label: "Verdict" }, { value: "direction", label: "% change direction" }] }
    ],
    layout: function (assets, v, box) {
      var m = box.mobile ? { l: 48, r: 14, t: 14, b: 34 } : { l: 64, r: 24, t: 16, b: 40 };
      var rMax = box.mobile ? 26 : 38, rMin = box.mobile ? 6 : 8;
      var xs = assets.map(X[v.x].get);
      var x = B.logScale(xs, m.l + rMax * 0.6, box.w - m.r - rMax * 0.6);
      var tf = v.y === "score" ? "h24" : v.y;
      var ys = assets.map(function (a) { return v.y === "score" ? a.canaryScore : a.priceChange[v.y]; });
      var y;
      if (v.y === "score") y = B.linearScale(20, 80, box.h - m.b - rMax * 0.5, m.t + rMax * 0.5);
      else {
        var span = Math.max.apply(null, ys.map(Math.abs)) * 1.15 || 1;
        y = B.linearScale(-span, span, box.h - m.b - rMax * 0.5, m.t + rMax * 0.5);
      }
      var rs = B.radii(assets.map(function (a) { return v.size === "volume" ? a.volume24h : a.marketCap; }), rMin, rMax);
      var nodes = {};
      assets.forEach(function (a, i) {
        var c = v.color === "verdict" ? B.verdictColor(a.verdict) : B.directionColor(a.priceChange[tf]);
        nodes[a.id] = { x: x(xs[i]), y: y(ys[i]), r: rs[i], fill: c.fill, stroke: c.stroke, text: a.ticker, sub: "" };
      });

      // Axes, ticks, and quadrant dividers (median across, 0% or the
      // Conditional Hold line up).
      var ax = "", L = m.l, R = box.w - m.r, T = m.t, Bm = box.h - m.b;
      x.ticks().forEach(function (t) {
        var px = x(t);
        if (px < L || px > R) return;
        ax += '<line class="dash-chart__grid" x1="' + px.toFixed(1) + '" x2="' + px.toFixed(1) + '" y1="' + T + '" y2="' + Bm + '"/>' +
          '<text class="dash-chart__tick" x="' + px.toFixed(1) + '" y="' + (Bm + 16) + '" text-anchor="middle">' + X[v.x].fmt(t) + "</text>";
      });
      y.ticks(box.mobile ? 4 : 6).forEach(function (t) {
        var py = y(t);
        if (py < T || py > Bm) return;
        ax += '<line class="dash-chart__grid" x1="' + L + '" x2="' + R + '" y1="' + py.toFixed(1) + '" y2="' + py.toFixed(1) + '"/>' +
          '<text class="dash-chart__tick" x="' + (L - 8) + '" y="' + (py + 4).toFixed(1) + '" text-anchor="end">' + (v.y === "score" ? t : UI.pct(t, 0)) + "</text>";
      });
      var splitX = x(B.median(xs)), splitY = y(v.y === "score" ? 52 : 0);
      ax += '<line class="bubbles__divider" x1="' + splitX.toFixed(1) + '" x2="' + splitX.toFixed(1) + '" y1="' + T + '" y2="' + Bm + '"/>' +
        '<line class="bubbles__divider" x1="' + L + '" x2="' + R + '" y1="' + splitY.toFixed(1) + '" y2="' + splitY.toFixed(1) + '"/>';
      var up = v.y === "score" ? "high score" : "rising", down = v.y === "score" ? "low score" : "falling";
      var q = function (text, px, py, anchor) {
        return '<text class="bubbles__quadrant" x="' + px.toFixed(1) + '" y="' + py.toFixed(1) + '" text-anchor="' + anchor + '">' + text + "</text>";
      };
      ax += q(X[v.x].hi + ", " + up, R - 6, T + 14, "end") + q(X[v.x].hi + ", " + down, R - 6, Bm - 8, "end") +
        q(X[v.x].lo + ", " + up, L + 6, T + 14, "start") + q(X[v.x].lo + ", " + down, L + 6, Bm - 8, "start");
      ax += '<text class="dash-chart__axis" x="' + ((L + R) / 2).toFixed(1) + '" y="' + (box.h - 2) + '" text-anchor="middle">' + X[v.x].label + " (log scale)</text>" +
        '<text class="dash-chart__axis" transform="translate(12 ' + ((T + Bm) / 2).toFixed(1) + ') rotate(-90)" text-anchor="middle">' +
        (v.y === "score" ? "Canary score" : "Price change, " + UI.tfLabel(v.y)) + "</text>";

      var sizes = assets.map(function (a) { return v.size === "volume" ? a.volume24h : a.marketCap; });
      return {
        nodes: nodes, tf: tf, axes: ax,
        extra: v.x === "ratio" ? function (a) { return "<div><dt>Volume / market cap</dt><dd>" + X.ratio.fmt(a.volume24h / a.marketCap) + "</dd></div>"; } : null,
        legend: '<p class="bubbles__legend-row"><span class="dash-label">Size</span>' + (v.size === "volume" ? "24h volume" : "Market cap") + ": " +
          B.sizeLegend("", UI.usd(Math.min.apply(null, sizes)), UI.usd(Math.max.apply(null, sizes))) + "</p>" +
          '<div class="bubbles__legend-row"><span class="dash-label">Color</span>' + (v.color === "verdict" ? B.verdictLegend() :
            '<ul class="bubbles__keys"><li><span class="bubbles__swatch" style="background:' + B.directionColor(1).fill + ";border-color:" + B.directionColor(1).stroke +
            '"></span>Rising (' + UI.tfLabel(tf) + ')</li><li><span class="bubbles__swatch" style="background:' + B.directionColor(-1).fill + ";border-color:" +
            B.directionColor(-1).stroke + '"></span>Falling (' + UI.tfLabel(tf) + ")</li></ul>") + "</div>"
      };
    }
  });
})();
