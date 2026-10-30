/*
 * Bubble map 3, "Activity" (volume vs. market cap): market cap across, 24h
 * volume up (both log scales), bubble size = market cap, colour intensity =
 * volume relative to market cap. A dashed line marks the typical (median)
 * ratio: bubbles far above it are unusually active. A callout names the
 * most unusual one, worked out from the data. Uses bubble-core.js.
 */
(function () {
  var B = window.CA_BUBBLES, UI = window.CA_DASH_UI;
  function ratio(a) { return a.volume24h / a.marketCap; }
  function share(v) { return (v * 100 >= 10 ? Math.round(v * 100) : (v * 100).toFixed(1)) + "%"; }

  B.register("activity", {
    describe: function (v) {
      return "Activity map. Across: market cap; up: 24h volume (both log scales). Darker bubbles trade more of their market cap. Tooltips show the " +
        UI.tfLabel(v.tf) + " price change.";
    },
    controls: [
      { key: "tf", label: "Timeframe", value: "h24", options: UI.TIMEFRAMES.map(function (t) { return { value: t.key, label: "% change, " + t.label }; }) }
    ],
    layout: function (assets, v, box) {
      var m = box.mobile ? { l: 50, r: 14, t: 14, b: 34 } : { l: 66, r: 24, t: 16, b: 40 };
      var rMax = box.mobile ? 26 : 38, rMin = box.mobile ? 7 : 9;
      var caps = assets.map(function (a) { return a.marketCap; }), vols = assets.map(function (a) { return a.volume24h; });
      var x = B.logScale(caps, m.l + rMax * 0.6, box.w - m.r - rMax * 0.6);
      var y = B.logScale(vols, box.h - m.b - rMax * 0.5, m.t + rMax * 0.5);
      var rs = B.radii(caps, rMin, rMax);
      var ratios = assets.map(ratio), typical = B.median(ratios);
      // How unusual: how many times the typical ratio, in log terms.
      var z = ratios.map(function (r) { return Math.log(r / typical); });
      var zMax = Math.max.apply(null, z.map(Math.abs)) || 1;
      var top = 0;
      z.forEach(function (val, i) { if (val > z[top]) top = i; });
      var nodes = {};
      assets.forEach(function (a, i) {
        var t = Math.max(0, Math.min(1, (z[i] / zMax + 1) / 2));
        nodes[a.id] = {
          x: x(caps[i]), y: y(vols[i]), r: rs[i], text: a.ticker, sub: share(ratios[i]),
          fill: "color-mix(in srgb, var(--ink) " + Math.round(6 + 52 * t) + "%, var(--ground))",
          stroke: "color-mix(in srgb, var(--ink) " + Math.round(35 + 55 * t) + "%, var(--ground))",
          mark: i === top
        };
      });

      var ax = "", L = m.l, R = box.w - m.r, T = m.t, Bm = box.h - m.b;
      x.ticks().forEach(function (t) {
        var px = x(t);
        if (px < L || px > R) return;
        ax += '<line class="dash-chart__grid" x1="' + px.toFixed(1) + '" x2="' + px.toFixed(1) + '" y1="' + T + '" y2="' + Bm + '"/>' +
          '<text class="dash-chart__tick" x="' + px.toFixed(1) + '" y="' + (Bm + 16) + '" text-anchor="middle">' + UI.usdShort(t) + "</text>";
      });
      y.ticks().forEach(function (t) {
        var py = y(t);
        if (py < T || py > Bm) return;
        ax += '<line class="dash-chart__grid" x1="' + L + '" x2="' + R + '" y1="' + py.toFixed(1) + '" y2="' + py.toFixed(1) + '"/>' +
          '<text class="dash-chart__tick" x="' + (L - 8) + '" y="' + (py + 4).toFixed(1) + '" text-anchor="end">' + UI.usdShort(t) + "</text>";
      });
      // Typical-ratio line: volume = market cap x median ratio.
      var c0 = Math.min.apply(null, caps), c1 = Math.max.apply(null, caps);
      ax += '<line class="bubbles__divider bubbles__typical" x1="' + x(c0).toFixed(1) + '" y1="' + y(c0 * typical).toFixed(1) +
        '" x2="' + x(c1).toFixed(1) + '" y2="' + y(c1 * typical).toFixed(1) + '"/>';
      ax += '<text class="bubbles__quadrant" x="' + (L + 6) + '" y="' + (T + 14) + '">More active than typical</text>' +
        '<text class="bubbles__quadrant" x="' + (R - 6) + '" y="' + (Bm - 8) + '" text-anchor="end">Less active than typical</text>';
      ax += '<text class="dash-chart__axis" x="' + ((L + R) / 2).toFixed(1) + '" y="' + (box.h - 2) + '" text-anchor="middle">Market cap (log scale)</text>' +
        '<text class="dash-chart__axis" transform="translate(12 ' + ((T + Bm) / 2).toFixed(1) + ') rotate(-90)" text-anchor="middle">24h volume (log scale)</text>';

      var a = assets[top];
      return {
        nodes: nodes, tf: v.tf, axes: ax,
        extra: function (asset) { return "<div><dt>Volume / market cap</dt><dd>" + share(ratio(asset)) + "</dd></div>"; },
        callout: '<span class="dash-label">Most unusual activity</span><strong>' + UI.esc(a.name) + " (" + UI.esc(a.ticker) + ")</strong> traded " +
          share(ratios[top]) + " of its market cap in 24 hours, " + (ratios[top] / typical).toFixed(1) + "× the typical " + share(typical) + ". " +
          "It is ringed on the map.",
        legend: '<p class="bubbles__legend-row"><span class="dash-label">Size</span>Market cap: ' +
          B.sizeLegend("", UI.usd(Math.min.apply(null, caps)), UI.usd(Math.max.apply(null, caps))) + "</p>" +
          '<div class="bubbles__legend-row"><span class="dash-label">Color</span>24h volume as a share of market cap' +
          '<div class="bubbles__scale"><span class="bubbles__ramp bubbles__ramp--ink" aria-hidden="true"></span>' +
          '<span class="bubbles__ramp-labels"><span>Quieter</span><span>Typical (' + share(typical) + ')</span><span>More active</span></span></div></div>' +
          '<p class="bubbles__legend-row"><span class="dash-label">Line</span>Dashed: typical volume for its size</p>'
      };
    }
  });
})();
