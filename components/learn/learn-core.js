/*
 * Education layer core: the viewer's tier, the Simple / Detailed mode, and
 * the small building blocks every education feature shares (Key takeaways,
 * locked previews, video and reading cards, the "Education only" note).
 *
 * Load after the learn data files and components/learn/*.config.js, and
 * after components/auth.js when the page has a login.
 *
 *   CA_LEARN.tier()            "public" | "free" | "pro" | "enterprise"
 *                              (?tier=... in the address overrides it, for previews)
 *   CA_LEARN.can(feature)      true when the tier sees that feature in full
 *                              (features: components/learn/access.config.js)
 *   CA_LEARN.mode()            "simple" | "detailed"; setMode(mode) saves it
 *   CA_LEARN.modeToggle()      the Simple | Detailed control (HTML)
 *   CA_LEARN.summary(key, vars, caseKey)       Simple-mode line (HTML), from summaries.js
 *   CA_LEARN.url.video(id) / .article(id) / .glossary(id) / .learn / .pricing / .disclaimer
 *
 * Simple mode sets <html data-learn-mode="simple">; learn.css shows the
 * summaries (.learn-summary) only then, and hides .learn-detail-only.
 * The chosen mode is the only thing saved (localStorage "ca-learn-mode").
 */
window.CA_LEARN = (function () {
  var ACC = window.CA_LEARN_ACCESS;
  var CFG = window.CA_LEARN_CONFIG;
  var SUMMARIES = window.CA_LEARN_SUMMARIES || {};
  var VIDEOS = window.CA_LEARN_VIDEOS || [];
  var ARTICLES = (window.CA_LEARN_ARTICLES && window.CA_LEARN_ARTICLES.articles) || [];
  var READING = (window.CA_LEARN_READING || []).filter(function (r) {
    // Production mode leaves out sample entries (sample: true).
    return !(r.sample && window.CA_SITE && window.CA_SITE.productionMode);
  });
  var MODE_KEY = "ca-learn-mode";

  var src = document.currentScript && document.currentScript.src;
  var ROOT = src ? new URL("../../", src).href : "/";

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---- Tier --------------------------------------------------------------- */
  var params = new URLSearchParams(location.search);
  var forced = params.get("tier");
  // No ?tier= preview on the public site (production mode).
  if (ACC.tiers.indexOf(forced) === -1 || (window.CA_SITE && window.CA_SITE.productionMode)) forced = null;

  function tier() {
    if (forced) return forced;
    var t = window.CA_AUTH && window.CA_AUTH.getUserTier();
    return ACC.tiers.indexOf(t) !== -1 ? t : "public";
  }
  function rank(t) { return ACC.tiers.indexOf(t); }
  function need(feature) { return ACC.features[feature] || "public"; }
  function can(feature) { return rank(tier()) >= rank(need(feature)); }
  function videoFeature(v) { return ACC.videoCategories[v.category] || "beginnerVideos"; }
  function canVideo(v) { return can(videoFeature(v)); }

  // Learn links keep a ?tier= preview, so it follows you around the hub.
  function keep(href) { return forced ? href + (href.indexOf("?") === -1 ? "?" : "&") + "tier=" + forced : href; }
  function withHash(href, hash) { return keep(href) + (hash ? "#" + hash : ""); }
  var url = {
    learn: keep(ROOT + "learn/"),
    video: function (id) { return keep(ROOT + "learn/video/?id=" + encodeURIComponent(id)); },
    article: function (id) { return keep(ROOT + "learn/article/?id=" + encodeURIComponent(id)); },
    glossary: function (id) { return withHash(ROOT + "learn/glossary/", id); },
    pricing: ROOT + "#pricing",
    disclaimer: ROOT + "disclaimer/",
    root: ROOT
  };

  /* ---- Simple / Detailed --------------------------------------------------- */
  function mode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m === "simple" || m === "detailed") return m;
    } catch (e) {}
    return ACC.defaultMode[tier()] || "simple";
  }
  function apply(m) {
    document.documentElement.setAttribute("data-learn-mode", m);
    Array.prototype.forEach.call(document.querySelectorAll("[data-learn-mode-set]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-learn-mode-set") === m));
    });
    document.dispatchEvent(new CustomEvent("ca-learn-mode", { detail: { mode: m } }));
  }
  function setMode(m) {
    try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
    apply(m);
  }
  function modeToggle(extra) {
    var m = mode();
    function btn(v, label) {
      return '<button type="button" class="learn-mode__btn" data-learn-mode-set="' + v + '" aria-pressed="' + (m === v) + '">' + label + "</button>";
    }
    return '<div class="learn-mode' + (extra ? " " + extra : "") + '" role="group" aria-label="Explanations: simple or detailed">' +
      btn("simple", "Simple") + btn("detailed", "Detailed") + "</div>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-learn-mode-set]");
    if (b) setMode(b.getAttribute("data-learn-mode-set"));
  });
  document.documentElement.setAttribute("data-learn-mode", mode());

  /* ---- Simple-mode summaries ---------------------------------------------- */
  function summaryText(key, vars, caseKey) {
    var s = SUMMARIES[key];
    if (s && typeof s === "object") s = s.cases && s.cases[caseKey];
    if (!s) return "";
    return String(s).replace(/\{(\w+)\}/g, function (all, k) { return vars && vars[k] != null ? vars[k] : all; });
  }
  function summary(key, vars, caseKey) {
    var t = summaryText(key, vars, caseKey);
    return t ? '<p class="learn-summary">' + esc(t) + "</p>" : "";
  }

  /* ---- Building blocks ------------------------------------------------------ */
  var LOCK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var PLAY = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M19.5 15.5v17l14-8.5z" fill="currentColor"/></svg>';
  var ARROW = '<svg class="button__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
  var LOGOS = { btc: "bitcoin", eth: "ethereum" };

  function tierName(t) { return ACC.tierNames[t] || t; }
  // Small "Pro" label (the tier a locked item needs).
  function tierLabel(t) {
    return '<span class="learn-tier">' + LOCK + "<span>" + esc(tierName(t)) + "</span></span>";
  }
  function level(l) { return '<span class="learn-level learn-level--' + esc(String(l).toLowerCase()) + '">' + esc(l) + "</span>"; }
  function cta(href, label, cls, attrs) {
    return '<a class="button button--ghost learn-cta' + (cls ? " " + cls : "") + '" href="' + esc(href) + '"' + (attrs || "") + "><span>" + label + "</span>" + ARROW + "</a>";
  }
  function eduNote(cls) {
    return '<p class="learn-edu' + (cls ? " " + cls : "") + '">Education only, not financial advice. <a href="' + esc(url.disclaimer) + '">Read our disclaimer</a></p>';
  }
  function takeaways(list, id) {
    if (!list || !list.length) return "";
    var hid = (id || "takeaways") + "-title";
    return '<aside class="learn-takeaways" aria-labelledby="' + hid + '"><h2 class="learn-takeaways__title" id="' + hid + '">Key takeaways</h2>' +
      "<ul>" + list.slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></aside>";
  }
  function firstLine(text) {
    var m = String(text || "").match(/^.*?[.!?](\s|$)/);
    return (m ? m[0] : String(text || "")).trim();
  }

  function categoryLabel(id) {
    var c = (CFG.videoCategories || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.label : id;
  }
  // Video thumbnail: drawn, not an image file, so it never fails to load.
  // Asset videos show the coin's logo.
  function thumb(v, big) {
    var logo = v.asset && LOGOS[v.asset]
      ? '<img class="learn-thumb__logo" src="' + ROOT + "assets/logos/" + LOGOS[v.asset] + '-128.png" width="56" height="56" alt="">'
      : "";
    return '<span class="learn-thumb learn-thumb--' + esc(v.category) + (big ? " learn-thumb--big" : "") + '" aria-hidden="true">' +
      '<span class="learn-thumb__cat">' + esc(categoryLabel(v.category)) + "</span>" +
      '<span class="learn-thumb__mid">' + logo + '<span class="learn-thumb__play">' + PLAY + "</span></span>" +
      '<span class="learn-thumb__len">' + esc(v.length) + "</span></span>";
  }

  // A locked item: title, thumbnail, first line, the tier label and a
  // pricing link. Never an empty space.
  function locked(o) {
    return '<div class="learn-locked' + (o.thumb ? " learn-locked--thumb" : "") + '">' +
      (o.thumb || "") +
      '<div class="learn-locked__text">' +
        '<p class="learn-locked__title">' + (o.titleHtml || esc(o.title)) + " " + tierLabel(o.need) + "</p>" +
        '<p class="learn-locked__line">' + esc(o.line) + "</p>" +
        '<p class="learn-locked__more"><a href="' + esc(url.pricing) + '">See ' + esc(tierName(o.need)) + " pricing</a></p>" +
      "</div></div>";
  }

  // Video card: thumbnail, level, length, title, first line of the summary.
  function videoCard(v, opts) {
    var o = opts || {}, open = canVideo(v), href = url.video(v.id);
    var hTag = o.h || "h3";
    return '<article class="learn-card learn-vcard' + (open ? "" : " is-locked") + '" data-category="' + esc(v.category) + '">' +
      '<a class="learn-vcard__thumb" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">' + thumb(v) + "</a>" +
      '<p class="learn-card__meta">' + level(v.level) + '<span class="learn-card__len"><span class="dash-sr learn-sr">Length </span>' + esc(v.length) + "</span>" +
        (open ? "" : tierLabel(need(videoFeature(v)))) + "</p>" +
      "<" + hTag + ' class="learn-card__title"><a href="' + esc(href) + '">' + esc(v.title) + "</a></" + hTag + ">" +
      '<p class="learn-card__text">' + esc(open ? v.summary : firstLine(v.summary)) + "</p>" +
      (open ? "" : '<p class="learn-card__more"><a href="' + esc(url.pricing) + '">See ' + esc(tierName(need(videoFeature(v)))) + " pricing</a></p>") +
      "</article>";
  }

  function date(iso) {
    var d = new Date(iso + "T00:00:00Z");
    return d.getUTCDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  // Reading-list card. Real links open in a new tab; sample "#" links say so.
  function readingCard(r, opts) {
    var o = opts || {}, hTag = o.h || "h3";
    var external = /^https?:\/\//.test(r.url);
    var link = external
      ? cta(r.url, "Read at " + esc(r.outlet) + '<span class="learn-sr"> (opens in a new tab)</span>', "learn-rcard__link", ' target="_blank" rel="noopener noreferrer"')
      : cta(r.url || "#", "Read at " + esc(r.outlet) + '<span class="learn-sr"> (sample link)</span>', "learn-rcard__link");
    return '<article class="learn-card learn-rcard" data-outlet="' + esc(r.outlet) + '" data-topics="' + esc((r.topics || []).join(" ")) + '">' +
      '<p class="learn-card__meta">' + level(r.level) + (r.sample ? '<span class="learn-sample">Sample entry</span>' : "") + "</p>" +
      "<" + hTag + ' class="learn-card__title">' + esc(r.title) + "</" + hTag + ">" +
      '<p class="learn-rcard__source">' + esc(r.outlet) + ' · <time datetime="' + esc(r.date) + '">' + date(r.date) + "</time> · " + r.minutes + " min read</p>" +
      '<p class="learn-card__text">' + esc(r.summary) + "</p>" + link + "</article>";
  }

  function video(id) { return VIDEOS.filter(function (v) { return v.id === id; })[0] || null; }
  function article(id) { return ARTICLES.filter(function (a) { return a.id === id; })[0] || null; }
  function reading(id) { return READING.filter(function (r) { return r.id === id && (CFG.approvedOutlets || []).indexOf(r.outlet) !== -1; })[0] || null; }
  function readingList() { return READING.filter(function (r) { return (CFG.approvedOutlets || []).indexOf(r.outlet) !== -1; }); }

  /* ---- Asset pages: "Learn about [asset]" ---------------------------------- */
  function caseList(title, items, cls) {
    return '<div class="learn-case__col learn-case__col--' + cls + '"><h4 class="learn-case__title">' + title + "</h4><ul>" +
      (items || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
  }
  function learnAbout(asset) {
    var d = (window.CA_LEARN_ASSETS || {})[asset.id];
    if (!d) return "";
    var v = d.video ? video(d.video) : null;
    var reads = (d.reading || []).map(reading).filter(Boolean).slice(0, 3);
    var caseHtml = can("caseForAgainst")
      ? '<div class="learn-case">' + caseList("The case for", d.bull, "for") + caseList("The case against", d.bear, "against") + caseList("Key risks", d.risks, "risks") + "</div>"
      : locked({ title: "The case for and against " + asset.name, line: firstLine((d.bull || [])[0]) + " Plus the case against and key risks.", need: need("caseForAgainst") });
    return '<section class="dash-section learn-about" aria-labelledby="learn-about-title">' +
      '<h2 class="dash-section__title" id="learn-about-title">Learn about ' + esc(asset.name) + "</h2>" +
      '<div class="learn-about__grid' + (v ? "" : " learn-about__grid--novideo") + '">' +
        (v ? '<div class="learn-about__video"><h3 class="dash-panel-title">Explainer video</h3>' + videoCard(v, { h: "h4" }) + "</div>" : "") +
        '<div class="learn-about__case"><h3 class="dash-panel-title">The case for and against</h3>' + caseHtml + "</div>" +
      "</div>" +
      (reads.length ? '<h3 class="dash-panel-title learn-about__reading-title">Related reading</h3><div class="learn-grid learn-grid--reading">' +
        reads.map(function (r) { return readingCard(r, { h: "h4" }); }).join("") + "</div>" : "") +
      eduNote() +
      "</section>";
  }
  function assetTakeaways(asset) {
    var d = (window.CA_LEARN_ASSETS || {})[asset.id];
    return d ? takeaways(d.takeaways, "asset-takeaways") : "";
  }

  /* ---- Demo tier switcher (only with ?tier= in the address) ---------------- */
  function tierBar() {
    if (!forced || document.querySelector(".learn-tierbar")) return;
    var nav = document.createElement("nav");
    nav.className = "learn-tierbar";
    nav.setAttribute("aria-label", "Preview the education layer as (demo)");
    nav.innerHTML = '<span class="learn-tierbar__label">Preview as</span>' + ACC.tiers.map(function (t) {
      var p = new URLSearchParams(location.search);
      p.set("tier", t);
      return '<a href="?' + esc(p.toString()) + esc(location.hash) + '"' + (t === forced ? ' aria-current="true"' : "") + ">" + esc(tierName(t)) + "</a>";
    }).join("");
    document.body.appendChild(nav);
    document.body.classList.add("has-learn-tierbar");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tierBar);
  else tierBar();

  return {
    esc: esc, tier: tier, can: can, need: need, canVideo: canVideo, videoFeature: videoFeature, tierName: tierName, forcedTier: forced,
    mode: mode, setMode: setMode, modeToggle: modeToggle,
    summary: summary, summaryText: summaryText,
    url: url, keep: keep,
    tierLabel: tierLabel, level: level, cta: cta, eduNote: eduNote, takeaways: takeaways, firstLine: firstLine,
    thumb: thumb, locked: locked, videoCard: videoCard, readingCard: readingCard, date: date, categoryLabel: categoryLabel,
    video: video, article: article, reading: reading, readingList: readingList,
    learnAbout: learnAbout, assetTakeaways: assetTakeaways
  };
})();
