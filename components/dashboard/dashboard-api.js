/*
 * Dashboard data layer: live data from the site's own server.
 *
 * Every dashboard page reads data ONLY through these functions. They call
 * the gated api/ functions (api/dashboard/, api/dashboard/asset/,
 * api/billing/orders/) through CA_AUTH.fetch, so the server decides what
 * this member's plan may see: a Free member's answers carry Bitcoin and
 * Ethereum and only the NUMBER of other researched tokens. Nothing here
 * holds sample numbers; a metric the server leaves out is hidden.
 *
 * Shapes (money in USD, changes in percent, dates ISO "YYYY-MM-DD"):
 *   getMeta()        { lastUpdated, sample: false, hidden, attribution
 *                      [{name,url,what}] }
 *   getAssets()      [asset]   what this plan includes, BTC and ETH first
 *     asset: { id, name, ticker, canaryScore, scoreMax, verdict, risk,
 *       category, thesis, reportDate, logo, market (false: no market data),
 *       price, priceChange {h1,h24,d7,d30,d90,y1}, marketCap,
 *       marketCapChange {h24,d7,d30,d90,y1}, volume24h,
 *       volumeChange {h24,d7,d30,d90,y1}, circulatingSupply, sparkline7d,
 *       priceChangeUsd, marketCapChangeUsd, volumeChangeUsd }  dollar
 *       changes worked out on the server from the value and the % change,
 *       in one function, so the two always agree
 *   getAsset(id)     asset plus { ath, atl, about, website, whitepaper },
 *                    or null when the plan doesn't include it
 *   getNews(id)      [{ headline, date, source, url }]   newest first
 *   getExchanges(id) [{ rank, exchange, pair, url, volume24h, sources }]
 *   getFearGreed()   { value, label, yesterday, lastWeek, lastMonth, bands }
 *   getEtfFlows()    { btc, eth } each { label, days [{date,netFlow,
 *                      sources,disagree}], latest, total7d, total30d, sources }
 *   getIndicators(id) { puell, rainbow } for Bitcoin; null otherwise
 *   getProDetail(id) null (no licensed source yet: the panel stays hidden)
 *   getVerdictBands() [{min,label}] highest first
 *
 * Custom order (Pro and Enterprise; api/dashboard/order/):
 *   getCustomOrder()   the member's saved order of the asset list (slugs),
 *                      or null
 *   saveCustomOrder(order)  saves it (null: back to the default order);
 *                      resolves with the order as saved
 *
 * Enterprise bespoke reports (stages: report-stages.config.js):
 *   getReportStages(), getReports(), getAllowance() ({ limit, used, left,
 *   monthStart, resetsAt, periodEnd, renews } or null),
 *   requestReport(reportFor, notes)  -> { order, allowance }; rejects with
 *                      the server's message
 *   subscribeToReportProgress(id, callback)  polls the server every 30 s
 *                      while the tab is visible; returns a stop function
 */
window.CA_DASH_API = (function () {
  var auth = window.CA_AUTH;
  var SCORING = (window.CA_FEATURE_VISUALS || {}).scoring;
  var BANDS = (SCORING ? SCORING.bands : []).slice().sort(function (a, b) { return b.min - a.min; });
  var POLL = 30000;

  function get(path) {
    return auth.fetch(path).then(function (r) {
      if (r.status === 403 || r.status === 404) return null;
      if (!r.ok) throw new Error("dashboard " + r.status);
      return r.json();
    });
  }
  // POST JSON; resolves with the reply, or rejects with the server's message.
  function post(path, body) {
    return auth.fetch(path, { method: "POST", body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) {
        if (!r.ok) { var e = new Error(b.message || "Something went wrong. Please try again."); e.code = b.error; throw e; }
        return b;
      });
    });
  }
  var dashP = null;
  function dash() {
    if (!dashP) dashP = get("dashboard/");
    dashP.catch(function () { dashP = null; });
    return dashP;
  }
  var assetP = {};
  function asset(id) {
    if (!assetP[id]) assetP[id] = get("dashboard/asset/?id=" + encodeURIComponent(id)).then(function (d) { return d && d.asset; });
    assetP[id].catch(function () { delete assetP[id]; });
    return assetP[id];
  }
  function pick(key, fallback) {
    return function (id) { return asset(id).then(function (a) { return a && a[key] != null ? a[key] : fallback; }); };
  }

  /* ---- Enterprise bespoke reports ------------------------------------------ */
  var STAGES = window.CA_REPORT_STAGES || [];
  function stageIndex(key) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return i;
    return 0;
  }
  // Adds the derived fields. The bar runs over the working stages; the last
  // stage (Delivered) is the finish line.
  function reportView(r) {
    var i = stageIndex(r.stage), last = STAGES.length - 1, delivered = r.status === "delivered";
    r.stageIndex = i;
    r.totalStages = STAGES.length;
    r.completedStages = delivered ? STAGES.length : i;
    r.percent = delivered ? 100 : Math.min(99.9, (i + (r.stageProgress || 0)) / last * 100);
    return r;
  }
  var ordersP = null;
  function orders(fresh) {
    if (!ordersP || fresh) ordersP = get("billing/orders/");
    ordersP.catch(function () { ordersP = null; });
    return ordersP;
  }
  function reportList(fresh) {
    return orders(fresh).then(function (d) { return ((d && d.orders) || []).map(reportView); });
  }
  function subscribeToReportProgress(reportId, callback) {
    var stopped = false, timer = 0, lastSeen = "";
    function check(fresh) {
      if (stopped || (fresh && document.hidden)) return;
      reportList(fresh).then(function (list) {
        var r = list.filter(function (x) { return x.id === reportId; })[0];
        if (!r || stopped) return;
        var sig = r.stage + r.updatedAt + r.estimatedDelivery;
        if (sig !== lastSeen) { lastSeen = sig; callback(r); }
        if (r.status === "delivered") stop();
      }, function () {});
    }
    function stop() { stopped = true; clearInterval(timer); }
    check(false);
    timer = setInterval(function () { check(true); }, POLL);
    return stop;
  }

  return {
    getMeta: function () {
      return dash().then(function (d) {
        return { lastUpdated: d.lastUpdated, sample: false, hidden: d.hidden || 0, attribution: d.attribution || [], tier: d.tier };
      });
    },
    getAssets: function () { return dash().then(function (d) { return d.assets.filter(function (a) { return a.market; }).concat(d.assets.filter(function (a) { return !a.market; })); }); },
    getAsset: asset,
    getNews: pick("news", []),
    getExchanges: pick("exchanges", []),
    getIndicators: pick("indicators", null),
    getFearGreed: function () { return dash().then(function (d) { return d.fearGreed; }); },
    getEtfFlows: function () { return dash().then(function (d) { return d.etfFlows; }); },
    getProDetail: function () { return Promise.resolve(null); },
    getVerdictBands: function () { return Promise.resolve(BANDS); },
    getReportStages: function () { return Promise.resolve(STAGES); },
    getReports: function () { return reportList(false); },
    getAllowance: function () { return orders(false).then(function (d) { return (d && d.allowance) || null; }); },
    requestReport: function (reportFor, notes) {
      return post("billing/orders/", { reportFor: reportFor, notes: notes }).then(function (b) {
        ordersP = null;
        return { order: reportView(b.order), allowance: b.allowance };
      });
    },
    getCustomOrder: function () { return dash().then(function (d) { return d.customOrder || null; }); },
    saveCustomOrder: function (order) {
      return post("dashboard/order/", { order: order }).then(function (b) {
        if (dashP) dashP = dashP.then(function (d) { d.customOrder = b.order; return d; });
        return b.order;
      });
    },
    subscribeToReportProgress: subscribeToReportProgress
  };
})();
