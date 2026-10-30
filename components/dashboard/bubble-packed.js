/*
 * Bubble map 1, "Packed bubbles" (market overview): circles packed
 * together, no axes. Size by market cap, 24h volume or Canary score;
 * colour by % change (any timeframe, red - neutral - green) or by verdict.
 * Ticker and % change print inside bubbles big enough to hold them.
 * Uses bubble-core.js; packs the circles itself (no library).
 */
(function () {
  var B = window.CA_BUBBLES, UI = window.CA_DASH_UI;
  var SIZE = { marketCap: "Market cap", volume: "24h volume", score: "Canary score" };

  function sizeValue(a, key) { return key === "volume" ? a.volume24h : key === "score" ? a.canaryScore : a.marketCap; }

  // Greedy packing: biggest first; each next circle goes to the spot,
  // touching one or two placed circles, closest to the middle without
  // overlapping. `stretch` widens the cluster to suit a wide chart.
  function pack(rs, stretch) {
    var order = rs.map(function (r, i) { return i; }).sort(function (a, b) { return rs[b] - rs[a]; });
    var placed = [], pos = [];
    function free(x, y, r) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k], dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy < (r + p.r - 0.01) * (r + p.r - 0.01)) return false;
      }
      return true;
    }
    function cost(x, y) { return x * x / (stretch * stretch) + y * y; }
    order.forEach(function (i, n) {
      var r = rs[i] * 1.04, best = null; // a small gap between bubbles
      if (n === 0) best = { x: 0, y: 0 };
      else {
        var cands = [];
        placed.forEach(function (a) {
          for (var t = 0; t < 24; t++) {
            var ang = t / 24 * Math.PI * 2;
            cands.push({ x: a.x + (a.r + r) * Math.cos(ang), y: a.y + (a.r + r) * Math.sin(ang) });
          }
        });
        for (var p = 0; p < placed.length; p++) for (var q = p + 1; q < placed.length; q++) {
          var a = placed[p], b = placed[q], ra = a.r + r, rb = b.r + r;
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d > ra + rb || d < Math.abs(ra - rb) || d === 0) continue;
          var l = (ra * ra - rb * rb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - l * l));
          var mx = a.x + dx * l / d, my = a.y + dy * l / d;
          cands.push({ x: mx + h * dy / d, y: my - h * dx / d }, { x: mx - h * dy / d, y: my + h * dx / d });
        }
        cands.forEach(function (c) {
          if (free(c.x, c.y, r) && (!best || cost(c.x, c.y) < cost(best.x, best.y))) best = c;
        });
      }
      placed.push({ x: best.x, y: best.y, r: r });
      pos[i] = { x: best.x, y: best.y };
    });
    return pos;
  }

  B.register("packed", {
    describe: function (v) {
      return "Packed bubble map. Bubble size shows " + SIZE[v.size].toLowerCase() + "; colour shows " +
        (v.color === "verdict" ? "the verdict" : UI.tfLabel(v.color) + " price change") + ".";
    },
    controls: [
      { key: "size", label: "Size by", value: "marketCap", options: [
        { value: "marketCap", label: "Market cap" }, { value: "volume", label: "24h volume" }, { value: "score", label: "Canary score" }] },
      { key: "color", label: "Color by", value: "h24", options: UI.TIMEFRAMES.map(function (t) {
        return { value: t.key, label: "% change, " + t.label };
      }).concat([{ value: "verdict", label: "Verdict" }]) }
    ],
    layout: function (assets, v, box) {
      var tf = v.color === "verdict" ? "h24" : v.color;
      var vals = assets.map(function (a) { return sizeValue(a, v.size); });
      // Sizes are relative, then the whole cluster is scaled to fit.
      var rs = B.radii(vals, 0.16, 1);
      var pos = pack(rs, Math.max(1, box.w / box.h * 0.9));
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pos.forEach(function (p, i) {
        minX = Math.min(minX, p.x - rs[i]); maxX = Math.max(maxX, p.x + rs[i]);
        minY = Math.min(minY, p.y - rs[i]); maxY = Math.max(maxY, p.y + rs[i]);
      });
      var pad = 12, k = Math.min((box.w - 2 * pad) / (maxX - minX), (box.h - 2 * pad) / (maxY - minY));
      var ox = box.w / 2 - (minX + maxX) / 2 * k, oy = box.h / 2 - (minY + maxY) / 2 * k;
      var nodes = {};
      assets.forEach(function (a, i) {
        var c = v.color === "verdict" ? B.verdictColor(a.verdict) : B.changeColor(a.priceChange[tf], tf);
        nodes[a.id] = {
          x: ox + pos[i].x * k, y: oy + pos[i].y * k, r: rs[i] * k - 1.5, fill: c.fill, stroke: c.stroke,
          text: a.ticker, sub: UI.pct(a.priceChange[tf], 1)
        };
      });
      var minV = Math.min.apply(null, vals), maxV = Math.max.apply(null, vals);
      var fmt = v.size === "score" ? function (x) { return x + " / 80"; } : UI.usd;
      return {
        nodes: nodes, tf: tf,
        legend: '<p class="bubbles__legend-row"><span class="dash-label">Size</span>' + SIZE[v.size] + ": " +
          B.sizeLegend(SIZE[v.size], fmt(minV), fmt(maxV)) + "</p>" +
          '<div class="bubbles__legend-row"><span class="dash-label">Color</span>' +
          (v.color === "verdict" ? B.verdictLegend() : "Price change, " + UI.tfLabel(tf) + B.changeLegend(tf)) + "</div>"
      };
    }
  });
})();
