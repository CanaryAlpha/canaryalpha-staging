/*
 * Total crypto market cap history: the homepage hero chart. Inline SVG and
 * plain DOM; no libraries.
 *
 *   <link rel="stylesheet" href="components/market-cap-chart.css">
 *   <figure data-market-cap-chart
 *           data-src="data/total-market-cap-monthly.json"
 *           data-events="data/crypto-events.json"></figure>
 *   <script src="components/market-cap-chart.js"></script>
 *
 * Data: data/total-market-cap-monthly.json (tools/build-market-cap-data.py)
 * holds one value per month, null where no market price existed; nothing
 * here estimates or fills a missing month. data/crypto-events.json holds the
 * events, each with its source.
 *
 * On load the line draws left to right (about 30 s at 1x), pausing as it
 * enters each era. With "reduce motion" on, the whole chart shows at once
 * and the playback controls are hidden.
 *
 * Keyboard, with the chart focused: Space or K plays and pauses, Left and
 * Right step between events, Home restarts, End shows everything, L
 * switches linear/log, Escape closes an event card.
 */
(function () {
  var roots = document.querySelectorAll("[data-market-cap-chart]");
  if (!roots.length) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sheetQuery = window.matchMedia ? window.matchMedia("(max-width: 599px)") : null;

  // Timing: ~214 months x 115 ms + 3 era pauses x 1.6 s ≈ 29.4 s at 1x.
  var MONTH_MS = 115;
  var ERA_PAUSE_MS = 1600;
  var SPEEDS = [1, 2, 4];
  var LOG_FLOOR = 1e5;

  var ERA_LABELS = {
    "infancy": "Bitcoin’s infancy: no public market price",
    "btc-only": "Bitcoin only",
    "total-market": "Total crypto market"
  };
  var ERA_SHORT = { "btc-only": "BTC only", "total-market": "Total market" };
  var TYPE_LABELS = { positive: "Positive", negative: "Negative", milestone: "Milestone" };
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  /* ---- Helpers ------------------------------------------------------------ */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function svg(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ": " + r.status);
      return r.json();
    });
  }
  function parseMonth(s) {
    var p = s.split("-");
    return { y: +p[0], m: +p[1] - 1 };
  }
  function monthShort(s) { var d = parseMonth(s); return MONTHS_SHORT[d.m] + " " + d.y; }
  function monthLong(s) { var d = parseMonth(s); return MONTHS_LONG[d.m] + " " + d.y; }
  // The latest month may not have closed yet (its note says so).
  function isPartial(m) { return /^Month not closed/.test(m.note || ""); }

  // $1.23T, $612.92B, $241.28K.
  function money(v) {
    if (v == null) return "";
    var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i++) {
      if (v >= units[i][0]) return "$" + (v / units[i][0]).toFixed(2) + units[i][1];
    }
    return "$" + Math.round(v);
  }
  // Axis ticks: $0, $500B, $1T, $1.5T.
  function moneyTick(v) {
    if (v === 0) return "$0";
    var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i++) {
      if (v >= units[i][0]) return "$" + +(v / units[i][0]).toFixed(1) + units[i][1];
    }
    return "$" + v;
  }
  function pct(v) {
    var s = (v * 100).toFixed(1);
    return (v > 0 ? "+" : v < 0 ? "−" : "") + s.replace("-", "") + "%";
  }
  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url; }
  }

  // Marker shapes, so the type never relies on colour alone: positive is an
  // up-triangle, negative a down-triangle, milestone a diamond.
  function shapePath(type, x, y, r) {
    if (type === "positive") {
      return "M" + x + "," + (y - r) + "L" + (x + r) + "," + (y + r * 0.8) + "L" + (x - r) + "," + (y + r * 0.8) + "Z";
    }
    if (type === "negative") {
      return "M" + x + "," + (y + r) + "L" + (x + r) + "," + (y - r * 0.8) + "L" + (x - r) + "," + (y - r * 0.8) + "Z";
    }
    return "M" + x + "," + (y - r) + "L" + (x + r) + "," + y + "L" + x + "," + (y + r) + "L" + (x - r) + "," + y + "Z";
  }
  function shapeIcon(type, size) {
    var s = size || 12;
    var icon = svg("svg", { width: s, height: s, viewBox: "0 0 12 12", "aria-hidden": "true", focusable: "false" });
    svg("path", { d: shapePath(type, 6, 6, 5), "class": "mcc-shape mcc-shape--" + type }, icon);
    return icon;
  }
  var ICONS = {
    play: "M7 4.5v15l12-7.5z",
    pause: "M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z",
    restart: "M5 12a7 7 0 1 0 2.05-4.95M5 4.5v4h4",
    prev: "M15 5l-7 7 7 7",
    next: "M9 5l7 7-7 7",
    close: "M6 6l12 12M18 6L6 18"
  };
  function icon(name) {
    var i = svg("svg", { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false",
      "class": "mcc-icon" });
    var filled = name === "play" || name === "pause";
    svg("path", { d: ICONS[name], fill: filled ? "currentColor" : "none", stroke: filled ? "none" : "currentColor",
      "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, i);
    return i;
  }
  function button(className, label, iconName, text) {
    var b = el("button", "mcc-btn " + (className || ""));
    b.type = "button";
    if (iconName) b.appendChild(icon(iconName));
    if (text) b.appendChild(el("span", "mcc-btn__text", text));
    b.setAttribute("aria-label", label);
    return b;
  }

  /* ---- One chart -------------------------------------------------------- */

  function Chart(root, data, events) {
    var self = this;
    this.root = root;
    this.months = data.months;
    this.meta = data.meta || {};
    this.N = this.months.length;
    this.byDate = {};
    this.months.forEach(function (m, i) { self.byDate[m.date] = i; });
    var first = parseMonth(this.months[0].date);

    // Events, each placed at its month (a pre-chart event sits at the start).
    this.events = events.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
      .map(function (e) {
        var d = parseMonth(e.date);
        var idx = (d.y - first.y) * 12 + (d.m - first.m);
        return { e: e, idx: clamp(idx, 0, self.N - 1), pre: idx < 0 };
      })
      .filter(function (ev) { return ev.idx <= self.N - 1; });

    // Era starts: the line pauses as it reaches each one.
    this.eraStarts = [];
    this.months.forEach(function (m, i) {
      if (i === 0 || m.era !== self.months[i - 1].era) self.eraStarts.push(i);
    });

    this.max = 0;
    this.months.forEach(function (m) { if (m.marketCapUsd != null && m.marketCapUsd > self.max) self.max = m.marketCapUsd; });

    this.log = false;
    this.speed = 1;
    this.p = reduceMotion ? this.N - 1 : 0;
    this.playing = false;
    this.pauseLeft = 0;
    this.started = reduceMotion;
    this.card = null;       // { i, pinned }
    this.hoverIdx = null;
    this.lastEra = null;

    this.buildDom();
    this.layout();
    this.render();
    if (!reduceMotion) this.watch();
  }

  Chart.prototype.buildDom = function () {
    var self = this, root = this.root;
    root.classList.add("mcc");
    root.textContent = "";
    var first = this.months[0].date, last = this.months[this.N - 1].date;
    var firstTotal = this.months[this.eraStarts[this.eraStarts.length - 1]].date;

    var head = el("figcaption", "mcc__head");
    var title = el("p", "mcc__title", "Total crypto market cap, " + parseMonth(first).y + "–" + parseMonth(last).y);
    var sub = el("p", "mcc__sub", "Month-end, US dollars. Bitcoin only before " + monthLong(firstTotal) + ".");
    var titles = el("div", "mcc__titles");
    titles.appendChild(title);
    titles.appendChild(sub);
    this.readEra = el("p", "mcc__era");
    this.readValue = el("p", "mcc__value");
    var read = el("div", "mcc__readout");
    read.setAttribute("aria-hidden", "true");
    read.appendChild(this.readEra);
    read.appendChild(this.readValue);
    head.appendChild(titles);
    head.appendChild(read);

    // The plot: focusable, so the keyboard shortcuts work on it.
    this.plot = el("div", "mcc__plot");
    this.plot.tabIndex = 0;
    this.plot.setAttribute("role", "group");
    this.plot.setAttribute("aria-roledescription", "chart");
    this.plot.setAttribute("aria-label", "Total crypto market cap by month, " + monthShort(first) + " to " +
      monthShort(last) + ", with " + this.events.length + " events.");
    var hintId = "mcc-keys-" + Math.random().toString(36).slice(2, 8);
    this.plot.setAttribute("aria-describedby", hintId);
    this.svg = svg("svg", { "class": "mcc-svg", "aria-hidden": "true", focusable: "false" }, null);
    this.plot.appendChild(this.svg);
    this.tip = el("div", "mcc-tip");
    this.tip.setAttribute("aria-hidden", "true");
    this.tip.hidden = true;
    this.plot.appendChild(this.tip);

    // Controls.
    var controls = el("div", "mcc__controls");
    this.playBtn = button("mcc-btn--play", "Play", "play", "Play");
    this.restartBtn = button("", "Restart", "restart");
    this.scrub = el("input", "mcc__scrub");
    this.scrub.type = "range";
    this.scrub.min = 0;
    this.scrub.max = this.N - 1;
    this.scrub.step = 1;
    this.scrub.setAttribute("aria-label", "Timeline");
    var speedGroup = el("div", "mcc-seg");
    speedGroup.setAttribute("role", "group");
    speedGroup.setAttribute("aria-label", "Playback speed");
    this.speedBtns = SPEEDS.map(function (s) {
      var b = button("mcc-btn--seg", "Speed " + s + "x", null, s + "x");
      b.addEventListener("click", function () { self.setSpeed(s); });
      speedGroup.appendChild(b);
      return b;
    });
    this.prevBtn = button("", "Previous event", "prev", "Prev");
    this.nextBtn = button("", "Next event", "next", "Next");
    var eventGroup = el("div", "mcc-seg mcc-seg--plain");
    eventGroup.setAttribute("role", "group");
    eventGroup.setAttribute("aria-label", "Events");
    eventGroup.appendChild(this.prevBtn);
    eventGroup.appendChild(this.nextBtn);
    var scaleGroup = el("div", "mcc-seg");
    scaleGroup.setAttribute("role", "group");
    scaleGroup.setAttribute("aria-label", "Y-axis scale");
    this.linBtn = button("mcc-btn--seg", "Linear scale", null, "Linear");
    this.logBtn = button("mcc-btn--seg", "Log scale", null, "Log");
    scaleGroup.appendChild(this.linBtn);
    scaleGroup.appendChild(this.logBtn);

    var playback = el("div", "mcc__playback");
    playback.appendChild(this.playBtn);
    playback.appendChild(this.restartBtn);
    playback.appendChild(this.scrub);
    playback.appendChild(speedGroup);
    if (reduceMotion) {
      this.playBtn.hidden = true;
      this.restartBtn.hidden = true;
      speedGroup.hidden = true;
    }
    controls.appendChild(playback);
    var tools = el("div", "mcc__tools");
    tools.appendChild(eventGroup);
    tools.appendChild(scaleGroup);
    controls.appendChild(tools);

    // Legend: line colours, the infancy style and the three marker shapes.
    var legend = el("ul", "mcc__legend");
    legend.setAttribute("aria-label", "Legend");
    function item(swatch, text) {
      var li = el("li", "mcc__legend-item");
      li.appendChild(swatch);
      li.appendChild(el("span", null, text));
      legend.appendChild(li);
    }
    function lineSwatch(cls) {
      var s = svg("svg", { width: 22, height: 10, viewBox: "0 0 22 10", "aria-hidden": "true", focusable: "false" });
      svg("path", { d: "M1 5H21", "class": cls }, s);
      return s;
    }
    item(lineSwatch("mcc-line mcc-line--up"), "Up on the month");
    item(lineSwatch("mcc-line mcc-line--down"), "Down on the month");
    item(lineSwatch("mcc-line mcc-line--none"), ERA_LABELS.infancy);
    item(shapeIcon("positive"), "Positive event");
    item(shapeIcon("negative"), "Negative event");
    item(shapeIcon("milestone"), "Milestone");

    var keys = el("p", "mcc__keys",
      "Keyboard: Space plays or pauses, Left and Right arrows step between events, L switches the scale.");
    keys.id = hintId;

    this.live = el("p", "mcc__live");
    this.live.setAttribute("aria-live", "polite");

    // Card: a popover on wide screens, a bottom sheet on phones.
    this.cardEl = el("div", "mcc-card");
    this.cardEl.setAttribute("role", "dialog");
    this.cardEl.setAttribute("aria-modal", "false");
    this.cardEl.tabIndex = -1;
    this.cardEl.hidden = true;
    this.cardClose = button("mcc-card__close", "Close event", "close");
    this.cardType = el("p", "mcc-card__type");
    this.cardTitle = el("h3", "mcc-card__title");
    this.cardTitle.id = hintId + "-card";
    this.cardEl.setAttribute("aria-labelledby", this.cardTitle.id);
    this.cardDate = el("p", "mcc-card__date");
    this.cardSummary = el("p", "mcc-card__summary");
    this.cardCap = el("p", "mcc-card__cap");
    this.cardSource = el("a", "mcc-card__source");
    this.cardSource.target = "_blank";
    this.cardSource.rel = "noopener noreferrer";
    this.cardCount = el("p", "mcc-card__count");
    [this.cardClose, this.cardType, this.cardTitle, this.cardDate, this.cardSummary, this.cardCap,
      this.cardSource, this.cardCount].forEach(function (n) { self.cardEl.appendChild(n); });
    this.plot.appendChild(this.cardEl);

    // Data, method and sources: the chart as a table, for screen readers and
    // anyone who wants the numbers. Filled in when first opened.
    var details = el("details", "mcc__data");
    var summary = el("summary", null, "Data, method and sources");
    details.appendChild(summary);
    details.addEventListener("toggle", function () {
      if (details.open && details.children.length === 1) self.fillDetails(details);
    });

    root.appendChild(head);
    root.appendChild(this.plot);
    root.appendChild(controls);
    var foot = el("div", "mcc__foot");
    foot.appendChild(legend);
    foot.appendChild(details);
    root.appendChild(foot);
    root.appendChild(keys);
    root.appendChild(this.live);

    // Events.
    this.playBtn.addEventListener("click", function () { self.togglePlay(); });
    this.restartBtn.addEventListener("click", function () { self.restart(); });
    this.scrub.addEventListener("input", function () {
      self.pause();
      self.closeCard();
      self.p = +self.scrub.value;
      self.started = true;
      self.render();
    });
    this.prevBtn.addEventListener("click", function () { self.stepEvent(-1); });
    this.nextBtn.addEventListener("click", function () { self.stepEvent(1); });
    this.linBtn.addEventListener("click", function () { self.setLog(false); });
    this.logBtn.addEventListener("click", function () { self.setLog(true); });
    this.cardClose.addEventListener("click", function () { self.closeCard(true); });
    this.plot.addEventListener("keydown", function (e) { self.onKey(e); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && self.card) { self.closeCard(true); e.preventDefault(); }
    });
    this.svg.addEventListener("pointermove", function (e) { self.onPointer(e); });
    this.svg.addEventListener("pointerdown", function (e) { self.onPointer(e); });
    this.svg.addEventListener("pointerleave", function () { self.onLeave(); });
    this.svg.addEventListener("click", function (e) { self.onClick(e); });
    document.addEventListener("pointerdown", function (e) {
      if (self.card && self.card.pinned && !self.cardEl.contains(e.target) && !self.plot.contains(e.target) &&
          !self.root.querySelector(".mcc__controls").contains(e.target)) self.closeCard();
    });
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { self.layout(); self.render(); }).observe(this.plot);
    } else {
      window.addEventListener("resize", function () { self.layout(); self.render(); });
    }
    if (sheetQuery && sheetQuery.addEventListener) {
      sheetQuery.addEventListener("change", function () { if (self.card) self.placeCard(); });
    }
    this.setSpeed(1);
    this.setLog(false, true);
  };

  /* ---- Scales and drawing ----------------------------------------------- */

  Chart.prototype.layout = function () {
    var w = this.plot.clientWidth, h = this.plot.clientHeight;
    if (!w || !h) return;
    var narrow = w < 520;
    this.w = w;
    this.h = h;
    this.railRows = 3;
    this.rowH = narrow ? 12 : 13;
    var m = this.m = { l: narrow ? 46 : 58, r: narrow ? 8 : 14, t: 18, b: 20 + this.railRows * this.rowH + 10 };
    this.x0 = m.l;
    this.x1 = w - m.r;
    this.y0 = h - m.b;   // baseline
    this.y1 = m.t;       // top
    this.railY = this.y0 + 10 + this.rowH / 2;
    this.svg.setAttribute("width", w);
    this.svg.setAttribute("height", h);
    this.svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    this.build();
  };

  Chart.prototype.x = function (i) {
    return this.x0 + (this.x1 - this.x0) * (i / (this.N - 1));
  };
  Chart.prototype.y = function (v) {
    var h = this.y0 - this.y1;
    if (this.log) {
      var lo = Math.log10(LOG_FLOOR), hi = Math.log10(this.yMax);
      return this.y0 - h * (Math.log10(Math.max(v, LOG_FLOOR)) - lo) / (hi - lo);
    }
    return this.y0 - h * (v / this.yMax);
  };
  Chart.prototype.ticks = function () {
    if (this.log) {
      this.yMax = Math.pow(10, Math.ceil(Math.log10(this.max)));
      var out = [];
      for (var v = LOG_FLOOR; v <= this.yMax * 1.001; v *= 10) out.push(v);
      return out;
    }
    // A "nice" step giving about 5 ticks from $0.
    var raw = this.max / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = mag;
    [1, 2, 2.5, 5, 10].some(function (f) { step = f * mag; return step >= raw; });
    this.yMax = Math.ceil(this.max / step) * step;
    var t = [];
    for (var s = 0; s <= this.yMax + step / 2; s += step) t.push(s);
    return t;
  };

  // Builds every static piece for the current size and scale. The reveal
  // (how far the line has drawn) is a clip rectangle set in render().
  Chart.prototype.build = function () {
    var self = this, s = this.svg;
    while (s.firstChild) s.removeChild(s.firstChild);
    var clipId = "mcc-clip-" + (this.uid || (this.uid = Math.random().toString(36).slice(2, 8)));
    var defs = svg("defs", {}, s);
    var clip = svg("clipPath", { id: clipId }, defs);
    this.clipRect = svg("rect", { x: 0, y: 0, width: 0, height: this.h }, clip);
    var hatch = svg("pattern", { id: clipId + "-hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse",
      patternTransform: "rotate(45)" }, defs);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, "class": "mcc-hatch" }, hatch);

    // Grid and y-axis.
    var ticks = this.ticks();
    var grid = svg("g", { "class": "mcc-grid" }, s);
    ticks.forEach(function (v) {
      var y = self.y(v);
      svg("line", { x1: self.x0, x2: self.x1, y1: y, y2: y, "class": v === ticks[0] ? "is-base" : "" }, grid);
      var t = svg("text", { x: self.x0 - 8, y: y, dy: "0.32em", "text-anchor": "end", "class": "mcc-axis" }, grid);
      t.textContent = moneyTick(v);
    });

    // X-axis: years, thinned to fit.
    var firstYear = parseMonth(this.months[0].date).y, lastYear = parseMonth(this.months[this.N - 1].date).y;
    var every = this.w < 520 ? 4 : this.w < 900 ? 2 : 1;
    for (var yr = firstYear; yr <= lastYear; yr++) {
      if ((yr - firstYear) % every) continue;
      var i = this.byDate[yr + "-01"];
      if (i == null) continue;
      var tx = svg("text", { x: this.x(i), y: this.h - 4, "text-anchor": i === 0 ? "start" : "middle", "class": "mcc-axis" }, grid);
      tx.textContent = yr;
      svg("line", { x1: this.x(i), x2: this.x(i), y1: this.y0, y2: this.y0 + 4, "class": "is-base" }, grid);
    }

    var reveal = svg("g", { "clip-path": "url(#" + clipId + ")" }, s);

    // Era bands and labels. The infancy band is hatched and labelled inside.
    this.eraStarts.forEach(function (start, k) {
      var era = self.months[start].era;
      var end = k + 1 < self.eraStarts.length ? self.eraStarts[k + 1] : self.N - 1;
      var xa = start === 0 ? self.x0 : (self.x(start - 1) + self.x(start)) / 2;
      var xb = end === self.N - 1 && k + 1 >= self.eraStarts.length ? self.x1 : (self.x(end - 1) + self.x(end)) / 2;
      if (era === "infancy") {
        svg("rect", { x: xa, y: self.y1, width: xb - xa, height: self.y0 - self.y1, fill: "url(#" + clipId + "-hatch)",
          "class": "mcc-band" }, reveal);
        var label = svg("text", { "class": "mcc-band-label", "text-anchor": "end",
          transform: "translate(" + ((xa + xb) / 2) + "," + (self.y1 + 4) + ") rotate(-90)", dy: "0.32em" }, reveal);
        label.textContent = (xb - xa) > 30 ? "No public market price" : "No market price";
      } else {
        svg("line", { x1: xa, x2: xa, y1: self.y1 - 14, y2: self.y0, "class": "mcc-era-rule" }, reveal);
        var t = svg("text", { x: xa + 5, y: self.y1 - 4, "class": "mcc-era-label" }, reveal);
        t.textContent = ERA_LABELS[era];
        // Narrow screens: a shorter label, or none, so it never runs into
        // the next era's label.
        var room = (k + 1 < self.eraStarts.length ? self.x(self.eraStarts[k + 1]) : self.x1) - xa - 10;
        if (t.getComputedTextLength && t.getComputedTextLength() > room) {
          t.textContent = ERA_SHORT[era];
          if (t.getComputedTextLength() > room) t.textContent = "";
        }
      }
    });

    // The line: one path per direction. Each month-to-month segment is
    // green if the month closed higher than the one before, red if lower.
    var up = "", down = "", none = "", lastInfancy = -1;
    for (var j = 0; j < this.N; j++) {
      var cur = this.months[j];
      if (cur.era === "infancy") lastInfancy = j;
      if (!j) continue;
      var prev = this.months[j - 1];
      if (prev.marketCapUsd == null || cur.marketCapUsd == null) continue;
      var seg = "M" + this.x(j - 1).toFixed(1) + "," + this.y(prev.marketCapUsd).toFixed(1) +
        "L" + this.x(j).toFixed(1) + "," + this.y(cur.marketCapUsd).toFixed(1);
      if (cur.marketCapUsd >= prev.marketCapUsd) up += seg; else down += seg;
    }
    if (lastInfancy > 0) none = "M" + this.x0 + "," + this.y0 + "H" + this.x(lastInfancy);
    svg("path", { d: none, "class": "mcc-line mcc-line--none" }, reveal);
    svg("path", { d: up, "class": "mcc-line mcc-line--up" }, reveal);
    svg("path", { d: down, "class": "mcc-line mcc-line--down" }, reveal);

    // Hover and active guides, the drawing head.
    this.guide = svg("line", { y1: this.y1, y2: this.railY + this.rowH * this.railRows, "class": "mcc-guide" }, s);
    this.cross = svg("line", { y1: this.y1, y2: this.y0, "class": "mcc-cross" }, s);
    this.crossDot = svg("circle", { r: 4, "class": "mcc-dot" }, s);
    this.head = svg("circle", { r: 4, "class": "mcc-head" }, s);

    // Event markers on a rail under the baseline. Events close together go
    // on separate rows so none hides another.
    var rail = svg("g", { "class": "mcc-rail" }, s);
    var rowLast = [], minGap = 11;
    for (var r = 0; r < this.railRows; r++) rowLast.push(-Infinity);
    this.events.forEach(function (ev) {
      var x = self.x(ev.idx), row = -1;
      for (var k = 0; k < self.railRows; k++) if (x - rowLast[k] >= minGap) { row = k; break; }
      if (row < 0) row = rowLast.indexOf(Math.min.apply(null, rowLast));
      rowLast[row] = x;
      ev.x = x;
      ev.y = self.railY + row * self.rowH;
      ev.node = svg("path", { d: shapePath(ev.e.type, x, ev.y, 5), "class": "mcc-shape mcc-shape--" + ev.e.type }, rail);
    });
  };

  // Value at a fractional month, for the drawing head only.
  Chart.prototype.headY = function (p) {
    var i = Math.floor(p), f = p - i;
    var a = this.months[i], b = this.months[Math.min(i + 1, this.N - 1)];
    if (a.marketCapUsd == null) return a.era === "infancy" ? this.y0 : null;
    if (b.marketCapUsd == null || f === 0) return this.y(a.marketCapUsd);
    return this.y(a.marketCapUsd) + (this.y(b.marketCapUsd) - this.y(a.marketCapUsd)) * f;
  };

  Chart.prototype.render = function () {
    if (!this.w) return;
    var p = this.p, i = Math.floor(p + 1e-9), xp = this.x(p);
    this.clipRect.setAttribute("width", xp + 2);
    var hy = this.headY(p);
    var showHead = this.started && hy != null && !(p >= this.N - 1 && !this.playing);
    this.head.style.display = showHead ? "" : "none";
    if (showHead) { this.head.setAttribute("cx", xp); this.head.setAttribute("cy", hy); }
    this.events.forEach(function (ev) { ev.node.style.display = ev.idx <= i ? "" : "none"; });

    var m = this.months[i];
    this.readEra.textContent = ERA_LABELS[m.era];
    this.readEra.classList.toggle("is-entering", this.pauseLeft > 0);
    this.readValue.textContent = monthShort(m.date) + (isPartial(m) ? " (to date)" : "") + " · " +
      (m.marketCapUsd != null ? money(m.marketCapUsd) : m.era === "infancy" ? "No market price" : "No price record");
    if (+this.scrub.value !== i) this.scrub.value = i;
    this.scrub.setAttribute("aria-valuetext", monthLong(m.date) + ", " +
      (m.marketCapUsd != null ? money(m.marketCapUsd) : "no market price"));
    if (this.lastEra !== m.era) {
      if (this.lastEra !== null) this.announce(ERA_LABELS[m.era] + ", from " + monthLong(m.date) + ".");
      this.lastEra = m.era;
    }
    this.playBtn.setAttribute("aria-label", this.playing ? "Pause" : p >= this.N - 1 ? "Replay" : "Play");
    this.playBtn.querySelector(".mcc-btn__text").textContent = this.playing ? "Pause" : p >= this.N - 1 ? "Replay" : "Play";
    this.playBtn.replaceChild(icon(this.playing ? "pause" : "play"), this.playBtn.querySelector("svg"));

    var c = this.card ? this.events[this.card.i] : null;
    this.guide.style.display = c ? "" : "none";
    if (c) { this.guide.setAttribute("x1", c.x); this.guide.setAttribute("x2", c.x); }
    this.events.forEach(function (ev) { ev.node.classList.toggle("is-active", ev === c); });
    this.updateEventButtons();
  };

  Chart.prototype.announce = function (text) {
    var live = this.live;
    live.textContent = "";
    setTimeout(function () { live.textContent = text; }, 30);
  };

  /* ---- Playback ----------------------------------------------------------- */

  Chart.prototype.watch = function () {
    var self = this;
    var start = function () {
      if (self.started) return;
      self.started = true;
      self.pauseLeft = ERA_PAUSE_MS;
      self.play();
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        self.onScreen = entries[0].isIntersecting;
        if (self.onScreen) start();
      }, { threshold: 0.25 }).observe(this.plot);
    } else {
      this.onScreen = true;
      start();
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) self.kick(); });
  };

  Chart.prototype.play = function () {
    if (this.p >= this.N - 1) { this.p = 0; this.pauseLeft = ERA_PAUSE_MS; this.lastEra = null; }
    this.closeCard();
    this.playing = true;
    this.started = true;
    this.render();
    this.kick();
  };
  Chart.prototype.pause = function () {
    if (!this.playing) return;
    this.playing = false;
    this.render();
  };
  Chart.prototype.togglePlay = function () {
    if (reduceMotion) return;
    if (this.playing) this.pause(); else this.play();
  };
  Chart.prototype.restart = function () {
    this.hideTip();
    this.closeCard();
    this.p = 0;
    this.lastEra = null;
    this.pauseLeft = ERA_PAUSE_MS;
    if (reduceMotion) { this.p = this.N - 1; this.render(); return; }
    this.play();
  };
  Chart.prototype.setSpeed = function (s) {
    this.speed = s;
    var self = this;
    this.speedBtns.forEach(function (b, k) { b.setAttribute("aria-pressed", String(SPEEDS[k] === self.speed)); });
  };
  Chart.prototype.setLog = function (on, quiet) {
    this.log = on;
    this.linBtn.setAttribute("aria-pressed", String(!on));
    this.logBtn.setAttribute("aria-pressed", String(on));
    if (quiet) return;
    this.layout();
    this.render();
    if (this.card) this.placeCard();
    this.announce(on ? "Log scale." : "Linear scale from $0.");
  };

  // The clock: runs only while playing, on screen and the tab is visible.
  Chart.prototype.kick = function () {
    if (this.ticking || !this.playing) return;
    var self = this, last = null;
    this.ticking = true;
    function tick(now) {
      if (!self.playing || document.hidden || self.onScreen === false) { self.ticking = false; return; }
      var dt = last === null ? 0 : Math.min(now - last, 100) * self.speed;
      last = now;
      if (self.pauseLeft > 0) {
        self.pauseLeft = Math.max(0, self.pauseLeft - dt);
      } else {
        var before = self.p;
        self.p = Math.min(self.N - 1, self.p + dt / MONTH_MS);
        // Entering an era: stop on its first month and hold for the label.
        for (var k = 0; k < self.eraStarts.length; k++) {
          var e = self.eraStarts[k];
          if (e > 0 && before < e && self.p >= e) { self.p = e; self.pauseLeft = ERA_PAUSE_MS; break; }
        }
        if (self.p >= self.N - 1) self.playing = false;
      }
      self.render();
      if (self.playing) requestAnimationFrame(tick); else self.ticking = false;
    }
    requestAnimationFrame(tick);
  };

  /* ---- Events and cards --------------------------------------------------- */

  Chart.prototype.stepEvent = function (dir) {
    var n = this.events.length, target;
    if (!n) return;
    if (this.card) {
      target = this.card.i + dir;
    } else if (dir > 0) {
      var at = Math.floor(this.p + 1e-9);
      target = at >= this.N - 1 ? 0 : -1;
      if (target < 0) for (var k = 0; k < n; k++) if (this.events[k].idx > at) { target = k; break; }
      if (target < 0) target = 0;
    } else {
      var at2 = Math.floor(this.p + 1e-9);
      target = n - 1;
      if (at2 < this.N - 1) {
        target = -1;
        for (var j = n - 1; j >= 0; j--) if (this.events[j].idx < at2) { target = j; break; }
      }
    }
    if (target < 0 || target >= n) return;
    this.pause();
    // The line draws up to the event's month.
    this.p = this.events[target].idx;
    this.started = true;
    this.openCard(target, true, false);
  };

  Chart.prototype.updateEventButtons = function () {
    var n = this.events.length;
    if (this.card) {
      this.prevBtn.disabled = this.card.i <= 0;
      this.nextBtn.disabled = this.card.i >= n - 1;
    } else {
      this.prevBtn.disabled = !n;
      this.nextBtn.disabled = !n;
    }
  };

  Chart.prototype.openCard = function (i, pinned, fromHover) {
    this.hideTip();
    var ev = this.events[i], e = ev.e;
    this.card = { i: i, pinned: pinned };
    var d = this.cardEl;
    d.className = "mcc-card mcc-card--" + e.type;
    this.cardType.textContent = "";
    this.cardType.appendChild(shapeIcon(e.type, 11));
    this.cardType.appendChild(document.createTextNode(TYPE_LABELS[e.type] || e.type));
    this.cardTitle.textContent = e.title;
    this.cardDate.textContent = monthLong(e.date) + (ev.pre ? " (before the chart begins)" : "");
    this.cardSummary.textContent = e.summary;
    var m = this.months[ev.idx];
    if (ev.pre || m.era === "infancy") {
      this.cardCap.textContent = "No market price yet";
    } else if (m.marketCapUsd == null) {
      this.cardCap.textContent = "Traded, but no reliable price record survives for " + monthLong(m.date);
    } else {
      this.cardCap.textContent = (isPartial(m) ? "Market cap, " + monthLong(m.date) + " to date: " :
        "Market cap at end of " + monthLong(m.date) + ": ") + money(m.marketCapUsd) +
        (m.era === "btc-only" ? " (Bitcoin only)" : " (total crypto)");
    }
    this.cardSource.href = e.sourceUrl;
    this.cardSource.textContent = "Source: " + host(e.sourceUrl);
    this.cardCount.textContent = "Event " + (i + 1) + " of " + this.events.length;
    d.hidden = false;
    this.placeCard();
    this.render();
    if (!fromHover) {
      this.announce(e.title + ", " + monthLong(e.date) + ".");
      // Keyboard and click: focus moves into the card (it holds a link).
      if (pinned) d.focus({ preventScroll: true });
      if (sheetQuery && sheetQuery.matches) document.documentElement.classList.add("mcc-sheet-open");
    }
  };

  Chart.prototype.placeCard = function () {
    if (!this.card) return;
    var d = this.cardEl, ev = this.events[this.card.i];
    if (sheetQuery && sheetQuery.matches) {
      d.classList.add("is-sheet");
      d.style.left = "";
      return;
    }
    d.classList.remove("is-sheet");
    var cw = d.offsetWidth || 320;
    var left = ev.x + 14;
    if (left + cw > this.w - 4) left = ev.x - 14 - cw;
    d.style.left = clamp(left, 4, Math.max(4, this.w - cw - 4)) + "px";
  };

  Chart.prototype.closeCard = function (restoreFocus) {
    if (!this.card) return;
    var hadFocus = this.cardEl.contains(document.activeElement);
    this.card = null;
    this.cardEl.hidden = true;
    document.documentElement.classList.remove("mcc-sheet-open");
    if (restoreFocus || hadFocus) this.plot.focus({ preventScroll: true });
    this.render();
  };

  /* ---- Pointer and keyboard -------------------------------------------------- */

  Chart.prototype.point = function (e) {
    var r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  Chart.prototype.nearestEvent = function (pt) {
    var best = -1, bestD = 18, drawn = Math.floor(this.p + 1e-9);
    this.events.forEach(function (ev, k) {
      if (ev.idx > drawn) return;
      var d = Math.hypot(ev.x - pt.x, (ev.y - pt.y) * 0.6);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  };

  Chart.prototype.onPointer = function (e) {
    var pt = this.point(e);
    var onRail = pt.y > this.y0 + 4 && pt.y < this.railY + this.rowH * this.railRows;
    if (onRail) {
      this.hideTip();
      if (this.playing) return;
      var k = this.nearestEvent(pt);
      if (k >= 0 && (!this.card || (!this.card.pinned && this.card.i !== k))) this.openCard(k, false, true);
      this.svg.style.cursor = k >= 0 ? "pointer" : "";
      return;
    }
    this.svg.style.cursor = "";
    if (this.card && !this.card.pinned) this.closeCard();
    if (pt.y < this.y1 - 16 || pt.y > this.y0 + 4) { this.hideTip(); return; }
    var drawn = Math.floor(this.p + 1e-9);
    var i = Math.round(clamp((pt.x - this.x0) / (this.x1 - this.x0), 0, 1) * (this.N - 1));
    if (i > drawn) { this.hideTip(); return; }
    this.showTip(i);
  };

  Chart.prototype.showTip = function (i) {
    var m = this.months[i], x = this.x(i), tip = this.tip;
    tip.textContent = "";
    tip.appendChild(el("span", "mcc-tip__date", monthLong(m.date) + (isPartial(m) ? " (month to date)" : "")));
    if (m.marketCapUsd != null) {
      tip.appendChild(el("span", "mcc-tip__value", money(m.marketCapUsd)));
      var prev = i > 0 ? this.months[i - 1].marketCapUsd : null;
      if (prev != null) {
        var ch = m.marketCapUsd / prev - 1;
        tip.appendChild(el("span", "mcc-tip__change " + (ch >= 0 ? "is-up" : "is-down"),
          pct(ch) + " vs " + monthShort(this.months[i - 1].date)));
      } else {
        tip.appendChild(el("span", "mcc-tip__change", "First month with a price record"));
      }
      if (m.era === "btc-only") tip.appendChild(el("span", "mcc-tip__era", "Bitcoin only"));
      this.crossDot.style.display = "";
      this.crossDot.setAttribute("cx", x);
      this.crossDot.setAttribute("cy", this.y(m.marketCapUsd));
    } else {
      tip.appendChild(el("span", "mcc-tip__value",
        m.era === "infancy" ? "No market price yet" : "No reliable price record"));
      if (m.era !== "infancy") tip.appendChild(el("span", "mcc-tip__era", "Traded on BitcoinMarket.com; no archive survives"));
      this.crossDot.style.display = "none";
    }
    this.cross.style.display = "";
    this.cross.setAttribute("x1", x);
    this.cross.setAttribute("x2", x);
    tip.hidden = false;
    var tw = tip.offsetWidth;
    var left = x + 12;
    if (left + tw > this.w - 2) left = x - 12 - tw;
    tip.style.left = Math.max(2, left) + "px";
    tip.style.top = this.y1 + "px";
  };
  Chart.prototype.hideTip = function () {
    this.tip.hidden = true;
    this.cross.style.display = "none";
    this.crossDot.style.display = "none";
  };
  Chart.prototype.onLeave = function () {
    this.hideTip();
    this.svg.style.cursor = "";
    if (this.card && !this.card.pinned) this.closeCard();
  };
  Chart.prototype.onClick = function (e) {
    var pt = this.point(e);
    if (pt.y <= this.y0 + 4) return;
    var k = this.nearestEvent(pt);
    if (k < 0) return;
    this.pause();
    this.openCard(k, true, false);
  };

  Chart.prototype.onKey = function (e) {
    if (e.target !== this.plot) return;
    var k = e.key;
    if (k === " " || k === "k" || k === "K" || k === "Enter") { this.togglePlay(); }
    else if (k === "ArrowRight") { this.stepEvent(1); }
    else if (k === "ArrowLeft") { this.stepEvent(-1); }
    else if (k === "Home") { this.restart(); }
    else if (k === "End") { this.pause(); this.closeCard(); this.p = this.N - 1; this.render(); }
    else if (k === "l" || k === "L") { this.setLog(!this.log); }
    else return;
    e.preventDefault();
  };

  /* ---- The data view ----------------------------------------------------- */

  Chart.prototype.fillDetails = function (details) {
    var meta = this.meta;
    if (meta.method) details.appendChild(el("p", "mcc__method", meta.method));
    if (meta.sources) {
      details.appendChild(el("h3", null, "Market cap sources"));
      var ul = el("ul");
      meta.sources.forEach(function (s) { ul.appendChild(el("li", null, s)); });
      details.appendChild(ul);
    }
    details.appendChild(el("h3", null, "Events"));
    var ol = el("ol", "mcc__events");
    this.events.forEach(function (ev) {
      var li = el("li");
      li.appendChild(el("span", "mcc__events-date", monthShort(ev.e.date)));
      li.appendChild(document.createTextNode(" " + ev.e.title + " (" + (TYPE_LABELS[ev.e.type] || ev.e.type).toLowerCase() + "). "));
      var a = el("a", null, host(ev.e.sourceUrl));
      a.href = ev.e.sourceUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      li.appendChild(a);
      ol.appendChild(li);
    });
    details.appendChild(ol);
    details.appendChild(el("h3", null, "Monthly values"));
    var wrap = el("div", "mcc__table-wrap");
    var table = el("table", "mcc__table");
    var thead = el("thead"), tr = el("tr");
    ["Month", "Market cap", "Measure"].forEach(function (h) {
      var th = el("th", null, h); th.scope = "col"; tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el("tbody");
    this.months.forEach(function (m) {
      var row = el("tr");
      var th = el("th", null, monthShort(m.date)); th.scope = "row";
      row.appendChild(th);
      row.appendChild(el("td", "is-num", m.marketCapUsd != null ? money(m.marketCapUsd) : "—"));
      row.appendChild(el("td", null, m.era === "infancy" ? "No market price" :
        m.marketCapUsd == null ? "No surviving price record" : ERA_LABELS[m.era]));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    details.appendChild(wrap);
  };

  /* ---- Start ---------------------------------------------------------------- */

  Array.prototype.forEach.call(roots, function (root) {
    Promise.all([getJSON(root.getAttribute("data-src")), getJSON(root.getAttribute("data-events"))])
      .then(function (r) { root._mcc = new Chart(root, r[0], r[1]); })
      .catch(function () {
        root.classList.add("mcc", "mcc--error");
        root.textContent = "The market cap chart couldn’t load. Try reloading the page.";
      });
  });
})();
