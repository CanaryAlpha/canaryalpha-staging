/*
 * Company holdings data: reads data/holdings.json (the only place holdings
 * are recorded) for the Holdings page (holdings-page.js) and the Disclosure
 * line (disclosure.js). Load it before either of them.
 *
 * CA_HOLDINGS.load() -> Promise of { lastUpdated, holdings, changes, byTicker }
 *   holdings  [{ ticker, name, status: "held" | "not-held", disclosed, logo, report }]
 *   changes   [{ date, ticker, event, note }], newest first
 * CA_HOLDINGS.date("2026-10-29") -> "29 October 2026"
 * CA_HOLDINGS.root     the site root, from this file's address
 *
 * The policy is to disclose WHETHER a position is held, never how much. Only
 * the fields above are ever read, and an entry carrying an amount-like field
 * is left out entirely (with a console warning), so a slip in the data file
 * cannot publish a figure.
 */
window.CA_HOLDINGS = (function () {
  var src = document.currentScript && document.currentScript.src;
  var ROOT = src ? new URL("../../", src).href : "/";
  var FORBIDDEN = /amount|size|value|quantity|qty|units|price|cost|usd|worth|weight|percent|share/i;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  var cache = null;

  function str(v) { return typeof v === "string" ? v.trim() : ""; }
  function isDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function date(iso) {
    if (!isDate(iso)) return "";
    var p = iso.split("-");
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }
  function clean(entry, kind) {
    if (!entry || typeof entry !== "object") return null;
    var bad = Object.keys(entry).filter(function (k) { return FORBIDDEN.test(k); });
    if (bad.length) {
      console.warn("data/holdings.json: " + kind + " entry for \"" + str(entry.ticker) +
        "\" left out: it has " + bad.join(", ") + ". Holdings never show amounts.");
      return null;
    }
    return entry;
  }

  function normalise(d) {
    d = d || {};
    var holdings = (Array.isArray(d.holdings) ? d.holdings : []).map(function (h) {
      h = clean(h, "holdings");
      if (!h || !str(h.ticker)) return null;
      var report = h.report && str(h.report.url) ? { title: str(h.report.title) || "Read the report", url: str(h.report.url) } : null;
      return {
        ticker: str(h.ticker).toUpperCase(),
        name: str(h.name) || str(h.ticker).toUpperCase(),
        status: h.status === "held" ? "held" : "not-held",
        disclosed: isDate(h.disclosed) ? h.disclosed : "",
        logo: str(h.logo),
        report: report
      };
    }).filter(Boolean);
    var changes = (Array.isArray(d.changes) ? d.changes : []).map(function (c) {
      c = clean(c, "changes");
      if (!c || !isDate(c.date) || !str(c.event)) return null;
      return { date: c.date, ticker: str(c.ticker).toUpperCase(), event: str(c.event), note: str(c.note) };
    }).filter(Boolean).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var byTicker = {};
    holdings.forEach(function (h) { byTicker[h.ticker] = h; });
    return { lastUpdated: isDate(d.lastUpdated) ? d.lastUpdated : "", holdings: holdings, changes: changes, byTicker: byTicker };
  }

  function load() {
    if (!cache) {
      cache = fetch(ROOT + "data/holdings.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(normalise);
    }
    return cache;
  }

  return { load: load, date: date, root: ROOT };
})();
