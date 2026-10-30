/*
 * Font test panel: a design tool for trying fonts across the whole site.
 * Not a visitor feature. script.js loads this file only after the
 * page was opened with ?fonts=1 (remembered for the browser session in
 * sessionStorage; ?fonts=0 turns it off). font-compare/ loads it
 * directly for the font list and helpers (window.CAFonts).
 *
 * It sets the two site font tokens, --font-heading and --font-body, on
 * <html>. Fonts load only when picked (font-display: swap). localStorage
 * keeps the current pick and the favorites, nothing else.
 */
(function () {
  if (window.CAFonts) return;

  var STATE_KEY = "ca-font-test";
  var FAVS_KEY = "ca-font-test-favorites";
  var root = document.documentElement;
  var here = document.currentScript && document.currentScript.src;
  var repoRoot = here ? new URL("../", here).href : "../";

  // The site's own fonts (styles.css): "Current" puts these back.
  var CURRENT_HEADING = '"Satoshi", "Helvetica Neue", Helvetica, Arial, sans-serif';
  var CURRENT_BODY = '"Work Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
  var FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  var HEADINGS = "h1, h2, h3, h4, h5, h6, .dash-panel-title";
  var TRACK_MIN = -0.04, TRACK_MAX = 0.02;

  // css: Google Fonts family spec, or Fontshare font spec.
  var FONTS = [
    { id: "current", name: "Current", family: CURRENT_BODY, headingFamily: CURRENT_HEADING, note: "site fonts" },
    { id: "inter", name: "Inter", from: "google", css: "Inter:wght@400;500;600;700" },
    { id: "poppins", name: "Poppins", from: "google", css: "Poppins:wght@400;500;600;700" },
    { id: "manrope", name: "Manrope", from: "google", css: "Manrope:wght@400;500;600;700" },
    { id: "space-grotesk", name: "Space Grotesk", from: "google", css: "Space+Grotesk:wght@400;500;600;700" },
    { id: "work-sans", name: "Work Sans", from: "google", css: "Work+Sans:wght@400;500;600;700" },
    { id: "montserrat", name: "Montserrat", from: "google", css: "Montserrat:wght@400;500;600;700" },
    { id: "satoshi", name: "Satoshi", from: "fontshare", css: "satoshi@400,500,700", note: "no 600" },
    { id: "general-sans", name: "General Sans", from: "fontshare", css: "general-sans@400,500,600,700" },
    { id: "clash-grotesk", name: "Clash Grotesk", from: "fontshare", css: "clash-grotesk@400,500,600,700", headingOnly: true, note: "Headings only" },
    { id: "neue-montreal", name: "Neue Montreal", from: "local", licensed: true }
  ];
  FONTS.forEach(function (f) {
    if (!f.family) f.family = '"' + f.name + '", ' + FALLBACK;
  });

  function byId(id) {
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i];
    return FONTS[0];
  }

  // ---- Storage (only the pick and the favorites) ------------------------
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  var DEFAULT = { heading: "current", body: "current", weight: null, tracking: null, link: false };
  function getState() {
    var s = read(STATE_KEY, {});
    return {
      heading: byId(s.heading).id,
      body: byId(s.body).headingOnly ? "current" : byId(s.body).id,
      weight: [500, 600, 700].indexOf(s.weight) > -1 ? s.weight : null,
      tracking: typeof s.tracking === "number" ? Math.min(TRACK_MAX, Math.max(TRACK_MIN, s.tracking)) : null,
      link: !!s.link
    };
  }
  function getFavorites() {
    var f = read(FAVS_KEY, []);
    return Array.isArray(f) ? f : [];
  }

  // ---- Loading -----------------------------------------------------------
  // Neue Montreal is licensed: it loads from fonts/neue-montreal/ only if
  // the files are there (see fonts/neue-montreal/README.md).
  var NM_DIR = repoRoot + "fonts/neue-montreal/";
  var NM_FACES = [[400, "Regular"], [500, "Medium"], [700, "Bold"]];
  var nmCheck = null;
  function neueMontrealAvailable() {
    if (!nmCheck) {
      nmCheck = fetch(NM_DIR + "NeueMontreal-Regular.woff2", { method: "HEAD", cache: "no-store" })
        .then(function (r) { return r.ok; }, function () { return false; });
    }
    return nmCheck;
  }

  var loading = {};
  function addSheet(href) {
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
    return new Promise(function (done) { l.onload = l.onerror = done; });
  }
  function sheetUrl(f) {
    return f.from === "google"
      ? "https://fonts.googleapis.com/css2?family=" + f.css + "&display=swap"
      : "https://api.fontshare.com/v2/css?f[]=" + f.css + "&display=swap";
  }
  // Resolves once the font's regular and bold faces are ready (or failed).
  function load(id) {
    var f = byId(id);
    if (!f.from) return Promise.resolve(true);
    if (loading[id]) return loading[id];
    var css;
    if (f.from === "local") {
      css = neueMontrealAvailable().then(function (ok) {
        if (!ok) return false;
        var s = document.createElement("style");
        s.textContent = NM_FACES.map(function (w) {
          return '@font-face{font-family:"Neue Montreal";font-weight:' + w[0] +
            ';font-style:normal;font-display:swap;src:url("' + NM_DIR + "NeueMontreal-" + w[1] + '.woff2") format("woff2");}';
        }).join("");
        document.head.appendChild(s);
        return true;
      });
    } else {
      css = addSheet(sheetUrl(f)).then(function () { return true; });
    }
    loading[id] = css.then(function (ok) {
      if (!ok || !document.fonts) return ok;
      var done = function () { return isLoaded(f); };
      return Promise.all([
        document.fonts.load('400 1em "' + f.name + '"'),
        document.fonts.load('700 1em "' + f.name + '"')
      ]).then(done, done);
    });
    return loading[id];
  }

  // True once a face of the font has actually downloaded (a blocked or
  // missing font would otherwise be measured in its fallback).
  function isLoaded(f) {
    var ok = false;
    document.fonts.forEach(function (face) {
      if (face.family.replace(/["']/g, "") === f.name && face.status === "loaded") ok = true;
    });
    return ok;
  }

  // Tabular figures: with tabular-nums on, every digit is the same width.
  var tabCache = {};
  function tabular(id) {
    if (tabCache[id]) return tabCache[id];
    tabCache[id] = load(id).then(function (ok) {
      if (!ok) return null;
      var box = document.createElement("div");
      box.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:40px;font-variant-numeric:tabular-nums;font-family:" + byId(id).family;
      var a = document.createElement("span"), b = document.createElement("span");
      a.textContent = "1111111111";
      b.textContent = "0000000000";
      box.appendChild(a);
      box.appendChild(b);
      document.body.appendChild(box);
      var same = Math.abs(a.getBoundingClientRect().width - b.getBoundingClientRect().width) < 0.5;
      box.remove();
      return same;
    });
    return tabCache[id];
  }

  // ---- Applying ----------------------------------------------------------
  var overrides = null;
  function apply(s) {
    load(s.heading);
    load(s.body);
    var h = byId(s.heading), b = byId(s.body);
    if (h.id === "current") root.style.removeProperty("--font-heading");
    else root.style.setProperty("--font-heading", h.family);
    if (b.id === "current") root.style.removeProperty("--font-body");
    else root.style.setProperty("--font-body", b.family);
    var rules = "";
    if (s.weight) rules += "font-weight:" + s.weight + "!important;";
    if (s.tracking !== null) rules += "letter-spacing:" + s.tracking + "em!important;";
    if (rules && !overrides) {
      overrides = document.createElement("style");
      overrides.id = "font-panel-overrides";
      document.head.appendChild(overrides);
    }
    if (overrides) overrides.textContent = rules ? HEADINGS + "{" + rules + "}" : "";
  }

  function describe(s) {
    var h = byId(s.heading), b = byId(s.body);
    return [
      "Heading font: " + h.name + (h.id === "current" ? " (" + h.note + ")" : ""),
      "Body font: " + b.name + (b.id === "current" ? " (" + b.note + ")" : ""),
      "Heading weight: " + (s.weight || "site default (mostly 400/700)"),
      "Heading letter-spacing: " + (s.tracking === null ? "site default" : fmtTrack(s.tracking))
    ].join("\n");
  }
  function fmtTrack(t) { return (t > 0 ? "+" : "") + (+t).toFixed(3) + "em"; }
  function comboKey(s) { return [s.heading, s.body, s.weight || "", s.tracking === null ? "" : s.tracking].join("|"); }
  function comboName(s) {
    var n = byId(s.heading).name + " / " + byId(s.body).name;
    if (s.weight) n += " · " + s.weight;
    if (s.tracking !== null) n += " · " + fmtTrack(s.tracking);
    return n;
  }

  window.CAFonts = {
    FONTS: FONTS, byId: byId, load: load, tabular: tabular,
    getState: getState, getFavorites: getFavorites,
    setState: function (s) { write(STATE_KEY, s); },
    setFavorites: function (f) { write(FAVS_KEY, f); },
    comboKey: comboKey, comboName: comboName
  };

  // ---- Panel -------------------------------------------------------------
  var active = false;
  try { active = sessionStorage.getItem("ca-font-panel") === "1"; } catch (e) {}
  if (/[?&]fonts=1/.test(location.search)) active = true;
  if (!active) return;

  var state = getState();
  var favorites = getFavorites();
  apply(state);

  var css = document.createElement("style");
  css.textContent = [
    ".fp{position:fixed;right:1rem;bottom:4.5rem;z-index:60;font:13px/1.35 system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;color:var(--ink);letter-spacing:0;font-weight:400}",
    ".fp *{box-sizing:border-box}",
    ".fp button,.fp select{font:inherit;color:inherit;min-height:32px;min-width:0;padding:0 .5rem;border:1px solid var(--rule);border-radius:4px;background:var(--ground);cursor:pointer}",
    ".fp button:hover{background:var(--rule)}",
    ".fp :focus-visible{outline:2px solid var(--ink);outline-offset:1px}",
    ".fp__toggle{display:block;margin-left:auto;width:44px;height:44px;border-radius:50% !important;font-size:16px !important;font-weight:700 !important;box-shadow:0 2px 8px rgba(0,0,0,.15)}",
    ".fp__box{position:absolute;right:0;bottom:52px;width:min(20.5rem,calc(100vw - 2rem));max-height:calc(100vh - 9rem);overflow:auto;padding:.6rem .7rem .7rem;border:1px solid var(--rule);border-radius:8px;background:var(--ground);box-shadow:0 8px 28px rgba(0,0,0,.18)}",
    ".fp__box[hidden]{display:none}",
    ".fp__head{display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem}",
    ".fp__head strong{flex:1;font-weight:700}",
    ".fp__row{display:grid;grid-template-columns:4.6rem 32px 1fr 32px;align-items:center;gap:.3rem;margin:.3rem 0}",
    ".fp__row--2{grid-template-columns:4.6rem 1fr}",
    ".fp__row label,.fp__lab{color:var(--muted)}",
    ".fp__row select{width:100%}",
    ".fp__arrow{padding:0 !important}",
    ".fp__meta{display:flex;gap:.4rem;flex-wrap:wrap;margin:-.1rem 0 .2rem 4.9rem;color:var(--muted);font-size:12px}",
    ".fp__track{display:grid;grid-template-columns:4.6rem 1fr 4.2rem;align-items:center;gap:.3rem;margin:.3rem 0}",
    ".fp__track input{width:100%;margin:0;accent-color:var(--ink)}",
    ".fp__track output{text-align:right;font-variant-numeric:tabular-nums}",
    ".fp__check{display:flex;align-items:center;gap:.4rem;margin:.35rem 0;cursor:pointer}",
    ".fp__check input{margin:0;accent-color:var(--ink)}",
    ".fp__actions{display:flex;flex-wrap:wrap;gap:.35rem;margin:.55rem 0 .2rem}",
    ".fp__status{min-height:1.2em;margin:.2rem 0 0;color:var(--muted);font-size:12px}",
    ".fp__favs{margin:.45rem 0 0;padding:.45rem 0 0;border-top:1px solid var(--rule)}",
    ".fp__favs ul{list-style:none;margin:.3rem 0 0;padding:0;display:grid;gap:.25rem}",
    ".fp__favs li{display:flex;gap:.25rem}",
    ".fp__favs li button:first-child{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".fp__favs li button[aria-current]{border-color:var(--ink)}",
    ".fp__hint{margin:.5rem 0 0;color:var(--muted);font-size:11.5px}",
    ".fp kbd{font:inherit;padding:0 .2rem;border:1px solid var(--rule);border-radius:3px}"
  ].join("\n");
  document.head.appendChild(css);

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  var panel = el("div", { class: "fp", role: "region", "aria-label": "Font test panel" });
  var toggle = el("button", { type: "button", class: "fp__toggle", "aria-expanded": "false", "aria-controls": "fp-box", title: "Font test panel" }, "Aa");
  var box = el("div", { class: "fp__box", id: "fp-box", hidden: "" });
  panel.appendChild(box);
  panel.appendChild(toggle);

  var head = el("div", { class: "fp__head" });
  head.appendChild(el("strong", {}, "Font test"));
  var minimize = el("button", { type: "button", "aria-label": "Minimize font panel", title: "Minimize" }, "–");
  head.appendChild(minimize);
  box.appendChild(head);

  function fontRow(kind, label) {
    var row = el("div", { class: "fp__row" });
    var sel = el("select", { id: "fp-" + kind });
    var lab = el("label", { for: "fp-" + kind }, label);
    var prev = el("button", { type: "button", class: "fp__arrow", "aria-label": "Previous " + kind + " font" }, "‹");
    var next = el("button", { type: "button", class: "fp__arrow", "aria-label": "Next " + kind + " font" }, "›");
    row.appendChild(lab);
    row.appendChild(prev);
    row.appendChild(sel);
    row.appendChild(next);
    box.appendChild(row);
    var meta = el("div", { class: "fp__meta", "aria-live": "polite" });
    box.appendChild(meta);
    prev.addEventListener("click", function () { cycle(kind, -1); });
    next.addEventListener("click", function () { cycle(kind, 1); });
    sel.addEventListener("change", function () { pick(kind, sel.value); });
    // Option previews need the fonts: fetch the lists the first time a
    // list is used (never on page load).
    sel.addEventListener("pointerdown", previewAll);
    sel.addEventListener("focus", previewAll);
    return { sel: sel, meta: meta };
  }
  var H = fontRow("heading", "Heading");
  var B = fontRow("body", "Body");

  var linkLabel = el("label", { class: "fp__check" });
  var link = el("input", { type: "checkbox" });
  linkLabel.appendChild(link);
  linkLabel.appendChild(document.createTextNode("Link: same font for both"));
  box.appendChild(linkLabel);

  var wRow = el("div", { class: "fp__row fp__row--2" });
  var weight = el("select", { id: "fp-weight" });
  [["", "Site default"], ["500", "500"], ["600", "600"], ["700", "700"]].forEach(function (o) {
    weight.appendChild(el("option", { value: o[0] }, o[1]));
  });
  wRow.appendChild(el("label", { for: "fp-weight" }, "Weight"));
  wRow.appendChild(weight);
  box.appendChild(wRow);

  var tRow = el("div", { class: "fp__track" });
  var track = el("input", { type: "range", id: "fp-track", min: TRACK_MIN, max: TRACK_MAX, step: "0.005" });
  var trackOut = el("output", { for: "fp-track" });
  tRow.appendChild(el("label", { for: "fp-track" }, "Spacing"));
  tRow.appendChild(track);
  tRow.appendChild(trackOut);
  box.appendChild(tRow);

  var actions = el("div", { class: "fp__actions" });
  var star = el("button", { type: "button", "aria-pressed": "false" }, "☆ Favorite");
  var copy = el("button", { type: "button" }, "Copy settings");
  var reset = el("button", { type: "button" }, "Reset to current");
  actions.appendChild(star);
  actions.appendChild(copy);
  actions.appendChild(reset);
  box.appendChild(actions);
  var status = el("p", { class: "fp__status", role: "status" });
  box.appendChild(status);

  var favBox = el("div", { class: "fp__favs" });
  favBox.appendChild(el("div", { class: "fp__lab" }, "Favorites"));
  var favList = el("ul");
  favBox.appendChild(favList);
  box.appendChild(favBox);

  var hint = el("p", { class: "fp__hint" });
  hint.innerHTML = "<kbd>[</kbd> <kbd>]</kbd> body font · <kbd>Shift</kbd>+<kbd>[</kbd> <kbd>]</kbd> heading · " +
    "<a href=\"" + repoRoot + "font-compare/\">compare all</a> · <code>?fonts=0</code> turns this off";
  box.appendChild(hint);

  var nmOk = false;
  function choices(kind) {
    return FONTS.filter(function (f) {
      if (kind === "body" && f.headingOnly) return false;
      return !(f.licensed && !nmOk);
    });
  }
  function fillSelect(s, kind) {
    s.innerHTML = "";
    FONTS.forEach(function (f) {
      if (kind === "body" && f.headingOnly) return;
      var label = f.name;
      if (f.headingOnly) label += " — Headings only";
      if (f.licensed && !nmOk) label += " — License required — add font files to enable.";
      var o = el("option", { value: f.id }, label);
      o.style.fontFamily = f.family;
      if (f.licensed && !nmOk) o.disabled = true;
      s.appendChild(o);
    });
  }
  function fill() {
    fillSelect(H.sel, "heading");
    fillSelect(B.sel, "body");
    sync();
  }
  var previewed = false;
  function previewAll() {
    if (previewed) return;
    previewed = true;
    var g = FONTS.filter(function (f) { return f.from === "google"; })
      .map(function (f) { return "family=" + f.css.split(":")[0] + ":wght@400"; }).join("&");
    var fs = FONTS.filter(function (f) { return f.from === "fontshare"; })
      .map(function (f) { return "f[]=" + f.css.split("@")[0] + "@400"; }).join("&");
    addSheet("https://fonts.googleapis.com/css2?" + g + "&display=swap");
    addSheet("https://api.fontshare.com/v2/css?" + fs + "&display=swap");
    if (nmOk) load("neue-montreal");
  }

  function badge(meta, id) {
    var f = byId(id);
    meta.textContent = "";
    var t = el("span", {}, "Tabular numbers …");
    meta.appendChild(t);
    if (f.note && f.id !== "current") meta.appendChild(el("span", {}, "· " + f.note));
    tabular(id).then(function (ok) {
      if (byId(meta === H.meta ? state.heading : state.body).id !== id) return;
      t.textContent = ok === null ? "Not loaded" : "Tabular numbers " + (ok ? "✓" : "✗");
    });
  }

  function sync() {
    H.sel.value = state.heading;
    B.sel.value = state.body;
    link.checked = state.link;
    weight.value = state.weight ? String(state.weight) : "";
    track.value = state.tracking === null ? -0.015 : state.tracking;
    trackOut.textContent = state.tracking === null ? "default" : fmtTrack(state.tracking);
    badge(H.meta, state.heading);
    badge(B.meta, state.body);
    var key = comboKey(state);
    var isFav = favorites.some(function (f) { return comboKey(f) === key; });
    star.textContent = isFav ? "★ Favorited" : "☆ Favorite";
    star.setAttribute("aria-pressed", String(isFav));
    renderFavs();
  }

  function commit(msg) {
    apply(state);
    write(STATE_KEY, state);
    sync();
    say(msg || "");
  }
  var sayTimer = 0;
  function say(msg) {
    status.textContent = msg;
    clearTimeout(sayTimer);
    if (msg) sayTimer = setTimeout(function () { status.textContent = ""; }, 2500);
  }

  function pick(kind, id) {
    var f = byId(id);
    if (kind === "heading") {
      state.heading = f.id;
      if (state.link && !f.headingOnly) state.body = f.id;
    } else {
      state.body = f.id;
      if (state.link) state.heading = f.id;
    }
    commit(byId(kind === "heading" ? state.heading : state.body).name);
  }
  function cycle(kind, dir) {
    var list = choices(kind);
    var cur = kind === "heading" ? state.heading : state.body;
    var i = 0;
    for (var j = 0; j < list.length; j++) if (list[j].id === cur) i = j;
    pick(kind, list[(i + dir + list.length) % list.length].id);
  }

  link.addEventListener("change", function () {
    state.link = link.checked;
    if (state.link && !byId(state.heading).headingOnly) state.body = state.heading;
    commit(state.link ? "Linked" : "Unlinked");
  });
  weight.addEventListener("change", function () {
    state.weight = weight.value ? +weight.value : null;
    commit();
  });
  track.addEventListener("input", function () {
    state.tracking = +(+track.value).toFixed(3);
    commit();
  });
  star.addEventListener("click", function () {
    var key = comboKey(state);
    var had = favorites.some(function (f) { return comboKey(f) === key; });
    favorites = had
      ? favorites.filter(function (f) { return comboKey(f) !== key; })
      : favorites.concat([{ heading: state.heading, body: state.body, weight: state.weight, tracking: state.tracking }]);
    write(FAVS_KEY, favorites);
    sync();
    say(had ? "Removed from favorites" : "Added to favorites");
  });
  copy.addEventListener("click", function () {
    var text = describe(state);
    var done = function () { say("Copied"); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  });
  function fallbackCopy(text) {
    var t = el("textarea", { readonly: "", style: "position:fixed;left:-9999px;top:0" });
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove();
  }
  reset.addEventListener("click", function () {
    state = { heading: "current", body: "current", weight: null, tracking: null, link: state.link };
    commit("Back to the current font");
  });

  function renderFavs() {
    favList.innerHTML = "";
    if (!favorites.length) {
      favList.appendChild(el("li", { class: "fp__lab" }, "None yet. Press ☆ to save a combination."));
      return;
    }
    var key = comboKey(state);
    favorites.forEach(function (f, i) {
      var li = el("li");
      var use = el("button", { type: "button", title: "Apply " + comboName(f) }, comboName(f));
      if (comboKey(f) === key) use.setAttribute("aria-current", "true");
      var del = el("button", { type: "button", "aria-label": "Remove " + comboName(f) }, "×");
      use.addEventListener("click", function () {
        state = { heading: byId(f.heading).id, body: byId(f.body).id, weight: f.weight || null,
          tracking: typeof f.tracking === "number" ? f.tracking : null, link: false };
        commit("Applied " + comboName(f));
      });
      del.addEventListener("click", function () {
        favorites.splice(i, 1);
        write(FAVS_KEY, favorites);
        sync();
      });
      li.appendChild(use);
      li.appendChild(del);
      favList.appendChild(li);
    });
  }

  // Open / minimize.
  function setOpen(open) {
    box.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Minimize font panel" : "Open font panel");
  }
  toggle.addEventListener("click", function () { setOpen(box.hidden); });
  minimize.addEventListener("click", function () { setOpen(false); toggle.focus(); });
  box.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setOpen(false); toggle.focus(); }
  });

  // Shortcuts: ] / [ body font, Shift+] / Shift+[ heading font.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code !== "BracketRight" && e.code !== "BracketLeft") return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    cycle(e.shiftKey ? "heading" : "body", e.code === "BracketRight" ? 1 : -1);
  });

  setOpen(false);
  fill();
  document.body.appendChild(panel);
  neueMontrealAvailable().then(function (ok) {
    nmOk = ok;
    fill();
  });
})();
