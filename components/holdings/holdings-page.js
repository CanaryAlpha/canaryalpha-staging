/*
 * Company Holdings page (holdings/): fills the table, the changes log and the
 * "Last updated" date from data/holdings.json through holdings-data.js.
 * No amounts, sizes, values or prices: the data file never carries them and
 * nothing here would show them.
 */
(function () {
  var H = window.CA_HOLDINGS;
  var root = document.querySelector("[data-holdings]");
  if (!H || !root) return;
  var table = root.querySelector("[data-holdings-table]");
  var changes = root.querySelector("[data-holdings-changes]");
  var updated = root.querySelector("[data-holdings-updated]");

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function time(iso) { return iso ? '<time datetime="' + esc(iso) + '">' + esc(H.date(iso)) + "</time>" : "&mdash;"; }
  // A site path ("/reports/btc/") is made relative to the site root, so the
  // page also works at a GitHub Pages project address.
  function href(url) { return /^\//.test(url) ? H.root + url.slice(1) : url; }

  function logo(h) {
    if (!h.logo) return '<span class="holdings-logo" aria-hidden="true">' + esc(h.ticker.slice(0, 2)) + "</span>";
    var base = H.root + h.logo;
    return '<img class="holdings-logo holdings-logo--img" src="' + esc(base) + '-64.png" srcset="' + esc(base) + "-64.png 1x, " +
      esc(base) + '-128.png 2x" width="32" height="32" alt="" loading="lazy">';
  }

  function row(h) {
    var held = h.status === "held";
    return "<tr>" +
      '<td data-label="Token"><span class="holdings-token">' + logo(h) +
        '<span><span class="holdings-token__name">' + esc(h.name) + '</span> <span class="holdings-token__ticker">' + esc(h.ticker) + "</span></span></span></td>" +
      '<td data-label="Status"><span class="holdings-status' + (held ? " holdings-status--held" : "") + '">' + (held ? "Held" : "Not held") + "</span></td>" +
      '<td data-label="Disclosed" class="holdings-num">' + time(h.disclosed) + "</td>" +
      '<td data-label="Related report">' + (h.report ? '<a href="' + esc(href(h.report.url)) + '">' + esc(h.report.title) + "</a>" : "&mdash;") + "</td>" +
      "</tr>";
  }

  function change(c) {
    return '<li class="holdings-change"><span class="holdings-change__date holdings-num">' + time(c.date) + "</span>" +
      '<span class="holdings-change__what">' + (c.ticker ? '<strong>' + esc(c.ticker) + "</strong> " : "") + esc(c.event) +
      (c.note ? '<span class="holdings-change__note"> ' + esc(c.note) + "</span>" : "") + "</span></li>";
  }

  H.load().then(function (d) {
    if (d.lastUpdated) updated.innerHTML = "Last updated: " + time(d.lastUpdated);
    else updated.hidden = true;

    table.innerHTML = d.holdings.length
      ? '<table class="legal__table holdings-table"><caption class="holdings-sr">Company holdings: whether each token is held. Amounts are never disclosed.</caption>' +
        '<thead><tr><th scope="col">Token</th><th scope="col">Status</th><th scope="col">Disclosed</th><th scope="col">Related report</th></tr></thead>' +
        "<tbody>" + d.holdings.map(row).join("") + "</tbody></table>"
      : '<p class="holdings-empty">No positions to disclose at this time.</p>';

    changes.innerHTML = d.changes.length
      ? '<ol class="holdings-changes">' + d.changes.map(change).join("") + "</ol>"
      : '<p class="holdings-empty">No changes yet.</p>';
  }).catch(function () {
    updated.hidden = true;
    table.innerHTML = '<p class="holdings-empty">We couldn&rsquo;t load our holdings just now. Please refresh the page, or email us at ' +
      '<a href="mailto:hello@canaryalpha.co">hello@canaryalpha.co</a>.</p>';
    changes.innerHTML = "";
  });
})();
