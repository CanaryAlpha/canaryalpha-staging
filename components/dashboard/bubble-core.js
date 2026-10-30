/*
 * Bubble map core: what the three bubble map variations share (packed
 * bubbles, scatter, activity map; one file each). Inline SVG, no libraries.
 *
 *   CA_BUBBLES.register(name, variation)   (done by each variation file)
 *   CA_BUBBLES.mount(container, name, { href: function (asset), only: [ids] })
 *   (only: show just these assets, e.g. Bitcoin and Ethereum for Free)
 *
 * A variation supplies:
 *   title, describe          text for the chart's accessible name
 *   controls [{ key, label, options [{ value, label }], value }]
 *   layout(assets, values, box) -> { nodes { id: { x, y, r, fill, stroke,
 *     text, sub, mark } }, axes (SVG), legend (HTML), callout (HTML),
 *     tf (timeframe shown in tooltips), extra(asset) (tooltip rows) }
 *
 * The core draws one bubble per asset ONCE and then only moves it: each
 * change sets transform (position, size) and opacity, which CSS eases, so
 * bubbles glide to their new places (instantly with reduced motion). The
 * chart has a fixed height per breakpoint (dashboard.css), so changing a
 * drop-down never moves the page. Hover or focus shows a tooltip; a click
 * (or Enter) opens the asset. On touch, the first tap shows the tooltip
 * (with an "Open details" link), a second tap opens it. Every bubble's tap
 * area is at least 44px across.
 */
window.CA_BUBBLES = (function () {
  var UI = window.CA_DASH_UI;
  var VARIATIONS = {};
  var SVG_NS = "http://www.w3.org/2000/svg";
  var MIN_TAP = 22; // radius of the smallest tap area, in px
  var uid = 0;

  function svg(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /* ---- Colour scales (theme tokens only) ------------------------------- */
  // How big a move counts as "strong" for each timeframe.
  var CAPS = { h1: 2, h24: 6, d7: 12, d30: 25, d90: 40, y1: 80 };
  // Diverging red - neutral - green, by % change.
  function changeColor(v, tf) {
    var t = Math.min(Math.abs(v) / (CAPS[tf] || 10), 1);
    if (Math.abs(v) < 0.05) return { fill: "color-mix(in srgb, var(--muted) 14%, var(--ground))", stroke: "var(--muted)" };
    var token = v > 0 ? "var(--success)" : "var(--danger)";
    return { fill: "color-mix(in srgb, " + token + " " + Math.round(12 + 46 * t) + "%, var(--ground))", stroke: token };
  }
  var VERDICT_TOKENS = {
    "Deploy Investment": "var(--dash-v-deploy)", "Conditional Hold": "var(--dash-v-hold)",
    "Watch List": "var(--dash-v-watch)", "Avoid": "var(--dash-v-avoid)"
  };
  function verdictColor(v) {
    var token = VERDICT_TOKENS[v] || "var(--muted)";
    return { fill: "color-mix(in srgb, " + token + " 30%, var(--ground))", stroke: token };
  }
  function directionColor(v) {
    var token = v > 0 ? "var(--success)" : v < 0 ? "var(--danger)" : "var(--muted)";
    return { fill: "color-mix(in srgb, " + token + " 30%, var(--ground))", stroke: token };
  }
  function verdictLegend() {
    return '<ul class="bubbles__keys">' + Object.keys(VERDICT_TOKENS).map(function (v) {
      var c = verdictColor(v);
      return '<li><span class="bubbles__swatch" style="background:' + c.fill + ";border-color:" + c.stroke + '"></span>' + v + "</li>";
    }).join("") + "</ul>";
  }
  function changeLegend(tf) {
    var cap = CAPS[tf];
    return '<div class="bubbles__scale"><span class="bubbles__ramp" aria-hidden="true"></span>' +
      '<span class="bubbles__ramp-labels"><span>' + UI.pct(-cap, 0) + " or less</span><span>0</span><span>" + UI.pct(cap, 0) + " or more</span></span></div>";
  }
  function sizeLegend(label, minText, maxText) {
    return '<div class="bubbles__size"><span class="bubbles__dot bubbles__dot--sm" aria-hidden="true"></span>' + minText +
      '<span class="bubbles__dot bubbles__dot--lg" aria-hidden="true"></span>' + maxText + "</div>";
  }

  /* ---- Scales ------------------------------------------------------------ */
  // Square-root sizing: a bubble's AREA follows its value.
  function radii(values, rMin, rMax) {
    var max = Math.max.apply(null, values) || 1;
    return values.map(function (v) { return Math.max(rMin, Math.sqrt(Math.max(v, 0) / max) * rMax); });
  }
  function logScale(values, from, to) {
    var lo = Math.log10(Math.min.apply(null, values)), hi = Math.log10(Math.max.apply(null, values));
    var pad = (hi - lo) * 0.12 || 0.5;
    lo -= pad; hi += pad;
    var f = function (v) { return from + (Math.log10(v) - lo) / (hi - lo) * (to - from); };
    f.ticks = function () {
      var out = [];
      for (var e = Math.floor(lo); e <= Math.ceil(hi); e++) [1, 3].forEach(function (m) {
        var v = m * Math.pow(10, e), l = Math.log10(v);
        if (l >= lo && l <= hi) out.push(v);
      });
      return out;
    };
    return f;
  }
  function linearScale(lo, hi, from, to) {
    var f = function (v) { return from + (v - lo) / (hi - lo) * (to - from); };
    f.ticks = function (n) {
      var step = niceStep((hi - lo) / n), out = [];
      for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
      return out;
    };
    return f;
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function median(values) {
    var s = values.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /* ---- Mount ------------------------------------------------------------- */
  function mount(container, name, opts) {
    var V = VARIATIONS[name], id = "bubbles-" + (++uid);
    var values = {};
    V.controls.forEach(function (c) { values[c.key] = c.value; });

    container.classList.add("bubbles", "bubbles--" + name);
    container.innerHTML =
      '<div class="bubbles__controls">' + V.controls.map(function (c) {
        return '<label class="dash-field"><span class="dash-field__label">' + c.label + '</span><select class="dash-select" data-key="' + c.key + '">' +
          c.options.map(function (o) { return '<option value="' + o.value + '"' + (o.value === c.value ? " selected" : "") + ">" + o.label + "</option>"; }).join("") +
          "</select></label>";
      }).join("") + "</div>" +
      '<div class="bubbles__chart"><svg class="bubbles__svg" role="group" aria-labelledby="' + id + '-name"></svg>' +
        '<p class="dash-sr" id="' + id + '-name"></p>' +
        '<div class="bubbles__tip" role="tooltip" id="' + id + '-tip" hidden></div></div>' +
      '<div class="bubbles__legend"></div><p class="bubbles__callout" aria-live="polite"></p>';

    var chart = container.querySelector(".bubbles__chart");
    var root = container.querySelector(".bubbles__svg");
    var tip = container.querySelector(".bubbles__tip");
    var axes = svg("g", { class: "bubbles__axes", "aria-hidden": "true" }, root);
    var layer = svg("g", { class: "bubbles__layer" }, root);
    var assets = [], nodes = {}, current = null, box = { w: 0, h: 0 }, touched = null;

    function build() {
      assets.forEach(function (a) {
        var g = svg("g", { class: "bubble", tabindex: "0", role: "link", "aria-describedby": id + "-tip" }, layer);
        var hit = svg("circle", { class: "bubble__hit", r: 1 }, g);
        var shape = svg("circle", { class: "bubble__shape", r: 1 }, g);
        var mark = svg("circle", { class: "bubble__mark", r: 1 }, g);
        var text = svg("text", { class: "bubble__text", "text-anchor": "middle", y: -2 }, g);
        var sub = svg("text", { class: "bubble__sub", "text-anchor": "middle", y: 13 }, g);
        // Assets with a logo (data layer) show it in the bubble: a unit
        // square, placed and sized by transform like the circles.
        var img = a.logo ? svg("image", { class: "bubble__logo", href: UI.logoUrl(a), x: -0.5, y: -0.5, width: 1, height: 1,
          preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true" }, g) : null;
        nodes[a.id] = { g: g, hit: hit, shape: shape, mark: mark, text: text, sub: sub, img: img, asset: a };
        g.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") show(a.id); });
        g.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hide(); });
        g.addEventListener("focus", function () { show(a.id); });
        g.addEventListener("blur", function () { if (touched !== a.id) hide(); });
        g.addEventListener("pointerup", function (e) {
          if (e.pointerType === "mouse") return open(a);
          // Touch and pen: first tap shows the tooltip, a second opens.
          if (touched === a.id) return open(a);
          touched = a.id;
          show(a.id);
        });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter") open(a); if (e.key === "Escape") hide(); });
      });
    }
    function open(a) { location.href = opts.href(a); }

    function update() {
      var w = chart.clientWidth, h = chart.clientHeight;
      if (!w || !h || !assets.length) return;
      box = { w: w, h: h, mobile: w < 600 };
      root.setAttribute("viewBox", "0 0 " + w + " " + h);
      current = V.layout(assets, values, box);
      axes.innerHTML = current.axes || "";
      container.querySelector(".bubbles__legend").innerHTML = current.legend || "";
      container.querySelector(".bubbles__callout").innerHTML = current.callout || "";
      container.querySelector("#" + id + "-name").textContent = V.describe(values) + " " + assets.length + " assets; use Tab to move between bubbles.";
      assets.forEach(function (a) {
        var n = nodes[a.id], s = current.nodes[a.id];
        n.g.style.transform = "translate(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px)";
        n.shape.style.transform = "scale(" + s.r.toFixed(2) + ")";
        n.hit.style.transform = "scale(" + Math.max(s.r, MIN_TAP).toFixed(2) + ")";
        n.mark.style.transform = "scale(" + (s.r + 4).toFixed(2) + ")";
        n.mark.style.opacity = s.mark ? 1 : 0;
        n.shape.style.fill = s.fill;
        n.shape.style.stroke = s.stroke;
        n.text.textContent = s.text || a.ticker;
        n.sub.textContent = s.sub || "";
        // Labels only where they fit inside the bubble.
        var fits = s.r >= (box.mobile ? 20 : 24);
        var subFits = fits && s.sub && s.r >= (box.mobile ? 24 : 28);
        if (n.img) {
          // Logo bubbles: big enough, the logo sits above the ticker (and %);
          // otherwise the logo alone, so even the smallest bubble says what
          // it is.
          var roomy = s.r >= (box.mobile ? 34 : 40);
          var L, cy;
          if (roomy) {
            L = Math.min(s.r * 0.5, 32);
            var top = -(L + 4 + 11 + (subFits ? 14 : 0)) / 2;
            cy = top + L / 2;
            n.text.setAttribute("y", (top + L + 4 + 10).toFixed(1));
            n.sub.setAttribute("y", (top + L + 4 + 24).toFixed(1));
          } else {
            L = Math.min(Math.max(s.r * (fits ? 1.1 : 1.4), 10), 30);
            cy = 0;
            subFits = false;
          }
          n.img.style.transform = "translate(0px," + cy.toFixed(1) + "px) scale(" + L.toFixed(1) + ")";
          fits = roomy;
        } else {
          n.text.setAttribute("y", subFits ? -2 : 4);
        }
        n.text.style.opacity = fits ? 1 : 0;
        n.sub.style.opacity = subFits ? 1 : 0;
        n.g.setAttribute("aria-label", label(a));
      });
      if (tip.dataset.id && !tip.hidden) show(tip.dataset.id);
    }

    function label(a) {
      var tf = current.tf;
      return a.name + " (" + a.ticker + "): " + UI.price(a.price) + ", " + UI.tfLabel(tf) + " " + UI.signedPrice(a.priceChangeUsd[tf]) + " (" + UI.pct(a.priceChange[tf]) + ")" +
        ", market cap " + UI.usd(a.marketCap) + ", Canary score " + a.canaryScore + " of 80, " + a.verdict + ". Press Enter for details.";
    }

    function show(assetId) {
      var n = nodes[assetId], s = current.nodes[assetId], a = n.asset, tf = current.tf;
      tip.dataset.id = assetId;
      tip.innerHTML = '<p class="bubbles__tip-name">' + (a.logo ? UI.logo(a, "xs") : "") + UI.esc(a.name) + ' <span class="dash-muted">' + UI.esc(a.ticker) + "</span></p>" +
        '<dl class="bubbles__tip-rows">' +
          "<div><dt>Price</dt><dd>" + UI.price(a.price) + "</dd></div>" +
          "<div><dt>Change (" + UI.tfLabel(tf) + ")</dt><dd>" + UI.changeUsd(a.priceChangeUsd[tf], a.priceChange[tf], "price") + "</dd></div>" +
          "<div><dt>Market cap</dt><dd>" + UI.usd(a.marketCap) + "</dd></div>" +
          "<div><dt>24h volume</dt><dd>" + UI.usd(a.volume24h) + "</dd></div>" +
          (current.extra ? current.extra(a) : "") +
          "<div><dt>Canary score</dt><dd>" + a.canaryScore + " / 80 · " + UI.esc(a.verdict) + "</dd></div>" +
        "</dl>" +
        '<a class="bubbles__tip-open" href="' + opts.href(a) + '">Open details</a>';
      tip.hidden = false;
      // Right, left, below or above the bubble, whichever fits inside the
      // chart; failing all, the corner farthest from it. Never on top of it.
      var tw = tip.offsetWidth, th = tip.offsetHeight, gap = 10;
      var spots = [
        [s.x + s.r + gap, s.y - th / 2], [s.x - s.r - gap - tw, s.y - th / 2],
        [s.x - tw / 2, s.y + s.r + gap], [s.x - tw / 2, s.y - s.r - gap - th]
      ].map(function (p) { return [Math.max(0, Math.min(box.w - tw, p[0])), Math.max(0, Math.min(box.h - th, p[1]))]; });
      function clear(p) {
        var nx = Math.max(p[0], Math.min(s.x, p[0] + tw)), ny = Math.max(p[1], Math.min(s.y, p[1] + th));
        return (nx - s.x) * (nx - s.x) + (ny - s.y) * (ny - s.y) >= s.r * s.r;
      }
      var spot = spots.filter(clear)[0] ||
        [s.x > box.w / 2 ? 0 : box.w - tw, s.y > box.h / 2 ? 0 : box.h - th];
      tip.style.transform = "translate(" + Math.round(spot[0]) + "px," + Math.round(spot[1]) + "px)";
    }
    function hide() { tip.hidden = true; tip.dataset.id = ""; touched = null; }

    container.querySelector(".bubbles__controls").addEventListener("change", function (e) {
      var key = e.target.getAttribute("data-key");
      if (!key) return;
      values[key] = e.target.value;
      hide();
      update();
    });
    // Tapping outside the bubbles closes the tooltip.
    document.addEventListener("pointerdown", function (e) {
      if (!tip.hidden && !e.target.closest(".bubble") && !e.target.closest(".bubbles__tip")) hide();
    });

    return window.CA_DASH_API.getAssets().then(function (list) {
      assets = opts.only ? list.filter(function (a) { return opts.only.indexOf(a.id) !== -1; }) : list;
      build();
      update();
      // Transitions only after the first placement, so bubbles don't fly in.
      requestAnimationFrame(function () { requestAnimationFrame(function () { container.classList.add("is-ready"); }); });
      if ("ResizeObserver" in window) {
        var lastW = 0;
        new ResizeObserver(function () {
          if (chart.clientWidth !== lastW) { lastW = chart.clientWidth; update(); }
        }).observe(chart);
      }
      return { update: update };
    });
  }

  return {
    register: function (name, variation) { VARIATIONS[name] = variation; },
    mount: mount,
    changeColor: changeColor, verdictColor: verdictColor, directionColor: directionColor,
    verdictLegend: verdictLegend, changeLegend: changeLegend, sizeLegend: sizeLegend,
    radii: radii, logScale: logScale, linearScale: linearScale, median: median, CAPS: CAPS
  };
})();
