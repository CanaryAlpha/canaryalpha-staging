/*
 * One research report (dashboard/report/?slug=btc), from
 * api/research/report at the member's plan. The server decides what comes
 * back: a report outside the plan arrives as its public summary with
 * locked: true, and this page shows what unlocks it.
 *
 * Shown: the headline (decision, rating, risk), the summary document, the
 * longer narrative sections (folded), downloads, and for Enterprise the
 * full research data as a JSON file.
 */
(function () {
  var M = window.CA_MEMBERS;
  var box = document.querySelector("[data-report]");
  var slug = new URLSearchParams(location.search).get("slug") || "";
  var md = window.CA_MARKDOWN.render;

  var SECTION_TITLES = {
    executive_summary: "Executive summary",
    ten_questions: "Ten questions",
    whitepaper_technical_documentation_summary: "Whitepaper and technical documentation",
    blog_post_summaries: "What the team has published",
    follow_up_monitoring: "What we're watching next"
  };
  function title(key) {
    return SECTION_TITLES[key] || key.replace(/_/g, " ").replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function headline(r, tier) {
    var h = r.headline || {}, w = r.web_meta || {}, id = (r.sections && r.sections.identity) || {};
    var name = id.name || (w.seo_title || slug).split(" (")[0];
    var ticker = id.ticker || slug.toUpperCase();
    document.title = name + " — Canary Alpha Research";
    return '<header class="members__head report__head">' +
      '<h1 class="members__title">' + M.esc(name) + ' <span class="reports__ticker">' + M.esc(ticker) + "</span></h1>" +
      '<p class="reports__rating"><span class="verdict verdict--' + M.verdictClass(h.decision) + '">' + M.esc(h.decision || "") + "</span>" +
        (h.rating != null ? ' <span class="reports__score">' + M.esc(h.rating) + "/10</span>" : "") +
        (h.risk_tier ? ' <span class="reports__risk">Risk: ' + M.esc(h.risk_tier) + "</span>" : "") + "</p>" +
      (h.one_line_thesis ? '<p class="report__thesis">' + M.esc(h.one_line_thesis) + "</p>" : "") +
      '<p class="reports__meta">' + (w.report_date ? "Report date " + M.esc(M.date(w.report_date)) + " &middot; " : "") +
        "Updated " + M.esc(M.date(w.last_revised_at || w.published_at || h.last_updated)) +
        (w.revisit_date ? " &middot; Next review " + M.esc(M.date(w.revisit_date)) : "") + "</p>" +
    "</header>";
  }

  function body(r) {
    var s = r.sections || {};
    var main = s.summary_document || (s.narrative_sections && s.narrative_sections.executive_summary) || s.executive_summary || "";
    var html = main ? '<article class="report__doc">' + md(main, { shift: 1 }) + "</article>" : "";
    var more = s.narrative_sections || {};
    var keys = Object.keys(more).filter(function (k) { return typeof more[k] === "string" && more[k] !== main; });
    if (keys.length) {
      html += '<section class="members__section" aria-labelledby="more-title"><h2 class="members__h2" id="more-title">More from this report</h2>' +
        keys.map(function (k) {
          return '<details class="report__more"><summary>' + M.esc(title(k)) + '</summary><div class="report__doc">' + md(more[k], { shift: 2 }) + "</div></details>";
        }).join("") + "</section>";
    }
    return html;
  }

  function locked(paidPlans) {
    return '<section class="members__section report__locked"><h2 class="members__h2">The full report is part of Pro</h2>' +
      "<p>Pro includes every report we publish, with the full analysis behind each rating.</p>" +
      (paidPlans ? '<p><a class="members__button" href="../../account/">Upgrade to Pro</a></p>'
                 : '<p><a class="members__button" href="../../waitlist/?plan=pro">Coming soon. Join the list</a></p>') +
      "</section>";
  }

  function downloads(tier, report) {
    var slot = document.querySelector("[data-downloads]");
    M.api("research/documents?slug=" + encodeURIComponent(slug)).then(function (d) {
      var items = d.documents.map(function (doc) {
        return '<li><a href="' + M.esc(doc.url) + '" rel="noopener">' + M.esc(doc.label || doc.role || "Document") +
          (doc.format ? " (" + M.esc(String(doc.format).toUpperCase()) + ")" : "") + "</a></li>";
      });
      if (tier === "enterprise") items.push('<li><button type="button" class="members__link" data-json>Full research data (JSON)</button></li>');
      if (!items.length) { slot.remove(); return; }
      slot.innerHTML = '<h2 class="members__h2">Downloads</h2><ul class="report__files">' + items.join("") + "</ul>" +
        (d.documents.length ? '<p class="members__muted">Download links expire after a few minutes; reload the page for new ones.</p>' : "");
      var json = slot.querySelector("[data-json]");
      if (json) json.addEventListener("click", function () {
        var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = slug + "-canary-alpha-research.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      });
    }).catch(function () { slot.remove(); });
  }

  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    box.innerHTML = '<p class="members__error">We couldn&rsquo;t tell which report you wanted. <a href="../">See all reports</a>.</p>';
    return;
  }
  M.ready.then(function () {
    return Promise.all([M.api("research/report?slug=" + encodeURIComponent(slug)), window.CA_AUTH.config()]);
  }).then(function (res) {
    var d = res[0];
    box.innerHTML = headline(d.report, d.tier) +
      (d.degraded ? '<p class="members__notice">Part of this report couldn&rsquo;t be loaded just now. Please try again later.</p>' : "") +
      (d.locked ? locked(res[1].paidPlans) : body(d.report) + '<section class="members__section" data-downloads></section>') +
      '<p class="report__disclaimer">Research for information only, not investment advice. <a href="../../disclaimer/">Read our disclaimer.</a></p>';
    if (!d.locked) downloads(d.tier, d.report);
  }).catch(function (e) { box.innerHTML = M.errorBox(e); });
})();
