/*
 * The Learn pages, from <main data-learn-page="...">:
 *   hub       /learn/            Start here, explainer videos, reading list, glossary
 *   video     /learn/video/?id=  player, summary, Key takeaways, transcript, related terms
 *   article   /learn/article/?id= a Start here step, with Key takeaways
 *   glossary  /learn/glossary/   every explainer term, A–Z and searchable
 *
 * All content comes from learn/data/*.js. Each page is drawn once, as
 * the page loads, so nothing moves afterwards. The only thing saved is the
 * Start here progress (localStorage "ca-learn-path", step ids only).
 * Load after learn-core.js and explain.js.
 */
(function () {
  var main = document.querySelector("[data-learn-page]");
  if (!main) return;
  var L = window.CA_LEARN, X = window.CA_EXPLAIN, CFG = window.CA_LEARN_CONFIG;
  var esc = L.esc;
  var VIDEOS = window.CA_LEARN_VIDEOS || [];
  var ART = window.CA_LEARN_ARTICLES || { path: [], articles: [] };
  var TERMS = window.CA_LEARN_EXPLAINERS || {};
  var PATH_KEY = "ca-learn-path";
  var page = main.getAttribute("data-learn-page");
  var id = new URLSearchParams(location.search).get("id") || "";

  function q(sel) { return main.querySelector(sel); }

  /* ---- Start here progress ------------------------------------------------- */
  function done() {
    try {
      var v = JSON.parse(localStorage.getItem(PATH_KEY));
      return Array.isArray(v) ? v.filter(function (x) { return ART.path.indexOf(x) !== -1; }) : [];
    } catch (e) { return []; }
  }
  function setDone(stepId, on) {
    var d = done().filter(function (x) { return x !== stepId; });
    if (on) d.push(stepId);
    try { localStorage.setItem(PATH_KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }

  function termLinks(ids) {
    return '<ul class="learn-related">' + (ids || []).filter(function (t) { return TERMS[t]; }).map(function (t) {
      return '<li><a href="' + esc(L.url.glossary(t)) + '">' + esc(TERMS[t].term) + "</a>" + X.icon(t) + "</li>";
    }).join("") + "</ul>";
  }
  function modeField() {
    return '<div class="learn-mode-field"><span class="learn-mode-field__label">Explanations</span>' + L.modeToggle() + "</div>";
  }

  /* ---- Hub ----------------------------------------------------------------- */
  function hub() {
    var steps = ART.path.map(L.article).filter(Boolean);
    // Start here
    var path = q("[data-path]");
    path.innerHTML =
      L.summary("startHere") +
      '<div class="learn-progress"><p class="learn-progress__text" aria-live="polite"></p>' +
        '<span class="learn-progress__track" aria-hidden="true"><span class="learn-progress__fill"></span></span></div>' +
      '<ol class="learn-path">' + steps.map(function (a, i) {
        return '<li class="learn-path__step" data-step="' + esc(a.id) + '">' +
          '<label class="learn-path__check"><input type="checkbox" value="' + esc(a.id) + '"><span class="learn-sr">Mark “' + esc(a.title) + '” as done</span></label>' +
          '<span class="learn-path__num" aria-hidden="true">' + (i + 1) + "</span>" +
          '<div><h3 class="learn-path__title"><a href="' + esc(L.url.article(a.id)) + '">' + esc(a.title) + "</a></h3>" +
          '<p class="learn-path__meta">' + esc(a.summary) + " " + a.minutes + " min read.</p></div></li>";
      }).join("") + "</ol>";
    function syncPath() {
      var d = done();
      Array.prototype.forEach.call(path.querySelectorAll(".learn-path__step"), function (li) {
        var on = d.indexOf(li.getAttribute("data-step")) !== -1;
        li.classList.toggle("is-done", on);
        li.querySelector("input").checked = on;
      });
      path.querySelector(".learn-progress__text").textContent = d.length + " of " + steps.length + " done";
      path.querySelector(".learn-progress__fill").style.width = (d.length / steps.length * 100) + "%";
    }
    path.addEventListener("change", function (e) {
      if (e.target.type === "checkbox") { setDone(e.target.value, e.target.checked); syncPath(); }
    });
    syncPath();

    // Videos
    var vbox = q("[data-videos]");
    var cats = CFG.videoCategories;
    vbox.innerHTML = L.summary("videos") +
      '<div class="learn-filters"><div class="learn-chips" role="group" aria-label="Filter videos by topic">' +
        '<button type="button" class="learn-chip" data-cat="" aria-pressed="true">All</button>' +
        cats.map(function (c) { return '<button type="button" class="learn-chip" data-cat="' + esc(c.id) + '" aria-pressed="false">' + esc(c.label) + "</button>"; }).join("") +
      "</div></div>" +
      '<p class="learn-count" aria-live="polite"></p>' +
      '<div class="learn-grid">' + cats.map(function (c) {
        return VIDEOS.filter(function (v) { return v.category === c.id; }).map(function (v) { return L.videoCard(v); }).join("");
      }).join("") + "</div>";
    function filterVideos(cat) {
      var n = 0;
      Array.prototype.forEach.call(vbox.querySelectorAll(".learn-vcard"), function (c) {
        var show = !cat || c.getAttribute("data-category") === cat;
        c.hidden = !show;
        if (show) n++;
      });
      Array.prototype.forEach.call(vbox.querySelectorAll(".learn-chip"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === cat)); });
      vbox.querySelector(".learn-count").textContent = n + (n === 1 ? " video" : " videos") + (cat ? " in " + L.categoryLabel(cat) : "");
    }
    vbox.addEventListener("click", function (e) {
      var b = e.target.closest(".learn-chip");
      if (b) filterVideos(b.getAttribute("data-cat"));
    });
    filterVideos("");

    // Reading list. With no entries (production mode leaves out the
    // samples), the whole section is hidden.
    var rbox = q("[data-reading]");
    var list = L.readingList();
    if (!list.length) rbox.closest("section").hidden = true;
    else readingList();
    function readingList() {
      var outlets = CFG.approvedOutlets.filter(function (o) { return list.some(function (r) { return r.outlet === o; }); });
      rbox.innerHTML = L.summary("reading") +
        '<div class="learn-filters">' +
          '<label class="learn-field"><span class="learn-field__label">Topic</span><select class="learn-select" data-filter="topic"><option value="">All topics</option>' +
            CFG.topics.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.label) + "</option>"; }).join("") + "</select></label>" +
          '<label class="learn-field"><span class="learn-field__label">Outlet</span><select class="learn-select" data-filter="outlet"><option value="">All outlets</option>' +
            outlets.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + "</option>"; }).join("") + "</select></label>" +
        "</div>" +
        '<p class="learn-count" aria-live="polite"></p>' +
        '<div class="learn-grid learn-grid--reading">' + list.map(function (r) { return L.readingCard(r); }).join("") + "</div>" +
        '<p class="learn-empty" hidden>No articles match these filters.</p>';
      function filterReading() {
        var topic = rbox.querySelector('[data-filter="topic"]').value, outlet = rbox.querySelector('[data-filter="outlet"]').value, n = 0;
        Array.prototype.forEach.call(rbox.querySelectorAll(".learn-rcard"), function (c) {
          var show = (!topic || (" " + c.getAttribute("data-topics") + " ").indexOf(" " + topic + " ") !== -1) && (!outlet || c.getAttribute("data-outlet") === outlet);
          c.hidden = !show;
          if (show) n++;
        });
        rbox.querySelector(".learn-count").textContent = n + (n === 1 ? " article" : " articles");
        rbox.querySelector(".learn-empty").hidden = n > 0;
      }
      rbox.addEventListener("change", filterReading);
      filterReading();
    }

    // Glossary teaser
    var gbox = q("[data-glossary]");
    var picks = ["canary-score", "verdict", "whale-wallet", "hidden-sell-pressure", "liquidity-depth", "token-unlock", "fear-greed", "puell-multiple"];
    gbox.innerHTML = L.summary("glossary") +
      '<p class="learn-section__intro">' + Object.keys(TERMS).length + " terms, each explained in plain English. Tap the circled i for a quick look.</p>" +
      '<ul class="learn-terms">' + picks.filter(function (t) { return TERMS[t]; }).map(function (t) {
        return '<li><a href="' + esc(L.url.glossary(t)) + '">' + esc(TERMS[t].term) + "</a>" + X.icon(t) + "</li>";
      }).join("") + "</ul>" + L.cta(L.url.glossary(""), "Open the glossary");
  }

  /* ---- Video page ------------------------------------------------------------ */
  var PLAY = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M19.5 15.5v17l14-8.5z" fill="currentColor"/></svg>';

  // The embed for a video address, built only after "Play" is pressed.
  function embed(v) {
    var P = CFG.player, u = v.videoUrl, m, lang = P.captionLanguage || "en";
    var title = ' title="' + esc(v.title) + '"';
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) {
      return '<iframe src="' + P.youtubeHost + m[1] + "?autoplay=1&rel=0&cc_load_policy=1&cc_lang_pref=" + lang + "&hl=" + lang + '"' + title +
        ' allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    }
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
      return '<iframe src="' + P.vimeoHost + m[1] + "?autoplay=1&texttrack=" + lang + '"' + title +
        ' allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    if (/\.(mp4|webm)(\?|#|$)/i.test(u)) {
      return '<video controls autoplay playsinline src="' + esc(u) + '"' + title + ">" +
        (v.captionsUrl ? '<track kind="captions" src="' + esc(v.captionsUrl) + '" srclang="' + lang + '" label="Captions" default>' : "") + "</video>";
    }
    return '<p class="learn-player__soon"><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Open the video<span class="learn-sr"> (opens in a new tab)</span></a></p>';
  }
  function player(v) {
    if (!v.videoUrl) {
      return '<div class="learn-player" role="img" aria-label="Video coming soon">' +
        '<div class="learn-player__soon">' + PLAY + '<p class="learn-player__soon-title">Video coming soon</p>' +
        '<p class="learn-player__soon-note">This explainer is being recorded. Until then, the summary, takeaways and transcript below cover it.</p></div></div>';
    }
    return '<div class="learn-player" data-player><button type="button" class="learn-player__play">' + PLAY +
      "<span>Play video <span class=\"learn-sr\">“" + esc(v.title) + "”, </span>(" + esc(v.length) + ")</span></button></div>";
  }

  function videoPage() {
    var v = L.video(id);
    if (!v) return notFound("video");
    document.title = v.title + " — Learn — Canary Alpha Research";
    var open = L.canVideo(v), need = L.need(L.videoFeature(v));
    main.innerHTML =
      '<p class="learn-back"><a href="' + esc(L.url.learn) + '#videos">← Learn</a></p>' +
      '<header class="learn-head"><div><h1 class="learn-title">' + esc(v.title) + "</h1>" +
        '<p class="learn-meta">' + L.level(v.level) + "<span>" + esc(L.categoryLabel(v.category)) + "</span><span>" + esc(v.length) + "</span>" +
          (open ? "" : L.tierLabel(need)) + "</p></div>" + (open ? modeField() : "") + "</header>" +
      (open
        ? player(v) +
          '<div class="learn-body"><p>' + esc(v.summary) + "</p></div>" +
          L.takeaways(v.takeaways, "video-takeaways") +
          '<details class="learn-transcript"><summary>Full transcript</summary><div class="learn-transcript__body">' +
            v.transcript.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></details>" +
          (v.terms && v.terms.length ? '<section class="learn-section" aria-labelledby="terms-title"><h2 class="learn-section__title" id="terms-title">Related terms</h2>' + termLinks(v.terms) + "</section>" : "")
        : '<div class="learn-section">' + L.locked({ thumb: L.thumb(v, true), title: v.title, line: L.firstLine(v.summary), need: need }) + "</div>") +
      L.eduNote();
    var box = main.querySelector("[data-player]");
    if (box) box.addEventListener("click", function () { box.innerHTML = embed(v); }, { once: true });
  }

  /* ---- Article page ----------------------------------------------------------- */
  function articlePage() {
    var a = L.article(id);
    if (!a) return notFound("article");
    document.title = a.title + " — Learn — Canary Alpha Research";
    var step = ART.path.indexOf(a.id), prev = step > 0 ? L.article(ART.path[step - 1]) : null, next = step !== -1 ? L.article(ART.path[step + 1]) : null;
    var v = a.video ? L.video(a.video) : null;
    main.innerHTML =
      '<p class="learn-back"><a href="' + esc(L.url.learn) + '#start-here">← Learn</a></p>' +
      '<header class="learn-head"><div><h1 class="learn-title">' + esc(a.title) + "</h1>" +
        '<p class="learn-meta">' + (step !== -1 ? "<span>Start here, step " + (step + 1) + " of " + ART.path.length + "</span>" : "") +
        L.level(a.level) + "<span>" + a.minutes + " min read</span></p></div>" + modeField() + "</header>" +
      L.takeaways(a.takeaways, "article-takeaways") +
      '<div class="learn-body">' + a.sections.map(function (s) {
        return "<h2>" + esc(s.heading) + "</h2>" + s.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
          (s.detail || []).map(function (p) { return '<p class="learn-detail-only">' + esc(p) + "</p>"; }).join("");
      }).join("") + "</div>" +
      (v ? '<section class="learn-section" aria-labelledby="vid-title"><h2 class="learn-section__title" id="vid-title">Watch</h2><div class="learn-grid">' + L.videoCard(v) + "</div></section>" : "") +
      (a.terms && a.terms.length ? '<section class="learn-section" aria-labelledby="terms-title"><h2 class="learn-section__title" id="terms-title">Related terms</h2>' + termLinks(a.terms) + "</section>" : "") +
      (step !== -1 ? '<p><label class="learn-done"><input type="checkbox" data-done' + (done().indexOf(a.id) !== -1 ? " checked" : "") + "> Mark this step as done</label></p>" : "") +
      (step !== -1 ? '<nav class="learn-steps-nav" aria-label="Start here steps">' +
        (prev ? '<a href="' + esc(L.url.article(prev.id)) + '"><span>← Previous step</span><span>' + esc(prev.title) + "</span></a>" : "") +
        (next ? '<a class="learn-steps-nav__next" href="' + esc(L.url.article(next.id)) + '"><span>Next step →</span><span>' + esc(next.title) + "</span></a>"
              : '<a class="learn-steps-nav__next" href="' + esc(L.url.learn) + '#start-here"><span>All steps →</span><span>Back to Start here</span></a>') +
        "</nav>" : "") +
      L.eduNote();
    var box = main.querySelector("[data-done]");
    if (box) box.addEventListener("change", function () { setDone(a.id, box.checked); });
  }

  /* ---- Glossary page ---------------------------------------------------------- */
  function glossaryPage() {
    var ids = Object.keys(TERMS).sort(function (a, b) { return TERMS[a].term.localeCompare(TERMS[b].term); });
    var groups = {};
    ids.forEach(function (t) {
      var l = TERMS[t].term.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(l)) l = "#";
      (groups[l] = groups[l] || []).push(t);
    });
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    function part(label, text) { return text ? "<div><dt>" + label + "</dt><dd>" + esc(text) + "</dd></div>" : ""; }
    function more(e) {
      var lm = e.learnMore || {}, v = lm.video && L.video(lm.video), a = lm.article && L.article(lm.article);
      if (v) return '<p class="learn-gloss__more"><a href="' + esc(L.url.video(v.id)) + '">Watch: ' + esc(v.title) + "</a></p>";
      if (a) return '<p class="learn-gloss__more"><a href="' + esc(L.url.article(a.id)) + '">Read: ' + esc(a.title) + "</a></p>";
      return "";
    }
    q("[data-gloss-letters]").innerHTML = letters.map(function (l) {
      return "<li>" + (groups[l] ? '<a href="#letter-' + l + '">' + l + "</a>" : '<span aria-hidden="true">' + l + "</span>") + "</li>";
    }).join("");
    q("[data-gloss-list]").innerHTML = letters.filter(function (l) { return groups[l]; }).map(function (l) {
      return '<section class="learn-gloss__group" data-letter="' + l + '" aria-labelledby="letter-' + l + '"><h2 class="learn-gloss__letter" id="letter-' + l + '">' + l + "</h2>" +
        groups[l].map(function (t) {
          var e = TERMS[t];
          return '<article class="learn-gloss__term" id="' + esc(t) + '" data-search="' + esc((e.term + " " + e.means + " " + (e.group || "")).toLowerCase()) + '">' +
            '<h3 class="learn-gloss__name">' + esc(e.term) + '<span class="learn-gloss__group-tag">' + esc(e.group || "") + "</span>" +
              '<a class="learn-gloss__anchor" href="#' + esc(t) + '" aria-label="Link to ' + esc(e.term) + '">#</a></h3>' +
            '<dl class="learn-gloss__parts">' + part("What it means", e.means) + part("What it does", e.does) + part("Why it matters", e.matters) +
              part("How it changes the crypto space", e.changes) + "</dl>" + more(e) + "</article>";
        }).join("") + "</section>";
    }).join("");
    var input = q("[data-gloss-search]"), count = q("[data-gloss-count]"), empty = q("[data-gloss-empty]");
    function filter() {
      var s = input.value.trim().toLowerCase(), n = 0;
      Array.prototype.forEach.call(main.querySelectorAll(".learn-gloss__group"), function (g) {
        var any = false;
        Array.prototype.forEach.call(g.querySelectorAll(".learn-gloss__term"), function (t) {
          var show = !s || t.getAttribute("data-search").indexOf(s) !== -1;
          t.hidden = !show;
          if (show) { any = true; n++; }
        });
        g.hidden = !any;
      });
      count.textContent = n + (n === 1 ? " term" : " terms");
      empty.hidden = n > 0;
    }
    input.addEventListener("input", filter);
    filter();
  }

  function notFound(what) {
    main.innerHTML = '<p class="learn-back"><a href="' + esc(L.url.learn) + '">← Learn</a></p>' +
      '<h1 class="learn-title">Not found</h1><p class="learn-lead">There is no ' + what + " called “" + esc(id) + "”.</p>";
  }

  if (page === "hub") hub();
  if (page === "video") videoPage();
  if (page === "article") articlePage();
  if (page === "glossary") glossaryPage();
  // Pages without a mode toggle in their markup get it from the header slot.
  var slot = main.querySelector("[data-mode-slot]");
  if (slot) slot.outerHTML = modeField();

  // The page was drawn after the browser looked for #term in the address,
  // so go to it now (glossary terms, hub sections).
  var target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView({ behavior: "instant" });
})();
