/*
 * Asset detail view, shared by the Free pages (dashboard/btc/, eth/)
 * and the Pro page (dashboard/pro/asset/?id=...):
 *
 *   CA_DASH_DETAIL.render(container, id, { pro: false, back: "../", backLabel: "..." })
 *
 * Sections: price, market cap, volume, all-time high/low, indicators
 * (Bitcoin only), key information, top 10 exchanges, then for Pro the
 * whale-wallet forensics and what changed since the last report, then
 * "Learn about [asset]" and the report button. All data through
 * CA_DASH_API. When the page loads the education layer (components/learn/),
 * sections also get "Explain this" icons and Simple-mode summaries, and the
 * page gets Key takeaways and the Simple / Detailed toggle.
 */
window.CA_DASH_DETAIL = (function () {
  var UI = window.CA_DASH_UI, api = window.CA_DASH_API;
  var L = null;   // education layer (window.CA_LEARN), when the page loads it; set in render()
  var esc = UI.esc;
  // The site's disclaimer page (disclaimer/), from this file's address.
  var DISCLAIMER = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? new URL("../../disclaimer/", s).href : "/disclaimer/";
  })();

  // Trading for the coin's size: 24h volume against market cap.
  function volCase(a) { var r = a.volume24h / a.marketCap; return r > 0.06 ? "busy" : r < 0.02 ? "quiet" : "normal"; }

  // Simple mode (education layer) shows only 24h, 7d and 30d; Detailed shows every timeframe.
  var SIMPLE_TFS = ["h24", "d7", "d30"];
  function changeRow(changes, usd, kind, keys) {
    return '<dl class="dash-changes">' + keys.map(function (k) {
      return "<div" + (SIMPLE_TFS.indexOf(k) === -1 ? ' class="learn-detail-only"' : "") + '><dt class="dash-label">' + UI.tfLabel(k) + "</dt><dd>" +
        UI.changeUsd(usd[k], changes[k], kind, { stack: true }) + "</dd></div>";
    }).join("") + "</dl>";
  }
  // "up 1.8%" / "down 1.8%" / "flat", for Simple-mode summaries.
  function moved(v) { return Math.abs(v) < 0.05 ? "flat" : (v > 0 ? "up " : "down ") + Math.abs(v).toFixed(1) + "%"; }
  function monthYear(iso) { var d = new Date(iso + "T00:00:00Z"); return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getUTCMonth()] + " " + d.getUTCFullYear(); }

  function section(id, title, body, extra) {
    return '<section class="dash-section' + (extra ? " " + extra : "") + '" aria-labelledby="' + id + '">' +
      '<h2 class="dash-section__title" id="' + id + '">' + title + "</h2>" + body + "</section>";
  }

  /* ---- Bitcoin indicators -------------------------------------------- */
  // Puell Multiple: two years of weekly values with the band thresholds.
  function puellChart(p) {
    var W = 560, H = 160, padL = 34, padB = 22, values = p.weekly.map(function (w) { return w.value; });
    var max = Math.max(2.4, Math.max.apply(null, values)), min = 0;
    function x(i) { return padL + i / (values.length - 1) * (W - padL - 6); }
    function y(v) { return 6 + (1 - (v - min) / (max - min)) * (H - padB - 6); }
    var line = values.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join("");
    var thresholds = p.bands.filter(function (b) { return b.max != null; }).map(function (b) {
      return '<line class="dash-chart__threshold" x1="' + padL + '" x2="' + (W - 6) + '" y1="' + y(b.max).toFixed(1) + '" y2="' + y(b.max).toFixed(1) + '"/>' +
        '<text class="dash-chart__tick" x="' + (padL - 6) + '" y="' + (y(b.max) + 4).toFixed(1) + '" text-anchor="end">' + b.max + "</text>";
    }).join("");
    var lastX = x(values.length - 1), lastY = y(values[values.length - 1]);
    return '<svg class="dash-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Puell Multiple, weekly over two years, from ' +
      values[0] + " to " + values[values.length - 1] + '. Thresholds at ' + p.bands.filter(function (b) { return b.max != null; }).map(function (b) { return b.max; }).join(" and ") + '.">' +
      thresholds + '<path class="dash-chart__line" d="' + line + '"/>' +
      '<circle class="dash-chart__dot" cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="4"/>' +
      '<text class="dash-chart__tick" x="' + padL + '" y="' + (H - 4) + '">' + UI.date(p.weekly[0].date) + "</text>" +
      '<text class="dash-chart__tick" x="' + (W - 6) + '" y="' + (H - 4) + '" text-anchor="end">' + UI.date(p.date) + "</text></svg>";
  }

  // Rainbow chart: monthly closes on a log scale over coloured bands that
  // follow a long-term log regression; a marker names today's band.
  function rainbowChart(rb, currentPrice) {
    var W = 560, H = 300, padL = 52, padB = 24, padT = 8, padR = 8;
    var genesis = Date.parse(rb.genesis + "T00:00:00Z");
    var months = rb.monthly;
    function days(m) { return (Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 15) - genesis) / 864e5; }
    function fit(m) { return rb.fit.slope * Math.log(days(m)) + rb.fit.intercept; }
    var lo = fit(months[0].month) + rb.bands[0].from, hi = fit(months[months.length - 1].month) + rb.bands[rb.bands.length - 1].to;
    function x(i) { return padL + i / (months.length - 1) * (W - padL - padR); }
    function y(log) { return padT + (1 - (log - lo) / (hi - lo)) * (H - padT - padB); }
    var bands = rb.bands.map(function (b, k) {
      var top = months.map(function (m, i) { return x(i).toFixed(1) + " " + y(fit(m.month) + b.to).toFixed(1); });
      var bottom = months.map(function (m, i) { return x(i).toFixed(1) + " " + y(fit(m.month) + b.from).toFixed(1); }).reverse();
      return '<path class="dash-rainbow__band dash-rainbow__band--' + k + '" d="M' + top.join("L") + "L" + bottom.join("L") + 'Z"><title>' + esc(b.label) + "</title></path>";
    }).join("");
    var line = months.map(function (m, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(Math.log10(m.close)).toFixed(1); }).join("");
    var ticks = [1, 10, 100, 1e3, 1e4, 1e5, 1e6].filter(function (v) { var l = Math.log10(v); return l > lo && l < hi; }).map(function (v) {
      var yy = y(Math.log10(v));
      return '<line class="dash-chart__grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>' +
        '<text class="dash-chart__tick" x="' + (padL - 6) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + UI.usdShort(v) + "</text>";
    }).join("");
    var years = months.map(function (m, i) { return { m: m.month, i: i }; }).filter(function (o) { return /-01$/.test(o.m) && +o.m.slice(0, 4) % 2 === 0; }).map(function (o) {
      return '<text class="dash-chart__tick" x="' + x(o.i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + o.m.slice(0, 4) + "</text>";
    }).join("");
    // Today's band.
    var last = months[months.length - 1], resid = Math.log10(currentPrice) - fit(last.month);
    var band = rb.bands.filter(function (b) { return resid >= b.from && resid < b.to; })[0] || rb.bands[resid < 0 ? 0 : rb.bands.length - 1];
    var cx = x(months.length - 1), cy = y(Math.log10(currentPrice));
    var marker = '<circle class="dash-rainbow__marker" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5"/>' +
      '<text class="dash-rainbow__label" x="' + (cx - 10).toFixed(1) + '" y="' + (cy + 22).toFixed(1) + '" text-anchor="end">Now: ' + esc(band.label) + "</text>";
    return {
      band: band.label,
      svg: '<svg class="dash-chart dash-rainbow" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Bitcoin rainbow price chart, log scale, monthly since ' +
        months[0].month + ". The price is now in the " + esc(band.label) + ' band.">' +
        ticks + bands + '<path class="dash-chart__line dash-rainbow__price" d="' + line + '"/>' + marker + years + "</svg>",
      legend: '<ol class="dash-rainbow__legend">' + rb.bands.slice().reverse().map(function (b, k) {
        var idx = rb.bands.length - 1 - k;
        // The asterisk points to the note under the chart.
        return '<li' + (b.label === band.label ? ' class="is-current"' : "") + '><span class="dash-key dash-rainbow__band--' + idx + '"></span><span>' + esc(b.label) +
          '<span class="dash-rainbow__ast" aria-hidden="true">*</span></span>' +
          (b.label === band.label ? ' <span class="dash-sr">(current)</span>' : "") + "</li>";
      }).join("") + "</ol>"
    };
  }

  function indicators(a, ind) {
    if (!ind) {
      return section("ind-title", "Indicators",
        '<div class="dash-indicators"><div class="dash-indicator"><h3 class="dash-panel-title">Puell Multiple' + UI.explain("puell-multiple") + '</h3><p class="dash-note">Bitcoin-only indicator.</p></div>' +
        '<div class="dash-indicator"><h3 class="dash-panel-title">Bitcoin Rainbow Price Chart' + UI.explain("rainbow-chart") + '</h3><p class="dash-note">Bitcoin-only indicator.</p></div></div>');
    }
    var rb = rainbowChart(ind.rainbow, a.price);
    var status = ind.puell.status;
    var bandAt = ind.rainbow.bands.map(function (b) { return b.label; }).indexOf(rb.band), mid = (ind.rainbow.bands.length - 1) / 2;
    return section("ind-title", "Indicators",
      '<div class="dash-indicators">' +
        '<div class="dash-indicator"><h3 class="dash-panel-title">Puell Multiple' + UI.explain("puell-multiple") + "</h3>" +
          UI.summary("puell", {}, status) +
          '<p class="dash-indicator__value"><span class="dash-big">' + ind.puell.value.toFixed(2) + '</span><span class="dash-status dash-status--' +
            status.toLowerCase() + '">' + esc(status) + "</span></p>" +
          '<p class="dash-note">Miner revenue against its one-year average. Bands: ' +
            ind.puell.bands.map(function (b, i, all) {
              var from = i ? all[i - 1].max : 0;
              return esc(b.label) + " " + (b.max == null ? "above " + from : (i ? from + "–" : "below ") + b.max);
            }).join(", ") + ".</p>" + puellChart(ind.puell) + "</div>" +
        '<div class="dash-indicator dash-indicator--wide"><h3 class="dash-panel-title">Bitcoin Rainbow Price Chart' + UI.explain("rainbow-chart") + "</h3>" +
          UI.summary("rainbow", { band: rb.band }, bandAt < mid ? "below" : bandAt > mid ? "above" : "on") +
          '<p class="dash-indicator__value"><span class="dash-label">Current band</span><span class="dash-status">' + esc(rb.band) + "</span></p>" +
          '<div class="dash-rainbow__wrap">' + rb.svg + rb.legend + "</div>" +
          '<p class="dash-note dash-rainbow__note"><span aria-hidden="true">*</span><a href="' + DISCLAIMER + '">Not investment advice</a>. ' +
            "The Rainbow Chart is a long-term visualization for educational and entertainment purposes. It has no predictive power, and past performance " +
            "does not guarantee future results.</p></div>" +
      "</div>");
  }

  /* ---- Page ------------------------------------------------------------ */
  function render(container, id, opts) {
    var o = opts || {};
    L = window.CA_LEARN || null;
    return Promise.all([api.getAsset(id), api.getNews(id), api.getExchanges(id), api.getIndicators(id),
      o.pro ? api.getProDetail(id) : Promise.resolve(null)]).then(function (r) {
      var a = r[0], news = r[1], exchanges = r[2], ind = r[3], proData = r[4];
      if (!a) {
        container.innerHTML = '<p class="dash-back"><a href="' + o.back + '">← ' + esc(o.backLabel) + "</a></p>" +
          '<h1 class="dash-title">Asset not found</h1><p class="dash-sub">There is no asset called “' + esc(id) + "” in the sample data.</p>";
        return;
      }
      document.title = a.name + " (" + a.ticker + ") — Canary Alpha Research";
      var fromAth = (a.price / a.ath.price - 1) * 100, fromAtl = (a.price / a.atl.price - 1) * 100;
      var html =
        '<p class="dash-back"><a href="' + o.back + '">← ' + esc(o.backLabel) + "</a></p>" +
        '<header class="dash-head dash-head--asset">' + UI.logo(a, "lg") +
          '<div><h1 class="dash-title">' + esc(a.name) + ' <span class="dash-title__ticker">' + esc(a.ticker) + "</span></h1>" +
          '<p class="dash-meta" data-sample-note></p></div>' +
          (o.pro ? '<p class="dash-head__score"><span class="dash-label">Canary score' + UI.explain("canary-score") + '</span><span class="dash-head__total"><span class="dash-big">' + a.canaryScore +
            '</span> <span class="dash-muted">/ 80</span></span> <span class="dash-head__verdict">' + window.CA_DASH_ASSETS.verdictTag(a.verdict) +
            UI.explain("verdict-" + a.verdict.toLowerCase().replace(/[^a-z]+/g, "-"), "Verdict: " + a.verdict) + "</span></p>" : "") +
          (L ? '<div class="dash-field dash-field--mode"><span class="dash-field__label">Explanations</span>' + L.modeToggle() + "</div>" : "") +
        "</header>" +
        (L ? L.assetTakeaways(a) : "") +
        (o.pro ? UI.summary("score", { name: a.name, score: a.canaryScore }, a.verdict) : "") +
        section("price-title", "Price" + UI.explain("price-change"), UI.summary("price", { name: a.name, day: moved(a.priceChange.h24), week: moved(a.priceChange.d7) }) +
          '<p class="dash-big dash-big--price">' + UI.price(a.price) + "</p>" + changeRow(a.priceChange, a.priceChangeUsd, "price", ["h1", "h24", "d7", "d30", "d90", "y1"])) +
        section("cap-title", "Market cap" + UI.explain("market-cap"), UI.summary("marketCap", { name: a.name, cap: UI.usd(a.marketCap) }) +
          '<p class="dash-big">' + UI.usd(a.marketCap) + "</p>" + changeRow(a.marketCapChange, a.marketCapChangeUsd, "compact", ["h24", "d7", "d30", "d90", "y1"])) +
        section("vol-title", "Volume" + UI.explain("volume"), UI.summary("volume", { name: a.name, volume: UI.usd(a.volume24h) }, volCase(a)) +
          '<p class="dash-big">' + UI.usd(a.volume24h) + ' <span class="dash-muted">24h</span></p>' + changeRow(a.volumeChange, a.volumeChangeUsd, "compact", ["h24", "d7", "d30", "d90", "y1"])) +
        section("ath-title", "All-time high and low" + UI.explain("ath-atl"),
          UI.summary("athAtl", { name: a.name, fromAth: Math.abs(fromAth).toFixed(0) + "%", athDate: monthYear(a.ath.date) }) +
          '<dl class="dash-extremes">' +
            '<div><dt class="dash-panel-title">All-time high</dt><dd><span class="dash-big">' + UI.price(a.ath.price) + '</span><span class="dash-muted">' +
              UI.date(a.ath.date) + "</span>" + UI.change(fromAth) + ' <span class="dash-muted">from now</span></dd></div>' +
            '<div><dt class="dash-panel-title">All-time low</dt><dd><span class="dash-big">' + UI.price(a.atl.price) + '</span><span class="dash-muted">' +
              UI.date(a.atl.date) + "</span>" + UI.change(fromAtl, { decimals: fromAtl > 10000 ? 0 : 2 }) + ' <span class="dash-muted">from now</span></dd></div>' +
          "</dl>") +
        indicators(a, ind) +
        section("info-title", "Key information",
          '<p class="dash-about">' + esc(a.about) + "</p>" +
          '<p class="dash-links">' + link(a.website, "Official website") + link(a.whitepaper, "Whitepaper") + "</p>" +
          '<h3 class="dash-panel-title">Recent news</h3><ul class="dash-news">' + news.slice(0, 5).map(function (n) {
            return '<li><a href="' + esc(n.url) + '">' + esc(n.headline) + '</a><span class="dash-muted"><time datetime="' + n.date + '">' +
              UI.date(n.date) + "</time> · " + esc(n.source) + "</span></li>";
          }).join("") + "</ul>") +
        section("ex-title", "Top 10 exchanges",
          UI.summary("exchanges", { name: a.name }) +
          '<div class="dash-table-wrap"><table class="dash-table dash-table--simple"><thead><tr><th scope="col" class="is-num">#</th><th scope="col">Exchange</th>' +
          '<th scope="col">Pair</th><th scope="col"><span class="dash-sr">Link</span></th></tr></thead><tbody>' +
          exchanges.map(function (x) {
            return '<tr><td class="is-num">' + x.rank + '</td><th scope="row">' + esc(x.exchange) + "</th><td>" + esc(x.pair) +
              '</td><td>' + UI.cta(x.url, 'Visit<span class="dash-sr"> ' + esc(x.exchange) + "</span>") + "</td></tr>";
          }).join("") + "</tbody></table></div>" +
          '<p class="dash-note">Listed for convenience. Not an endorsement or financial advice.</p>') +
        (proData ? proSections(a, proData) : "") +
        (L ? L.learnAbout(a) : "") +
        '<p class="dash-report">' + UI.cta("#", "Read the full report") + "</p>";
      container.innerHTML = html;
      UI.sampleNote(container.querySelector("[data-sample-note]"));
    });
  }

  function link(url, label) {
    var external = /^https?:/.test(url);
    return UI.cta(url, label + (external ? '<span class="dash-sr"> (opens in a new tab)</span>' : ""), "", external ? ' rel="noopener" target="_blank"' : "");
  }

  function proSections(a, p) {
    var w = p.whales;
    return section("whale-title", 'Whale-wallet forensics' + UI.explain("whale-wallet") + ' <span class="dash-pro-tag">Pro</span>',
        UI.summary("whales", { ticker: a.ticker }, w.exchangeNetFlow30d > 0 ? "onto" : "off") +
        '<p class="dash-about">' + esc(w.summary) + "</p>" +
        '<p class="dash-indicator__value"><span class="dash-label">Net exchange flow, 30 days' + UI.explain("exchange-netflow") + "</span>" +
          '<span class="dash-flow dash-flow--' + (w.exchangeNetFlow30d <= 0 ? "up" : "down") + '">' + UI.signedUsd(w.exchangeNetFlow30d) +
          '<span class="dash-sr">' + (w.exchangeNetFlow30d <= 0 ? " off exchanges" : " onto exchanges") + "</span></span></p>" +
        '<div class="dash-table-wrap"><table class="dash-table dash-table--simple"><thead><tr><th scope="col">Wallet</th>' +
        '<th scope="col" class="is-num">Share of supply</th><th scope="col" class="is-num">30-day change</th><th scope="col">Last move</th></tr></thead><tbody>' +
        w.wallets.map(function (x) {
          return '<tr><th scope="row">' + esc(x.label) + '</th><td class="is-num">' + x.shareOfSupply.toFixed(2) + '%</td><td class="is-num">' +
            UI.change(x.change30d, { decimals: 1 }) + "</td><td>" + UI.date(x.lastMove) + "</td></tr>";
        }).join("") + "</tbody></table></div>") +
      section("changed-title", 'What changed since last report' + UI.explain("quarterly-updates") + ' <span class="dash-pro-tag">Pro</span>',
        UI.summary("changed", { from: a.previousReport.score, to: a.canaryScore },
          a.canaryScore > a.previousReport.score ? "up" : a.canaryScore < a.previousReport.score ? "down" : "same") +
        '<p class="dash-indicator__value"><span class="dash-label">' + UI.date(a.previousReport.date) + " → " + UI.date(a.reportDate) + "</span>" +
          "<span>" + a.previousReport.score + " → " + a.canaryScore + ' <span class="dash-muted">/ 80</span></span></p>' +
        '<p class="dash-about">' + esc(p.changes.summary) + "</p>" +
        '<ul class="dash-bullets">' + p.changes.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>");
  }

  return { render: render };
})();
