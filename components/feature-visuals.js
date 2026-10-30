/*
 * Feature visuals: four small animated diagrams for the "Our process" tiles
 * (and /animations-demo). Plain DOM, inline SVG and CSS transitions; no
 * libraries, no canvas.
 *
 *   <link rel="stylesheet" href="../components/feature-visuals.css">
 *   <div class="fv" data-feature-visual="scoring"></div>
 *   <script src="../components/feature-visuals.config.js"></script>
 *   <script src="../components/feature-visuals.js"></script>
 *
 * data-feature-visual is one of: scoring, forensics, screening, revisit.
 * Every label, range, band and probability comes from
 * feature-visuals.config.js.
 *
 * Each visual plays when it scrolls into view, holds its final state, fades
 * out and replays with freshly generated results, on the config's cycle.
 * The clock only runs while the visual is on screen and the tab is visible.
 * With "reduce motion" on, one static final state shows and nothing cycles.
 *
 * Each kind has a generator (config + random -> one run's results, always
 * internally consistent), a builder that creates its markup ONCE, and an
 * update that writes a run's results into that markup. Nothing is added or
 * removed after the first build, and every changing text sits in a
 * fixed-size slot (feature-visuals.css), so a visual is the same size on
 * every frame of every run and the page around it never moves.
 */
(function () {
  var CONFIG = window.CA_FEATURE_VISUALS;
  var roots = document.querySelectorAll("[data-feature-visual]");
  if (!CONFIG || !roots.length) return;
  var CYCLE = CONFIG.cycle;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var MINUS = "−";
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  // Icons: Lucide (https://lucide.dev, ISC licence), 24x24 grid, currentColor.
  var ICON_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">';
  var ICONS = {
    check: ICON_OPEN + '<path d="M20 6 9 17l-5-5"/></svg>',
    flag: ICON_OPEN + '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2' +
      'q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2' +
      'a6 6 0 0 0-4 1.528"/></svg>',
    up: ICON_OPEN + '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
    down: ICON_OPEN + '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>'
  };

  // When each visual's last step ends at normal speed, in seconds: that
  // step's delay and duration in feature-visuals.css. Used to stretch the
  // choreography over the cycle (see pace()).
  var LAST_STEP = {
    scoring: { delay: 2.3, duration: 0.6 },
    forensics: { delay: 2.7, duration: 0.6 },
    screening: { delay: 2.6, duration: 0.6 },
    revisit: { delay: 2.44, duration: 0.6 }
  };

  /* ---- Helpers --------------------------------------------------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Adds an "Explain this" icon after a label when the page loads the
  // education layer (components/learn/explain.js). The label text moves into
  // its own span so it can still truncate while the icon stays whole.
  function withExplain(node, id) {
    var html = id && window.CA_EXPLAIN ? window.CA_EXPLAIN.icon(id) : "";
    if (!html) return node;
    var text = el("span", "fv-label-text", node.textContent);
    node.textContent = "";
    node.appendChild(text);
    node.insertAdjacentHTML("beforeend", html);
    node.classList.add("has-explain");
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  function sum(list, key) {
    return list.reduce(function (total, item) { return total + item[key]; }, 0);
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function round(value, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(value * f) / f;
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (m, key) { return values[key]; });
  }

  // Seeded random (mulberry32): the same seed always gives the same
  // sequence, so the first run is identical on every load.
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function between(rng, min, max) { return min + rng() * (max - min); }
  function intBetween(rng, min, max) { return Math.floor(between(rng, min, max + 1)); }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  // Index picked with the given relative odds.
  function pickWeighted(rng, odds) {
    var r = rng() * odds.reduce(function (a, b) { return a + b; }, 0);
    for (var i = 0; i < odds.length; i++) {
      r -= odds[i];
      if (r < 0) return i;
    }
    return odds.length - 1;
  }
  function shuffled(rng, list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // Score bands (the verdicts), highest first, and the rank (0 = best) a
  // score falls in. Shared by the scoring badge and the update cards.
  var BANDS = CONFIG.scoring.bands.slice().sort(function (a, b) { return b.min - a.min; });
  function bandRank(score) {
    for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) return i;
    return BANDS.length - 1;
  }

  function signed(value, decimals, prefix, suffix) {
    return (value < 0 ? MINUS : "+") + (prefix || "") +
      Math.abs(value).toFixed(decimals) + (suffix || "");
  }

  // Counts a number up from 0 over `ms`, after `delay` (both in ms). A newer
  // count on the same node stops an older one.
  function countUp(node, to, ms, delay) {
    var id = node._count = (node._count || 0) + 1;
    var start = null;
    function frame(now) {
      if (node._count !== id) return;
      if (start === null) start = now + delay;
      var t = clamp((now - start) / ms, 0, 1);
      node.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function stopCount(node) { node._count = (node._count || 0) + 1; }

  /* ---- 1. 80-point scoring framework ---------------------------------- */
  var scoring = {
    generate: function (cfg, rng) {
      var categories = cfg.categories.map(function (c) {
        // The mean of three randoms clusters around the middle, so totals
        // land mid-range and extremes are rare.
        var mid = (rng() + rng() + rng()) / 3;
        var share = clamp(cfg.center + (mid - 0.5) * cfg.spread, cfg.floor, 1);
        return Math.round(share * c.weight);
      });
      var total = categories.reduce(function (a, b) { return a + b; }, 0);
      return { scores: categories, total: total, band: bandRank(total) };
    },

    build: function (stage, cfg) {
      var max = sum(cfg.categories, "weight");
      var head = el("div", "fv-score__head");
      head.appendChild(el("span", "fv-eyebrow", cfg.caption));
      head.appendChild(el("span", "fv-score__asset", cfg.asset));

      var list = el("ol", "fv-score__list");
      var cols = el("li", "fv-score__cols");
      cols.appendChild(el("span", null, "Category"));
      cols.appendChild(el("span", null, "Score / weight"));
      list.appendChild(cols);
      var rows = cfg.categories.map(function (c, i) {
        var row = el("li", "fv-score__row");
        row.style.setProperty("--i", i);
        row.appendChild(withExplain(el("span", "fv-score__name", c.name), c.explain));
        var value = el("span", "fv-score__value");
        var got = el("span", "fv-score__got");
        value.appendChild(got);
        value.appendChild(document.createTextNode(" / " + c.weight));
        row.appendChild(value);
        var track = el("span", "fv-score__track");
        track.appendChild(el("span", "fv-score__fill"));
        row.appendChild(track);
        list.appendChild(row);
        return { row: row, got: got };
      });

      var summary = el("div", "fv-score__summary");
      var totalBox = el("div", "fv-score__total");
      var num = el("span", "fv-score__num");
      totalBox.appendChild(num);
      totalBox.appendChild(el("span", "fv-score__max", "/ " + max));
      summary.appendChild(el("span", "fv-eyebrow", "Total"));
      summary.appendChild(totalBox);
      var verdict = el("div", "fv-score__verdict");
      verdict.appendChild(el("span", "fv-eyebrow", cfg.verdictLabel));
      // Every verdict sits in the badge, stacked; only the current one
      // shows, so the badge is always as wide as the longest.
      var badge = el("span", "fv-badge");
      var labels = BANDS.map(function (b) { return badge.appendChild(el("span", null, b.label)); });
      verdict.appendChild(badge);
      summary.appendChild(verdict);

      var main = el("div", "fv-score");
      main.appendChild(list);
      main.appendChild(summary);
      stage.appendChild(head);
      stage.appendChild(main);

      var data = null;
      return {
        update: function (d) {
          data = d;
          d.scores.forEach(function (score, i) {
            rows[i].row.style.setProperty("--fill", score / cfg.categories[i].weight);
            rows[i].got.textContent = score;
          });
          stopCount(num);
          num.textContent = d.total;
          labels.forEach(function (l, i) { l.classList.toggle("is-shown", i === d.band); });
          return cfg.asset + " scores " + d.total + " out of " + max + " across " +
            cfg.categories.length + " weighted categories: " +
            cfg.categories.map(function (c, i) { return c.name + " " + d.scores[i] + " of " + c.weight; })
              .join(", ") + ". " + cfg.verdictLabel + ": " + BANDS[d.band].label + ".";
        },
        arm: function () { stopCount(num); num.textContent = "0"; },
        // Counts while the bars fill: the first starts at 0.2 s, the last
        // (5 x 0.22 s later) takes 0.9 s, all scaled like the CSS.
        play: function (pace) {
          var start = 200 * pace.delay;
          var end = (0.2 + 5 * 0.22) * 1000 * pace.delay + 900 * pace.duration;
          countUp(num, data.total, end - start, start);
        }
      };
    }
  };

  /* ---- 2. On-chain forensics ------------------------------------------ */
  var forensics = {
    generate: function (cfg, rng) {
      return {
        path: pick(rng, cfg.suspects),
        amount: between(rng, cfg.amount.min, cfg.amount.max).toFixed(1) + "M",
        hours: pick(rng, cfg.hours),
        intensity: cfg.flows.map(function () {
          return round(between(rng, cfg.intensity.min, cfg.intensity.max), 2);
        })
      };
    },

    build: function (stage, cfg) {
      var byId = {};
      cfg.nodes.forEach(function (n) { byId[n.id] = n; });

      var graph = el("div", "fv-graph");
      var lines = svg("svg", { "class": "fv-graph__lines", "aria-hidden": "true" });
      graph.appendChild(lines);

      var flows = cfg.flows.map(function (f, i) {
        var g = svg("g", { "class": "fv-flow" });
        g.style.setProperty("--i", i);
        var base = svg("path", { "class": "fv-flow__base", pathLength: "1" });
        var moving = svg("path", { "class": "fv-flow__dash" });
        g.appendChild(base);
        g.appendChild(moving);
        lines.appendChild(g);
        return { flow: f, g: g, base: base, moving: moving };
      });

      var nodes = cfg.nodes.map(function (n, i) {
        var node = el("div", "fv-node fv-node--" + n.kind);
        if (n.x < 25) node.className += " fv-node--start";
        else if (n.x > 75) node.className += " fv-node--end";
        node.style.left = n.x + "%";
        node.style.top = n.y + "%";
        node.style.setProperty("--i", i);
        node.appendChild(el("span", "fv-node__mark"));
        node.appendChild(el("span", "fv-node__label", n.label));
        graph.appendChild(node);
        return { id: n.id, node: node };
      });

      // Curves are drawn in pixels, so redraw them when the graph resizes.
      function layout() {
        var w = graph.clientWidth, h = graph.clientHeight;
        if (!w || !h) return;
        lines.setAttribute("viewBox", "0 0 " + w + " " + h);
        flows.forEach(function (p) {
          var a = byId[p.flow.from], b = byId[p.flow.to];
          var x1 = a.x / 100 * w, y1 = a.y / 100 * h;
          var x2 = b.x / 100 * w, y2 = b.y / 100 * h;
          var bend = (x2 - x1) * 0.5;
          var d = "M" + x1 + " " + y1 + " C" + (x1 + bend) + " " + y1 + " " +
            (x2 - bend) + " " + y2 + " " + x2 + " " + y2;
          p.base.setAttribute("d", d);
          p.moving.setAttribute("d", d);
        });
      }
      if ("ResizeObserver" in window) new ResizeObserver(layout).observe(graph);
      else window.addEventListener("resize", layout);

      var note = el("div", "fv-note");
      note.appendChild(el("span", "fv-note__title", cfg.annotation.title));
      var noteText = el("span", "fv-note__text");
      note.appendChild(noteText);

      var legend = el("div", "fv-legend");
      legend.setAttribute("aria-hidden", "true");
      legend.appendChild(el("span", "fv-legend__item fv-legend__item--flow", cfg.legend.flow));
      legend.appendChild(el("span", "fv-legend__item fv-legend__item--flagged", cfg.legend.flagged));

      stage.appendChild(graph);
      stage.appendChild(legend);
      stage.appendChild(note);
      layout();

      var summary = "Wallet graph: token flows from " +
        cfg.nodes.filter(function (n) { return n.kind !== "exchange"; })
          .map(function (n) { return n.label; }).join(", ") +
        " towards " + cfg.nodes.filter(function (n) { return n.kind === "exchange"; })
          .map(function (n) { return n.label; }).join(" and ") + ". ";

      return {
        update: function (d) {
          flows.forEach(function (p, i) {
            var at = d.path.indexOf(p.flow.from);
            p.g.classList.toggle("fv-flow--flagged", at !== -1 && d.path[at + 1] === p.flow.to);
            p.g.style.setProperty("--k", d.intensity[i]);
          });
          nodes.forEach(function (n) {
            n.node.classList.toggle("fv-node--flagged", d.path.indexOf(n.id) !== -1);
          });
          var text = fill(cfg.annotation.text, {
            path: d.path.map(function (id) { return byId[id].label; }).join(" → "),
            amount: d.amount,
            hours: d.hours
          });
          noteText.textContent = text;
          noteText.title = text;
          return summary + cfg.annotation.title + ": " + text;
        }
      };
    }
  };

  /* ---- 3. Scam screening ---------------------------------------------- */
  var screening = {
    generate: function (cfg, rng) {
      var count = pickWeighted(rng, cfg.flagOdds);
      var order = shuffled(rng, cfg.checks.map(function (c, i) { return i; }));
      var flags = cfg.checks.map(function () { return false; });
      order.slice(0, count).forEach(function (i) { flags[i] = true; });
      var sell = cfg.checks.some(function (c, i) { return c.chart && flags[i]; });

      // Price always drifts up. Sell volume climbs with it when the
      // sell-pressure check trips; otherwise it stays low and flat.
      var price = [], volume = [];
      var p = between(rng, 38, 46);
      var v = between(rng, 8, 12);
      for (var i = 0; i < cfg.chart.points; i++) {
        p += i ? between(rng, -1.5, 3.6) : 0;
        price.push(round(p, 1));
        var vol = sell
          ? v + i * between(rng, 2.3, 2.9) + between(rng, -2, 2)
          : v + between(rng, -3, 4) - i * 0.15;
        volume.push(round(clamp(vol, 3, cfg.chart.volumeMax), 1));
      }
      return { flags: flags, count: count, sell: sell, price: price, volume: volume };
    },

    build: function (stage, cfg) {
      var list = el("ul", "fv-checks");
      var items = cfg.checks.map(function (c, i) {
        var item = el("li", "fv-check fv-check--pass");
        item.style.setProperty("--i", i);
        var icon = el("span", "fv-check__icon");
        // Both result icons are always there; the row's state shows one.
        icon.innerHTML = '<span class="fv-check__pending"></span>' +
          '<span class="fv-check__result fv-check__result--pass">' + ICONS.check + "</span>" +
          '<span class="fv-check__result fv-check__result--flag">' + ICONS.flag + "</span>";
        item.appendChild(icon);
        item.appendChild(withExplain(el("span", "fv-check__label", c.label), c.explain));
        var note = el("span", "fv-check__note");
        item.appendChild(note);
        list.appendChild(item);
        return { item: item, note: note };
      });

      var checks = el("div", "fv-screen__checks");
      checks.appendChild(list);
      var summary = el("p", "fv-screen__summary");
      checks.appendChild(summary);

      // Chart: sell-volume bars with the price line drawn over them.
      var ch = cfg.chart;
      var n = ch.points;
      var W = 240, H = 120, gap = 4, barW = (W - gap * (n - 1)) / n;

      var figure = el("figure", "fv-chart");
      var cap = el("figcaption", "fv-chart__head");
      cap.appendChild(el("span", "fv-eyebrow", ch.title));
      var key = el("span", "fv-chart__key");
      key.appendChild(el("span", "fv-chart__key-price", ch.priceLabel));
      key.appendChild(el("span", "fv-chart__key-volume", ch.volumeLabel));
      cap.appendChild(key);
      figure.appendChild(cap);

      var plot = el("div", "fv-chart__plot");
      var barsSvg = svg("svg", { "class": "fv-chart__bars", viewBox: "0 0 " + W + " " + H,
        preserveAspectRatio: "none", "aria-hidden": "true" });
      var bars = [];
      for (var i = 0; i < n; i++) {
        var bar = svg("rect", { x: i * (barW + gap), width: barW });
        bar.style.setProperty("--i", i);
        barsSvg.appendChild(bar);
        bars.push(bar);
      }
      var lineSvg = svg("svg", { "class": "fv-chart__line", viewBox: "0 0 " + W + " " + H,
        preserveAspectRatio: "none", "aria-hidden": "true" });
      var line = lineSvg.appendChild(svg("path", {}));
      plot.appendChild(barsSvg);
      plot.appendChild(lineSvg);
      figure.appendChild(plot);

      var wrap = el("div", "fv-screen");
      wrap.appendChild(checks);
      wrap.appendChild(figure);
      stage.appendChild(wrap);

      return {
        update: function (d) {
          items.forEach(function (it, i) {
            var c = cfg.checks[i];
            it.item.classList.toggle("fv-check--flag", d.flags[i]);
            it.item.classList.toggle("fv-check--pass", !d.flags[i]);
            it.note.textContent = d.flags[i] ? c.flag : c.pass;
            it.note.title = it.note.textContent;
          });
          var text = d.count === 0 ? cfg.summary.none :
            d.count === 1 ? cfg.summary.one : fill(cfg.summary.many, { n: d.count });
          summary.textContent = text;
          summary.classList.toggle("fv-screen__summary--flag", d.count > 0);

          d.volume.forEach(function (v, i) {
            // Volume uses the lower 45% of the plot, under the price line.
            var h = v / ch.volumeMax * H * 0.45;
            bars[i].setAttribute("y", (H - h).toFixed(1));
            bars[i].setAttribute("height", h.toFixed(1));
          });
          var pMin = Math.min.apply(null, d.price), pMax = Math.max.apply(null, d.price);
          line.setAttribute("d", "M" + d.price.map(function (p, i) {
            var x = i * (barW + gap) + barW / 2;
            // Price sits in the upper part of the plot.
            var y = H * 0.08 + (1 - (p - pMin) / (pMax - pMin || 1)) * H * 0.42;
            return x.toFixed(1) + " " + y.toFixed(1);
          }).join(" L"));

          return "Six-point red-flag check: " + cfg.checks.map(function (c, i) {
            return c.label + " " + (d.flags[i] ? "red flag (" + c.flag + ")" : "pass");
          }).join(", ") + ". " + text + ". Chart: " + ch.priceLabel.toLowerCase() +
            " rises while " + ch.volumeLabel.toLowerCase() +
            (d.sell ? " grows underneath." : " stays low.");
        }
      };
    }
  };

  /* ---- 4. Built to revisit -------------------------------------------- */
  var revisit = {
    // `last` is the previous run's results: its update becomes this run's
    // previous report, so quarters and values carry on from run to run.
    generate: function (cfg, rng, last) {
      var before = last ? last.current : {
        q: cfg.start.quarter,
        year: cfg.start.year,
        score: cfg.score.start,
        metrics: cfg.metrics.map(function (m) { return m.start; })
      };
      function shift(q, year, by) {
        var n = year * 4 + (q - 1) + by;
        return { q: n % 4 + 1, year: Math.floor(n / 4) };
      }
      var next = shift(before.q, before.year, 1);

      // At least one thing changes, or it isn't much of an update.
      var score, metrics, changed, tries = 0;
      do {
        // A random change, plus a nudge back toward the start value.
        var change = clamp(
          intBetween(rng, cfg.score.change.min, cfg.score.change.max) +
            Math.round((cfg.score.start - before.score) * cfg.pull),
          cfg.score.change.min, cfg.score.change.max);
        score = clamp(before.score + change, cfg.score.min, cfg.score.max);
        metrics = cfg.metrics.map(function (m, i) {
          if (rng() >= m.chance) return before.metrics[i];
          var amount = between(rng, m.change.min, m.change.max) * (rng() < 0.5 ? -1 : 1) +
            (m.start - before.metrics[i]) * cfg.pull;
          return round(clamp(before.metrics[i] + amount, m.min, m.max), m.decimals);
        });
        changed = score !== before.score || metrics.some(function (v, i) {
          return v !== before.metrics[i];
        });
      } while (!changed && ++tries < 20);

      var quarters = [];
      for (var i = -2; i <= 2; i++) {
        var s = shift(before.q, before.year, i);
        quarters.push(fill(cfg.quarterFormat, { q: s.q, year: s.year }));
      }
      return {
        before: before,
        current: { q: next.q, year: next.year, score: score, metrics: metrics },
        quarters: quarters // the previous report is quarters[2], the update quarters[3]
      };
    },

    build: function (stage, cfg) {
      var names = [cfg.score.name, cfg.verdictName].concat(cfg.metrics.map(function (m) { return m.name; }));

      function card(which) {
        var current = which === "current";
        var box = el("article", "fv-card fv-card--" + which);
        var head = el("header", "fv-card__head");
        head.appendChild(el("span", "fv-eyebrow", current ? cfg.currentLabel : cfg.previousLabel));
        var quarter = head.appendChild(el("span", "fv-card__quarter"));
        box.appendChild(head);
        box.appendChild(el("p", "fv-card__asset", cfg.asset));
        var list = el("dl", "fv-card__rows");
        var rows = names.map(function (name, i) {
          var row = el("div", "fv-card__row");
          row.style.setProperty("--i", i);
          row.appendChild(el("dt", null, name));
          var dd = el("dd");
          var value = dd.appendChild(el("span", "fv-card__value"));
          // Every row has a delta slot; unchanged rows just hide it.
          var delta = current ? dd.appendChild(el("span", "fv-delta")) : null;
          row.appendChild(dd);
          list.appendChild(row);
          return { row: row, value: value, delta: delta };
        });
        box.appendChild(list);
        return { box: box, quarter: quarter, rows: rows };
      }

      var stack = el("div", "fv-stack");
      var prev = card("previous"), cur = card("current");
      stack.appendChild(prev.box);
      stack.appendChild(cur.box);

      var from = 2, to = 3, last = 4;
      var timeline = el("div", "fv-timeline");
      timeline.style.setProperty("--from", from / last);
      timeline.style.setProperty("--to", to / last);
      timeline.appendChild(el("span", "fv-timeline__track"));
      timeline.appendChild(el("span", "fv-timeline__fill"));
      var steps = el("ol", "fv-timeline__steps");
      var stepLabels = [];
      for (var i = 0; i <= last; i++) {
        var step = el("li", "fv-timeline__step" +
          (i < to ? " is-past" : i === to ? " is-current" : " is-future") +
          (i === from ? " is-previous" : ""));
        if (i === 0) step.className += " fv-timeline__step--first";
        if (i === last) step.className += " fv-timeline__step--last";
        step.style.left = (i / last * 100) + "%";
        step.appendChild(el("span", "fv-timeline__dot"));
        stepLabels.push(step.appendChild(el("span", "fv-timeline__label")));
        steps.appendChild(step);
      }
      timeline.appendChild(steps);
      var marker = el("span", "fv-timeline__marker");
      marker.appendChild(el("span", "fv-timeline__ring"));
      timeline.appendChild(marker);

      stage.appendChild(stack);
      stage.appendChild(timeline);

      return {
        update: function (d) {
          var b = d.before, c = d.current;
          var max = sum(CONFIG.scoring.categories, "weight");
          var rankBefore = bandRank(b.score), rankAfter = bandRank(c.score);
          // One entry per row: before and after values, and the change.
          var values = [{
            before: b.score + " / " + max,
            after: c.score + " / " + max,
            delta: c.score === b.score ? "" : signed(c.score - b.score, 0),
            up: c.score > b.score
          }, {
            before: BANDS[rankBefore].label,
            after: BANDS[rankAfter].label,
            delta: rankAfter === rankBefore ? "" : rankAfter < rankBefore ? cfg.upgraded : cfg.downgraded,
            up: rankAfter < rankBefore
          }].concat(cfg.metrics.map(function (m, i) {
            function format(v) { return m.prefix + v.toFixed(m.decimals) + m.suffix; }
            var diff = round(c.metrics[i] - b.metrics[i], m.decimals);
            return {
              before: format(b.metrics[i]),
              after: format(c.metrics[i]),
              delta: diff === 0 ? "" : signed(diff, m.decimals, m.prefix, m.suffix),
              up: diff > 0
            };
          }));

          prev.quarter.textContent = d.quarters[2];
          cur.quarter.textContent = d.quarters[3];
          values.forEach(function (v, i) {
            prev.rows[i].value.textContent = v.before;
            var row = cur.rows[i];
            row.value.textContent = v.after;
            // Arrow and colour both follow the sign: up green, down red.
            row.row.classList.toggle("fv-card__row--good", v.delta !== "" && v.up);
            row.row.classList.toggle("fv-card__row--bad", v.delta !== "" && !v.up);
            row.delta.classList.toggle("is-none", v.delta === "");
            row.delta.innerHTML = v.delta === "" ? "" : v.up ? ICONS.up : ICONS.down;
            row.delta.appendChild(document.createTextNode(v.delta || " "));
          });
          d.quarters.forEach(function (q, i) { stepLabels[i].textContent = q; });

          return d.quarters[3] + " update to the " + d.quarters[2] + " report on " + cfg.asset + ": " +
            names.map(function (name, i) {
              var v = values[i];
              return name + " " + (v.delta ? v.before + " to " + v.after + " (" + v.delta + ")" :
                "unchanged at " + v.after);
            }).join(", ") + ".";
        }
      };
    }
  };

  var KINDS = { scoring: scoring, forensics: forensics, screening: screening, revisit: revisit };

  /* ---- Runs and the cycle --------------------------------------------- */

  // How much to slow the CSS choreography so it fills the cycle's
  // animating time: each movement slows by up to maxSlowdown, and the
  // spacing between movements takes up the rest.
  function pace(name) {
    var animate = (CYCLE.length - CYCLE.hold - CYCLE.reset) / 1000;
    var last = LAST_STEP[name];
    var duration = clamp(animate / (last.delay + last.duration), 1, CYCLE.maxSlowdown);
    var delay = Math.max(1, (animate - last.duration * duration) / last.delay);
    return { delay: round(delay, 3), duration: round(duration, 3) };
  }

  // Generates a run's results and writes them into the visual's markup.
  function render(v) {
    var data, tries = 0;
    // Never the same result twice in a row.
    do {
      data = v.kind.generate(v.cfg, v.rng, v.data);
    } while (v.data && JSON.stringify(data) === JSON.stringify(v.data) && ++tries < 20);
    v.data = data;
    v.root.setAttribute("aria-label", v.run.update(data));
  }

  var visuals = [];
  Array.prototype.forEach.call(roots, function (root, index) {
    var name = root.getAttribute("data-feature-visual");
    if (!KINDS[name] || !CONFIG[name]) return;
    root.classList.add("fv", "fv--" + name);
    root.setAttribute("role", "img");
    var stage = el("div", "fv__stage");
    root.appendChild(stage);
    var v = {
      root: root,
      kind: KINDS[name],
      cfg: CONFIG[name],
      // The same seed on every load, so the first run never varies.
      rng: seeded(CYCLE.seed + index * 7919),
      reseeded: false,
      data: null,
      run: KINDS[name].build(stage, CONFIG[name]),
      pace: pace(name),
      offset: index * CYCLE.stagger,
      visible: false,
      t: 0,
      phase: "waiting"
    };
    // With "Explain this" icons inside, the visual is a labelled group (an
    // image can't hold buttons); its label still sums up the current run.
    if (stage.querySelector(".explain")) root.setAttribute("role", "group");
    render(v);
    visuals.push(v);
  });

  // Reduced motion (or no IntersectionObserver): the first run's final
  // state, built above, is all there is.
  if (reduceMotion || !canObserve) return;

  function play(v) {
    v.root.classList.add("is-on");
    if (v.run.play) v.run.play(v.pace);
  }

  // Moves one visual's clock on by dt ms. Phases: waiting (first-run
  // stagger) -> running (animate, then hold) -> resetting (fade out) ->
  // starting (new results written while hidden, fading in) -> running ...
  function advance(v, dt) {
    v.t += dt;
    if (v.phase === "waiting" && v.t >= v.offset) {
      v.phase = "running";
      v.t = 0;
      play(v);
    } else if (v.phase === "starting") {
      // The new run's start state is on screen; now let it play.
      v.phase = "running";
      play(v);
    } else if (v.phase === "running" && v.t >= CYCLE.length - CYCLE.reset) {
      v.phase = "resetting";
      v.root.classList.add("is-resetting");
    } else if (v.phase === "resetting" && v.t >= CYCLE.length) {
      // Faded out: back to the start state with fresh results, fade back in.
      // Replays reseed from the clock, so they differ from load to load.
      if (!v.reseeded) {
        v.rng = seeded((Date.now() ^ CYCLE.seed) + v.offset);
        v.reseeded = true;
      }
      v.root.classList.add("is-rewinding"); // jump to the start state, no transitions
      v.root.classList.remove("is-on");
      render(v);
      if (v.run.arm) v.run.arm();
      void v.root.offsetWidth; // apply the start state before transitions return
      v.root.classList.remove("is-rewinding", "is-resetting");
      v.phase = "starting";
      v.t = 0;
    }
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

  // A visual counts as on screen once it is a little way into the viewport.
  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target._fv;
      v.visible = entry.isIntersecting;
      entry.target.classList.toggle("is-offscreen", !v.visible);
    });
    startTicking();
  }, { rootMargin: "0px 0px -15% 0px" });

  // The clock stops while the tab is hidden; this restarts it.
  document.addEventListener("visibilitychange", startTicking);

  visuals.forEach(function (v) {
    v.root._fv = v;
    v.root.style.setProperty("--fv-d", v.pace.delay);
    v.root.style.setProperty("--fv-s", v.pace.duration);
    v.root.style.setProperty("--fv-reset", CYCLE.reset + "ms");
    if (v.run.arm) v.run.arm();
    v.root.classList.add("is-armed");
    watcher.observe(v.root);
  });
})();
