/*
 * Dashboard data layer. TODO: replace sample data with live sources here.
 *
 * Every dashboard page reads data ONLY through these functions; nothing
 * else touches the data file (dashboard/dashboard-data.js). To go
 * live, change the bodies below to fetch from your sources and return the
 * same shapes; the pages need no changes. Each getter returns a Promise,
 * so a live version can be asynchronous.
 *
 * Shapes (money in USD, changes in percent, dates ISO "YYYY-MM-DD"):
 *   getMeta()        { lastUpdated, currency, sample }
 *   getAssets()      [asset]                      all tracked assets
 *   getAsset(id)     asset | null
 *     asset: { id, name, ticker, price, priceChange {h1,h24,d7,d30,d90,y1},
 *       marketCap, marketCapChange {h24,d7,d30,d90,y1}, volume24h,
 *       volumeChange {h24,d7,d30,d90,y1}, circulatingSupply,
 *       ath {price,date}, atl {price,date}, sparkline7d [42 prices, 4h apart],
 *       canaryScore (0-80), verdict, reportDate, previousReport {date,score},
 *       about, website, whitepaper, logo (path base in assets/logos/, or
 *       absent; see dashboard-data.js),
 *       priceChangeUsd, marketCapChangeUsd, volumeChangeUsd }   dollar
 *       changes per timeframe, worked out here from the current value and
 *       the % change, so the two always agree
 *   getNews(id)      [{ headline, date, source, url }]   newest first
 *   getExchanges(id) [{ rank, exchange, pair, url }]     top 10
 *   getFearGreed()   { value, label, yesterday, lastWeek, lastMonth (each
 *                      { value, label }), bands [{max,label}] }
 *   getEtfFlows()    { btc, eth } each { label, days [{date,netFlow}] (30
 *                      trading days, oldest first), latest, total7d, total30d }
 *   getIndicators(id) { puell, rainbow } for Bitcoin; null otherwise
 *   getProDetail(id) { whales {wallets, exchangeNetFlow30d, summary},
 *                      changes {summary, notes} }   Pro members only
 *   getVerdictBands() [{min,label}] highest first (shared with the scoring
 *                      visual in components/feature-visuals.config.js)
 *
 * Enterprise custom reports (stages: components/dashboard/
 * report-stages.config.js):
 *   getReportStages() [{key,label}] in order
 *   getReports()     [report]   newest order first
 *     report: { id, token {name,ticker}, orderedAt, estimatedDelivery,
 *       status "in_progress"|"delivered", stage, stageIndex, stageProgress
 *       (0-1), completedStages, totalStages, percent (0-100), history
 *       [{stage,startedAt,completedAt}], files {pdf,docx,view} | null,
 *       updatedAt }
 *   getReportAccess() { until, daysLeft, reports }  1 month of full
 *                      platform access per report, from the first order
 *   subscribeToReportProgress(id, callback)  calls back with the report
 *                      (shape above) now and on every change; returns a
 *                      function that stops the updates
 */
window.CA_DASH_API = (function () {
  var DATA = window.CA_DASHBOARD_SAMPLE;
  var SCORING = (window.CA_FEATURE_VISUALS || {}).scoring;
  var BANDS = (SCORING ? SCORING.bands : [
    { min: 64, label: "Deploy Investment" }, { min: 52, label: "Conditional Hold" },
    { min: 40, label: "Watch List" }, { min: 0, label: "Avoid" }
  ]).slice().sort(function (a, b) { return b.min - a.min; });

  // Copies, so a page can never change the source data by accident.
  function copy(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }
  function done(value) { return Promise.resolve(copy(value)); }

  function verdict(score) {
    for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) return BANDS[i].label;
    return BANDS[BANDS.length - 1].label;
  }
  function bandLabel(bands, value) {
    for (var i = 0; i < bands.length; i++) if (bands[i].max == null || value <= bands[i].max) return bands[i].label;
    return bands[bands.length - 1].label;
  }
  function find(id) {
    return DATA.assets.filter(function (a) { return a.id === id; })[0] || null;
  }
  // Dollar change over a timeframe, from the value now and its % change:
  // the value then was now / (1 + pct/100), so the change is the difference.
  function usdChanges(now, pcts) {
    var out = {};
    Object.keys(pcts).forEach(function (k) { out[k] = now - now / (1 + pcts[k] / 100); });
    return out;
  }
  function publicAsset(a) {
    var out = {};
    Object.keys(a).forEach(function (k) { if (k !== "news" && k !== "exchanges") out[k] = a[k]; });
    out.verdict = verdict(a.canaryScore);
    out.priceChangeUsd = usdChanges(a.price, a.priceChange);
    out.marketCapChangeUsd = usdChanges(a.marketCap, a.marketCapChange);
    out.volumeChangeUsd = usdChanges(a.volume24h, a.volumeChange);
    return out;
  }
  function sum(days) { return days.reduce(function (s, d) { return s + d.netFlow; }, 0); }

  /* ---- Enterprise custom reports ---------------------------------------- */
  var STAGES = window.CA_REPORT_STAGES || [];
  var reports = (DATA.reports || []).map(copy);   // live (simulated) state

  function stageIndex(key) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return i;
    return 0;
  }
  // Adds the derived fields. The bar runs over the working stages; the last
  // stage (Delivered) is the finish line.
  function reportView(r) {
    var out = copy(r), i = stageIndex(r.stage), last = STAGES.length - 1;
    var delivered = r.status === "delivered";
    out.stageIndex = i;
    out.totalStages = STAGES.length;
    out.completedStages = delivered ? STAGES.length : i;
    out.percent = delivered ? 100 : Math.min(99.9, (i + r.stageProgress) / last * 100);
    out.updatedAt = r.updatedAt || null;
    return out;
  }
  function addMonths(iso, n) {
    var d = new Date(iso.slice(0, 10) + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  // Simulated pipeline: each in-progress report moves a little every 3s,
  // finishing a stage in 20-30s, until it is delivered. Paused while the
  // tab is hidden.
  var TICK = 3000;
  var listeners = {};
  var timer = 0;
  function stageSeconds() { return 20 + Math.random() * 10; }
  function nowIso() { return new Date().toISOString().replace(/\.\d+Z$/, "Z"); }
  function step(r) {
    if (!r.secs) r.secs = stageSeconds();
    r.stageProgress = Math.min(1, r.stageProgress + TICK / 1000 / r.secs);
    r.updatedAt = nowIso();
    if (r.stageProgress < 1) return;
    var t = r.updatedAt, i = stageIndex(r.stage) + 1;
    r.history[r.history.length - 1].completedAt = t;
    r.stage = STAGES[i].key;
    r.stageProgress = 0;
    r.secs = 0;
    if (i === STAGES.length - 1) {   // reached the last stage: delivered
      r.history.push({ stage: r.stage, startedAt: t, completedAt: t });
      r.status = "delivered";
      r.stageProgress = 1;
      r.files = { pdf: "#", docx: "#", view: "#" };
    } else {
      r.history.push({ stage: r.stage, startedAt: t, completedAt: null });
    }
  }
  function tick() {
    if (document.hidden) return;
    var busy = false;
    reports.forEach(function (r) {
      if (r.status === "delivered" || !listeners[r.id] || !listeners[r.id].length) return;
      step(r);
      var view = reportView(r);
      listeners[r.id].slice().forEach(function (cb) { cb(copy(view)); });
      if (r.status !== "delivered") busy = true;
    });
    if (!busy) { clearInterval(timer); timer = 0; }
  }

  // TODO: connect to the live report pipeline here. Keep the callback's
  // report shape (see the top of this file); the page needs no changes.
  function subscribeToReportProgress(reportId, callback) {
    var r = reports.filter(function (x) { return x.id === reportId; })[0];
    if (!r) return function () {};
    (listeners[reportId] = listeners[reportId] || []).push(callback);
    setTimeout(function () { callback(reportView(r)); }, 0);
    if (r.status !== "delivered" && !timer) timer = setInterval(tick, TICK);
    return function () {
      listeners[reportId] = (listeners[reportId] || []).filter(function (cb) { return cb !== callback; });
    };
  }

  return {
    getReportStages: function () { return done(STAGES); },
    getReports: function () {
      return done(reports.slice().sort(function (a, b) { return a.orderedAt < b.orderedAt ? 1 : -1; }).map(reportView));
    },
    getReportAccess: function () {
      var first = reports.map(function (r) { return r.orderedAt; }).sort()[0];
      if (!first) return done(null);
      var until = addMonths(first, reports.length);
      var today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
      var daysLeft = Math.max(0, Math.round((new Date(until + "T00:00:00Z") - today) / 864e5));
      return done({ until: until, daysLeft: daysLeft, reports: reports.length });
    },
    subscribeToReportProgress: subscribeToReportProgress,
    getMeta: function () { return done(DATA.meta); },
    getAssets: function () { return done(DATA.assets.map(publicAsset)); },
    getAsset: function (id) { var a = find(id); return done(a && publicAsset(a)); },
    getNews: function (id) { var a = find(id); return done(a ? a.news : []); },
    getExchanges: function (id) { var a = find(id); return done(a ? a.exchanges : []); },
    getFearGreed: function () {
      var f = DATA.fearGreed;
      function point(v) { return { value: v, label: bandLabel(f.bands, v) }; }
      return done({
        value: f.value, label: bandLabel(f.bands, f.value),
        yesterday: point(f.yesterday), lastWeek: point(f.lastWeek), lastMonth: point(f.lastMonth),
        bands: f.bands
      });
    },
    getEtfFlows: function () {
      var out = {};
      Object.keys(DATA.etfFlows).forEach(function (k) {
        var e = DATA.etfFlows[k];
        out[k] = {
          label: e.label, days: e.days, latest: e.days[e.days.length - 1],
          total7d: sum(e.days.slice(-7)), total30d: sum(e.days)
        };
      });
      return done(out);
    },
    getIndicators: function (id) {
      var ind = DATA.indicators[id];
      if (!ind) return done(null);
      var p = ind.puell, latest = p.weekly[p.weekly.length - 1];
      var rb = ind.rainbow;
      return done({
        puell: { value: latest.value, date: latest.date, status: bandLabel(p.bands, latest.value), bands: p.bands, weekly: p.weekly },
        rainbow: rb
      });
    },
    getProDetail: function (id) { return done(DATA.pro[id] || null); },
    getVerdictBands: function () { return done(BANDS); }
  };
})();
