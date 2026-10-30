/*
 * Starts whichever dashboard page this is, from <main data-dash-page="...">:
 *   free     Free dashboard: market strip, Bitcoin and Ethereum, market map
 *            of Bitcoin and Ethereum
 *   pro      Pro dashboard: market strip, market map (3 styles), all assets
 *   enterprise  Enterprise dashboard: the Pro dashboard plus "Your custom
 *            reports" (dashboard-reports.js) at the top
 *   detail   Asset detail: data-asset="btc" (Free pages) or ?id=... (Pro)
 *   bubbles  The three bubble map variations, for comparison
 * data-pro marks Pro pages; the Free BTC/ETH pages also show the Pro
 * sections to a logged-in Pro or Enterprise user (CA_AUTH). Access is
 * checked first by components/auth-gate.js. Load after the dashboard
 * components.
 */
(function () {
  var main = document.querySelector("[data-dash-page]");
  if (!main) return;
  // Not allowed here (auth-gate.js): the paywall or the login page takes over.
  if (window.CA_ACCESS && window.CA_ACCESS.blocked) return;
  var page = main.getAttribute("data-dash-page"), pro = main.hasAttribute("data-pro");
  var UI = window.CA_DASH_UI;
  function q(sel) { return main.querySelector(sel); }

  if (q("[data-sample-note]")) UI.sampleNote(q("[data-sample-note]"));
  if (q("[data-market-strip]")) UI.marketStrip(q("[data-market-strip]"));

  // The market map: one bubble map per style, the "Map style" drop-down
  // shows one at a time. only: the asset ids to show (all when left out).
  function mapSwitcher(href, only) {
    var styles = q("[data-map-style]"), maps = {};
    styles.closest("label").insertAdjacentHTML("beforebegin", UI.summary("marketMap"));
    Array.prototype.forEach.call(main.querySelectorAll("[data-map]"), function (box) {
      maps[box.getAttribute("data-map")] = box;
      window.CA_BUBBLES.mount(box, box.getAttribute("data-map"), { href: href, only: only });
    });
    function showMap() {
      Object.keys(maps).forEach(function (k) { maps[k].hidden = k !== styles.value; });
    }
    styles.addEventListener("change", showMap);
    showMap();
  }

  if (page === "free") {
    window.CA_DASH_ASSETS.mount(q("[data-assets]"), {
      pro: false, storageKey: "ca-dash-view-free", defaultView: "cards",
      href: function (a) { return a.id + "/"; },
      only: ["btc", "eth"]
    });
    mapSwitcher(function (a) { return a.id + "/"; }, ["btc", "eth"]);
  }

  if (page === "enterprise") window.CA_DASH_REPORTS.mount(q("[data-reports]"), { contact: "../../contact/" });

  if (page === "pro" || page === "enterprise") {
    mapSwitcher(function (a) { return "asset/?id=" + a.id; });
    window.CA_DASH_ASSETS.mount(q("[data-assets]"), {
      pro: true, storageKey: "ca-dash-view-" + page, defaultView: "list",
      href: function (a) { return "asset/?id=" + a.id; }
    });
  }

  if (page === "detail") {
    var id = main.getAttribute("data-asset") || new URLSearchParams(location.search).get("id") || "";
    window.CA_DASH_DETAIL.render(q("[data-detail]"), id.toLowerCase(), {
      pro: pro || (window.CA_AUTH ? window.CA_AUTH.hasTier("pro") : false), back: "../", backLabel: main.getAttribute("data-back-label") || (pro ? "Pro dashboard" : "Your dashboard")
    });
  }

  if (page === "bubbles") {
    Array.prototype.forEach.call(main.querySelectorAll("[data-map]"), function (box) {
      window.CA_BUBBLES.mount(box, box.getAttribute("data-map"), { href: function (a) { return "../pro/asset/?id=" + a.id; } });
    });
  }
})();
