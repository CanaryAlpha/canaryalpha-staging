/*
 * Dashboard building blocks shared by every dashboard page: number
 * formatting, change labels (sign + arrow + colour, so colour is never the
 * only cue), the 7-day sparkline, the Fear & Greed gauge, the ETF flow
 * panel and the asset logo. Inline SVG and plain DOM; no libraries.
 * Styles: components/dashboard/dashboard.css.
 */
window.CA_DASH_UI = (function () {
  var MINUS = "−";

  // Timeframes: key in the data, label shown.
  var TIMEFRAMES = [
    { key: "h1", label: "1h" }, { key: "h24", label: "24h" }, { key: "d7", label: "7d" },
    { key: "d30", label: "30d" }, { key: "d90", label: "90d" }, { key: "y1", label: "1y" }
  ];
  function tfLabel(key) {
    for (var i = 0; i < TIMEFRAMES.length; i++) if (TIMEFRAMES[i].key === key) return TIMEFRAMES[i].label;
    return key;
  }

  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Education layer hooks (components/learn/): an "Explain this" icon and a
  // Simple-mode summary line. Both are empty when the layer isn't loaded.
  function explain(id, label) { return window.CA_EXPLAIN ? window.CA_EXPLAIN.icon(id, label) : ""; }
  function summary(key, vars, caseKey) { return window.CA_LEARN ? window.CA_LEARN.summary(key, vars, caseKey) : ""; }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* ---- Numbers ----------------------------------------------------------- */
  function group(value, decimals) {
    return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  // The one money formatter for prices and price changes:
  // $98,420.00, $4.82, $0.3874, $0.0612, $0.0042, $0.000088. Under $1 it
  // shows at least 4 decimals and always 2 significant figures, so tiny
  // prices and tiny changes still mean something.
  function price(v) {
    var a = Math.abs(v), s = v < 0 ? MINUS : "";
    if (a === 0) return "$0.00";
    if (a >= 0.99995) return s + "$" + group(a, 2);
    var d = Math.max(4, 1 - Math.floor(Math.log10(a)));
    return s + "$" + a.toFixed(d);
  }
  function signedPrice(v) { return (v > 0 ? "+" : "") + price(v); }
  // $1.96T, $436.02B, $640.0M
  function usd(v) {
    var a = Math.abs(v), s = v < 0 ? MINUS : "";
    if (a >= 1e12) return s + "$" + (a / 1e12).toFixed(2) + "T";
    if (a >= 1e9) return s + "$" + (a / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(1) + "K";
    return s + "$" + a.toFixed(0);
  }
  // Axis ticks: $300B, $1T, $30M (no trailing zeros).
  function usdShort(v) { return usd(v).replace(/\.0+(?=[TBMK])/, "").replace(/(\.\d*?)0+(?=[TBMK])/, "$1"); }
  function signedUsd(v) { return (v > 0 ? "+" : "") + usd(v); }
  function pct(v, decimals) {
    var d = decimals == null ? 2 : decimals;
    return (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(d) + "%";
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function date(iso) {
    var p = iso.slice(0, 10).split("-");
    return +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0];
  }
  function dateTime(iso) {
    var d = new Date(iso);
    return date(iso) + ", " + String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " UTC";
  }
  function direction(v) { return v > 0 ? "up" : v < 0 ? "down" : "flat"; }

  // "+3.62%" with an arrow, coloured by direction. The sign and arrow carry
  // the meaning for anyone who can't see the colour.
  function change(v, opts) {
    var o = opts || {};
    var dir = direction(v);
    var arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
    return '<span class="dash-change dash-change--' + dir + (o.big ? " dash-change--big" : "") + '">' +
      '<span class="dash-change__arrow" aria-hidden="true">' + arrow + "</span>" + pct(v, o.decimals) + "</span>";
  }

  // Dollar and % change together: "▼ −$1,284.50 (−1.87%)". kind "price"
  // shows dollars and cents; "compact" (market cap, volume) shows $2.31B.
  // opts.stack puts the dollar on top and the % below in smaller text
  // (list view); opts.big for the card headline.
  function changeUsd(usdValue, pctValue, kind, opts) {
    var o = opts || {};
    var dir = direction(pctValue);
    var arrow = '<span class="dash-change__arrow" aria-hidden="true">' + (dir === "up" ? "▲" : dir === "down" ? "▼" : "–") + "</span>";
    var money = kind === "compact" ? signedUsd(usdValue) : signedPrice(usdValue);
    var cls = "dash-change dash-change--usd dash-change--" + dir + (o.big ? " dash-change--big" : "") + (o.stack ? " dash-change--stack" : "");
    if (o.stack) {
      return '<span class="' + cls + '"><span class="dash-change__usd">' + arrow + money + "</span>" +
        '<span class="dash-change__pct">' + arrow + pct(pctValue, o.decimals) + "</span></span>";
    }
    return '<span class="' + cls + '">' + arrow + money + ' <span class="dash-change__pct">(' + pct(pctValue, o.decimals) + ")</span></span>";
  }

  /* ---- Charts ------------------------------------------------------------ */
  // 7-day sparkline: fixed size, coloured by the week's direction.
  function sparkline(values, w, h) {
    var W = w || 120, H = h || 36, min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      return (i / (values.length - 1) * W).toFixed(1) + "," + (H - 2 - (v - min) / span * (H - 4)).toFixed(1);
    }).join(" ");
    var dir = direction(values[values.length - 1] - values[0]);
    return '<svg class="dash-spark dash-spark--' + dir + '" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H +
      '" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline points="' + pts + '"/></svg>';
  }

  // Fear & Greed: semicircle gauge with five bands and a needle.
  function gauge(fg) {
    var cx = 100, cy = 96, R = 80, w = 16;
    function polar(value, radius) {
      var a = Math.PI * (1 - value / 100);
      return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
    }
    function arc(from, to) {
      var a = polar(from, R), b = polar(to, R), c = polar(to, R - w), d = polar(from, R - w);
      return "M" + a[0].toFixed(2) + " " + a[1].toFixed(2) + "A" + R + " " + R + " 0 0 1 " + b[0].toFixed(2) + " " + b[1].toFixed(2) +
        "L" + c[0].toFixed(2) + " " + c[1].toFixed(2) + "A" + (R - w) + " " + (R - w) + " 0 0 0 " + d[0].toFixed(2) + " " + d[1].toFixed(2) + "Z";
    }
    var prev = 0;
    var bands = fg.bands.map(function (b, i) {
      var to = b.max == null ? 100 : b.max + (i === fg.bands.length - 1 ? 0 : 0.5);
      var path = '<path class="dash-gauge__band dash-gauge__band--' + i + '" d="' + arc(prev + (i ? 0.6 : 0), Math.min(to, 100)) + '"/>';
      prev = to;
      return path;
    }).join("");
    var tip = polar(fg.value, R - w - 6), base1 = polar(fg.value + 50, 5), base2 = polar(fg.value - 50, 5);
    return '<svg class="dash-gauge" viewBox="0 0 200 104" width="200" height="104" role="img" aria-label="Fear and Greed Index ' +
      fg.value + " out of 100: " + esc(fg.label) + '">' + bands +
      '<path class="dash-gauge__needle" d="M' + base1[0].toFixed(2) + " " + base1[1].toFixed(2) + "L" + tip[0].toFixed(2) + " " + tip[1].toFixed(2) +
      "L" + base2[0].toFixed(2) + " " + base2[1].toFixed(2) + 'Z"/><circle class="dash-gauge__hub" cx="' + cx + '" cy="' + cy + '" r="5"/>' +
      '<text class="dash-gauge__end" x="20" y="104" text-anchor="middle">0</text><text class="dash-gauge__end" x="180" y="104" text-anchor="middle">100</text></svg>';
  }

  // ETF flows: latest day, 7-day and 30-day totals, and the last 14 days as
  // bars above (inflow) or below (outflow) a zero line.
  function etfPanel(e) {
    var days = e.days.slice(-14), W = 224, H = 72, gap = 4, bw = (W - gap * 13) / 14;
    var max = Math.max.apply(null, days.map(function (d) { return Math.abs(d.netFlow); })) || 1;
    var mid = H / 2;
    var bars = days.map(function (d, i) {
      var h = Math.max(1, Math.abs(d.netFlow) / max * (mid - 2));
      var y = d.netFlow >= 0 ? mid - h : mid;
      return '<rect class="dash-etf__bar dash-etf__bar--' + (d.netFlow >= 0 ? "in" : "out") + '" x="' + (i * (bw + gap)).toFixed(1) +
        '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
    }).join("");
    var summary = e.label + ", last 14 trading days: " + days.map(function (d) { return date(d.date) + " " + signedUsd(d.netFlow); }).join("; ");
    return '<div class="dash-etf">' +
      '<h3 class="dash-etf__title">' + esc(e.label) + "</h3>" +
      '<p class="dash-etf__latest"><span class="dash-label">Net flow, ' + date(e.latest.date) + '</span>' +
        flow(e.latest.netFlow, true) + "</p>" +
      '<dl class="dash-etf__totals"><div><dt class="dash-label">7 days</dt><dd>' + flow(e.total7d) + "</dd></div>" +
        '<div><dt class="dash-label">30 days</dt><dd>' + flow(e.total30d) + "</dd></div></dl>" +
      '<svg class="dash-etf__chart" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(summary) + '">' +
        '<line class="dash-etf__zero" x1="0" x2="' + W + '" y1="' + mid + '" y2="' + mid + '"/>' + bars + "</svg>" +
      '<p class="dash-etf__legend"><span class="dash-key dash-key--in"></span>Inflow <span class="dash-key dash-key--out"></span>Outflow</p>' +
      "</div>";
  }
  function flow(v, big) {
    var dir = direction(v);
    return '<span class="dash-flow dash-flow--' + dir + (big ? " dash-flow--big" : "") + '"><span aria-hidden="true">' +
      (dir === "up" ? "▲ " : dir === "down" ? "▼ " : "") + "</span>" + (v > 0 ? "+" : "") + usd(v) +
      '<span class="dash-sr"> ' + (v >= 0 ? "net inflow" : "net outflow") + "</span></span>";
  }

  // Fear & Greed panel: gauge, value, label, and the three earlier readings.
  function fearGreedPanel(fg) {
    function past(label, p) {
      return '<div><dt class="dash-label">' + label + "</dt><dd><span class=\"dash-fg__past\">" + p.value + "</span> " + esc(p.label) + "</dd></div>";
    }
    return '<div class="dash-fg">' +
      '<h3 class="dash-panel-title">Fear &amp; Greed Index' + explain("fear-greed") + "</h3>" +
      '<div class="dash-fg__main">' + gauge(fg) +
        '<p class="dash-fg__now"><span class="dash-fg__value">' + fg.value + '</span><span class="dash-fg__label">' + esc(fg.label) + "</span></p></div>" +
      '<dl class="dash-fg__history">' + past("Yesterday", fg.yesterday) + past("Last week", fg.lastWeek) + past("Last month", fg.lastMonth) + "</dl>" +
      summary("fearGreed", { value: fg.value }, fg.label) +
      "</div>";
  }

  // Market-wide strip: Fear & Greed, then BTC and ETH ETF flows.
  function marketStrip(container) {
    var api = window.CA_DASH_API;
    return Promise.all([api.getFearGreed(), api.getEtfFlows()]).then(function (r) {
      var b7 = r[1].btc.total7d, e7 = r[1].eth.total7d;
      var flows = b7 >= 0 && e7 >= 0 ? "in" : b7 < 0 && e7 < 0 ? "out" : "mixed";
      container.innerHTML =
        '<div class="dash-strip__item">' + fearGreedPanel(r[0]) + "</div>" +
        '<div class="dash-strip__item"><h3 class="dash-panel-title">Spot ETF flows' + explain("etf-flows") + '</h3><div class="dash-etfs">' +
          etfPanel(r[1].btc) + etfPanel(r[1].eth) + "</div>" +
          summary("etfFlows", { btcDir: b7 >= 0 ? "inflows" : "outflows", ethDir: e7 >= 0 ? "inflows" : "outflows" }, flows) + "</div>";
    });
  }

  // Logo stand-in: the ticker's mark in a ring (no third-party logos).
  // A link button in the homepage's style (.button--ghost in styles.css):
  // label and arrow in --ink, no frame, shifts to --muted on hover. The
  // label is one span so screen-reader-only text inside it adds no gap.
  var ARROW = '<svg class="button__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
  function cta(href, label, cls, attrs) {
    return '<a class="button button--ghost dash-cta' + (cls ? " " + cls : "") + '" href="' + esc(href) + '"' + (attrs || "") + "><span>" + label + "</span>" + ARROW + "</a>";
  }

  // Asset logo: the asset's logo files when it has them (asset.logo, from
  // the data layer), else its ticker in a ring. Fixed width and height, so
  // nothing moves while an image loads. alt is empty because the name is
  // always printed next to the logo; pass alt to name it.
  var ROOT = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? new URL("../../", s).href : "../../";
  })();
  var LOGO_PX = { xs: 20, sm: 28, lg: 56 };
  // One logo file for places that can't use <picture> (SVG <image> in the
  // bubble maps): the 128px PNG, sharp up to 64 CSS px on 2x screens.
  function logoUrl(asset) { return asset.logo ? ROOT + asset.logo + "-128.png" : ""; }
  function logo(asset, size, alt) {
    var cls = "dash-logo" + (size ? " dash-logo--" + size : "");
    if (!asset.logo) return '<span class="' + cls + '" aria-hidden="true">' + esc(asset.ticker.slice(0, 2)) + "</span>";
    var px = LOGO_PX[size] || 40, base = ROOT + asset.logo;
    var set = function (ext) { return base + "-64." + ext + " 64w, " + base + "-128." + ext + " 128w"; };
    return '<picture class="' + cls + ' dash-logo--img">' +
      '<source type="image/webp" srcset="' + set("webp") + '" sizes="' + px + 'px">' +
      '<img src="' + base + '-128.png" srcset="' + set("png") + '" sizes="' + px + 'px" width="' + px + '" height="' + px +
      '" alt="' + esc(alt || "") + '" decoding="async"></picture>';
  }

  // "Sample data · Last updated ..." line for the top of each page.
  function sampleNote(container) {
    return window.CA_DASH_API.getMeta().then(function (m) {
      container.innerHTML = (m.sample ? '<span class="dash-sample">Sample data</span>' : "") +
        '<span>Last updated <time datetime="' + esc(m.lastUpdated) + '">' + dateTime(m.lastUpdated) + "</time></span>";
    });
  }

  return {
    TIMEFRAMES: TIMEFRAMES, tfLabel: tfLabel, esc: esc, el: el, cta: cta, explain: explain, summary: summary,
    price: price, signedPrice: signedPrice, changeUsd: changeUsd, usd: usd, usdShort: usdShort, signedUsd: signedUsd, pct: pct, date: date, dateTime: dateTime, direction: direction,
    change: change, sparkline: sparkline, gauge: gauge, etfPanel: etfPanel, fearGreedPanel: fearGreedPanel,
    marketStrip: marketStrip, logo: logo, logoUrl: logoUrl, sampleNote: sampleNote
  };
})();
