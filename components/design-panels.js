/*
 * Design panel, for the site owner only. Loaded only when the address has
 * ?design=1 (kept for the tab's session; ?design=0 turns it off): by
 * index.html on the homepage and by the small loaders on Learn, the
 * glossary and Sign up. Visitors never get it.
 *
 * Desktop, Tablet and Phone each have their own complete settings. Three
 * tabs at the top choose which device every section shows and edits; the
 * screen sizes are the site's one set (styles.css, dot-globe.js): phone
 * under 768px, tablet 768-1199px, desktop 1200px and up. Sections:
 *   Headline    alignment, vertical position (desktop), X/Y offsets,
 *               headline and subheading sizes, a line count (1-4) reached by
 *               narrowing the headline, never by cutting words.
 *   Buttons     alignment, label size, order (Learn more or Sign up first).
 *   Globe       show or hide, size, max size, position, layer, the dots and
 *               the rotation (defaults: components/dot-globe.config.js).
 *   Background  the page colour (--ground) for Light and for Dark, with a
 *               live WCAG AA check of the text, buttons and dots on it.
 *   Header      at the top of the page, and after scrolling.
 * Headline, Buttons and Globe show on the homepage only; Background and
 * Header on every page that loads the panel.
 *
 * Helpers: Copy from Desktop / Copy from Tablet (on the Tablet and Phone
 * tabs), Copy this device, Reset this device, and at the foot Copy
 * settings (all three devices as one block, labelled by device) and Reset
 * all. Everything is saved in this browser (localStorage "ca-design-v2",
 * nothing is sent anywhere). Settings saved by the older panel (one key per
 * section) are carried over once, and left in place. Saved settings only
 * apply while design mode is on; with it off the page shows the defaults in
 * code.
 *
 * Two other modes, for the device simulator (design/simulator/):
 *   ?sim=1      inside a simulator frame: no panel; the saved settings are
 *               applied (each frame uses its own device's, by its width),
 *               and re-applied whenever they change (the storage event).
 *   simulator   on the simulator page (<body data-design-simulator>): the
 *               panel with every section; choosing a tab sends
 *               "design:device", and the simulator highlights that frame.
 */
(function () {
  "use strict";
  var KEY = "ca-design-v2";
  var OLD = { headline: "ca-design-headline", globe: "ca-design-globe", background: "ca-design-background" };
  var SIM = /[?&]sim=1(?:&|$)/.test(location.search);
  var CONTROLLER = !!document.querySelector("[data-design-simulator]");
  var hero = document.querySelector(".hero");
  var title = document.querySelector(".hero__title");
  var sub = document.querySelector(".hero__text");
  var foot = document.querySelector(".hero__foot");
  var HAS_HERO = !!(hero && title);
  var DEVS = ["desktop", "tablet", "phone"];
  var NAMES = { desktop: "Desktop", tablet: "Tablet", phone: "Phone" };
  var RANGES = { desktop: "1200px and up", tablet: "768-1199px", phone: "under 768px" };
  var Q = { desktop: "(min-width: 1200px)", tablet: "(min-width: 768px) and (max-width: 1199px)", phone: "(max-width: 767px)" };

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function bp() { return innerWidth >= 1200 ? "desktop" : innerWidth >= 768 ? "tablet" : "phone"; }
  function copyText(text, status) {
    function done(ok) {
      var old = status.parentNode.querySelector(".ca-dpanel__copybox");
      if (old) old.remove();
      status.textContent = ok ? "Copied" : "Couldn't copy automatically: select the text below and copy it";
      if (ok) return;
      var box = document.createElement("textarea");
      box.className = "ca-dpanel__copybox";
      box.readOnly = true; box.rows = 6; box.value = text;
      box.setAttribute("aria-label", "Settings to copy");
      status.parentNode.appendChild(box);
      box.focus(); box.select();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
    else done(fallback());
  }

  // ---- Colour maths (WCAG 2.x relative luminance and contrast) ----
  function hexOk(h) { return /^#[0-9a-f]{6}$/i.test(h); }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function lum(hex) {
    return rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(fg, bg, a) {
    var f = rgb(fg), g = rgb(bg);
    return "#" + f.map(function (v, i) { return ("0" + Math.round(v * a + g[i] * (1 - a)).toString(16)).slice(-2); }).join("");
  }
  // The globe's own test (isDark in dot-globe.js): weighted sRGB under 0.5.
  function darkGround(hex) { var c = rgb(hex); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 < 0.5; }

  // ======================= Defaults =======================
  // The site's own values; null sizes mean "the site's CSS".
  var HEAD_DEF = {
    desktop: { align: "left", vertical: "top", offsetX: 0, offsetY: 0, headline: null, subheading: null, lines: 3 },
    tablet: { align: "left", vertical: "top", offsetX: 0, offsetY: 0, headline: null, subheading: null, lines: 2 },
    phone: { align: "left", vertical: "top", offsetX: 0, offsetY: 0, headline: null, subheading: null, lines: 0 }
  };
  // Desktop: the buttons sit right of the text; below 1200px, under it.
  var BTN_DEF = {
    desktop: { align: "right", size: 16, order: "learn" },
    tablet: { align: "left", size: 16, order: "learn" },
    phone: { align: "left", size: 16, order: "learn" }
  };
  var BG_DEF = { light: "#ffffff", dark: "#000000" };
  var HDR_DEF = { top: "transparent", scroll: "solid" };
  var TOKENS = { light: { ink: "#000000", muted: "#595959" }, dark: { ink: "#ffffff", muted: "#a3a3a3" } };
  var CANARY = "#ffef00";
  var PRESETS = {
    dark: [["#000000", "Black (now)"], ["#0a0a0a", "Near-black"], ["#0d0b08", "Warm near-black"], ["#080a0e", "Cool near-black"],
           ["#121212", "Soft black"], ["#1c1c1c", "Deep charcoal"], ["#17150a", "Dark canary"]],
    light: [["#ffffff", "White (now)"], ["#fafaf7", "Off-white"], ["#f7f4ec", "Warm off-white"], ["#f4f6f9", "Cool off-white"],
            ["#efefef", "Light grey"], ["#fffbe6", "Pale canary"]]
  };
  // Globe: components/dot-globe.config.js; each device = the shared values
  // with that device's own entry over them.
  var GLOBE_DEF = clone(window.CA_DOT_GLOBE_DEFAULTS || (window.CA_DOT_GLOBE && window.CA_DOT_GLOBE.defaults) || {});
  var GLOBE_KEYS = ["visible", "size", "maxSize", "x", "offsetX", "y", "offsetY", "layer",
    "dots", "dotsPhone", "dotSize", "dotColor", "dotOpacity", "autoRotate", "speed", "direction", "startLon", "tilt"];
  function globeDef(d) {
    var all = Object.assign({ visible: true, size: 50, maxSize: 860, x: "center", offsetX: 0, y: "middle", offsetY: 0, layer: "behind" }, GLOBE_DEF);
    delete all.devices;
    Object.assign(all, (GLOBE_DEF.devices || {})[d] || {});
    var out = {};
    GLOBE_KEYS.forEach(function (k) { if (k in all) out[k] = clone(all[k]); });
    return out;
  }
  function deviceDef(d) {
    return { headline: clone(HEAD_DEF[d]), buttons: clone(BTN_DEF[d]), globe: globeDef(d), background: clone(BG_DEF), header: clone(HDR_DEF) };
  }
  function defaults() { var s = {}; DEVS.forEach(function (d) { s[d] = deviceDef(d); }); return s; }

  // ======================= Saved settings =======================
  // Saved values over the defaults: known keys only, valid colours only.
  function mergeDev(d, saved) {
    var out = deviceDef(d);
    if (!saved || typeof saved !== "object") return out;
    Object.keys(out).forEach(function (g) {
      var sv = saved[g];
      if (!sv || typeof sv !== "object") return;
      Object.keys(out[g]).forEach(function (k) {
        if (!(k in sv) || sv[k] === undefined) return;
        var v = sv[k];
        if ((k === "dotColor" || k === "dotOpacity") && v && typeof v === "object") v = Object.assign({}, out[g][k], v);
        out[g][k] = clone(v);
      });
    });
    ["light", "dark"].forEach(function (m) { if (!hexOk(out.background[m])) out.background[m] = BG_DEF[m]; else out.background[m] = out.background[m].toLowerCase(); });
    return out;
  }
  // The older panel saved one key per section (headline position for every
  // size, globe shared values plus one entry per size, one background).
  function migrate() {
    var a = load(OLD.headline), b = load(OLD.globe), c = load(OLD.background), s = {};
    if (!a && !b && !c) return null;
    DEVS.forEach(function (d) {
      var dev = {};
      if (a && typeof a === "object") {
        var sz = (a.sizes || {})[d] || {};
        dev.headline = { align: a.align, vertical: a.vertical, offsetX: a.offsetX, offsetY: a.offsetY, headline: sz.headline, subheading: sz.subheading, lines: sz.lines };
      }
      if (b && typeof b === "object") {
        var g = {};
        Object.keys(b).forEach(function (k) { if (k !== "devices") g[k] = b[k]; });
        dev.globe = Object.assign(g, (b.devices || {})[d] || {});
      }
      if (c && typeof c === "object") dev.background = { light: c.light && c.light.ground, dark: c.dark && c.dark.ground };
      s[d] = dev;
    });
    return s;
  }
  function read() {
    var raw = load(KEY), migrated = false;
    if (!raw || typeof raw !== "object") { raw = migrate(); migrated = !!raw; }
    var s = {};
    DEVS.forEach(function (d) { s[d] = mergeDev(d, raw && raw[d]); });
    if (migrated) save(KEY, s);
    return s;
  }
  var S = read();
  function commit() { save(KEY, S); apply(); }

  // ======================= Applying =======================
  var styleEl = document.head.appendChild(document.createElement("style"));
  styleEl.id = "ca-design-css";
  var warnEl = null;

  // One device's CSS, inside its own media query.
  function cssDevice(d) {
    var s = S[d], h = s.headline, b = s.buttons, r = [];
    if (HAS_HERO) {
      var dx = (+h.offsetX || 0) + "px", dy = (+h.offsetY || 0) + "px";
      if (d === "desktop") {
        // The headline is its own layer, placed anywhere in the hero.
        var hx = h.align === "center" ? "-50%" : "0px", vy = h.vertical === "middle" ? "-50%" : "0px";
        r.push(".hero .hero__title{" +
          (h.align === "right" ? "left:auto;right:var(--pad);" : h.align === "center" ? "left:50%;right:auto;" : "") +
          (h.vertical === "middle" ? "top:50%;" : h.vertical === "bottom" ? "top:auto;bottom:calc(var(--arrow-clear) + var(--ca-foot-h, 6rem) + 2rem);" : "") +
          "text-align:" + h.align + ";transform:translate(calc(" + hx + " + " + dx + "),calc(" + vy + " + " + dy + "));}");
      } else {
        // Stacked in the page's flow: alignment and offsets only.
        r.push(".hero .hero__title{text-align:" + h.align + ";" +
          (h.align === "center" ? "margin-inline:auto;" : h.align === "right" ? "margin-left:auto;margin-right:0;" : "") +
          "transform:translate(" + dx + "," + dy + ");}");
      }
      if (h.headline) r.push(".hero .hero__title{font-size:" + h.headline + "px;}");
      if (h.subheading) r.push(".hero .hero__foot .hero__text{font-size:" + h.subheading + "px;}");
      // Buttons.
      if (+b.size && +b.size !== 16) r.push(".hero .hero__actions .button.button{font-size:" + (+b.size) + "px;}");
      if (b.order === "signup") r.push(".hero .hero__actions .hero__btn--main{order:-1;}");
      if (d === "desktop") {
        if (b.align === "left") r.push(".hero .hero__foot{justify-content:flex-start;}");
        else if (b.align === "center") r.push(".hero .hero__actions{margin-inline:auto;}");
      } else if (b.align === "center") {
        r.push(".hero .hero__actions{align-self:stretch;justify-content:center;margin-left:0;}");
      } else if (b.align === "right") {
        r.push(".hero .hero__actions{align-self:stretch;justify-content:flex-end;margin-left:0;margin-right:calc(-1 * min(var(--hero-btn-pad, 19px), var(--pad)));}");
      }
    }
    // Background.
    r.push(':root,:root[data-theme="light"]{--ground:' + s.background.light + ";}");
    r.push('@media (prefers-color-scheme: dark){:root:not([data-theme]){--ground:' + s.background.dark + ";}}");
    r.push(':root[data-theme="dark"]{--ground:' + s.background.dark + ";}");
    // Header.
    if (s.header.top === "solid") r.push(".site-header{background:var(--ground);}");
    if (s.header.scroll === "solid-noline") r.push(".site-header.is-scrolled{border-bottom-color:transparent;}");
    else if (s.header.scroll === "transparent") r.push(".site-header.is-scrolled{background:transparent;border-bottom-color:transparent;}");
    return "@media " + Q[d] + "{" + r.join("") + "}";
  }

  // Lines the headline takes now (distinct line tops of its text).
  function lineCount() {
    var r = document.createRange();
    r.selectNodeContents(title);
    var tops = {};
    Array.prototype.forEach.call(r.getClientRects(), function (x) { if (x.width > 1) tops[Math.round(x.top)] = 1; });
    return Object.keys(tops).length;
  }
  function longestWord() {
    var probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit";
    title.appendChild(probe);
    var max = 0;
    title.firstChild.textContent.split(/\s+/).forEach(function (w) { probe.textContent = w; max = Math.max(max, probe.getBoundingClientRect().width); });
    probe.remove();
    return Math.ceil(max) + 1;
  }
  function available() {
    // --pad is a raw custom property value, often in rem ("2.5rem").
    var v = getComputedStyle(hero).getPropertyValue("--pad"), pad = parseFloat(v) || 16;
    if (/rem\s*$/.test(v)) pad *= parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return Math.floor(hero.clientWidth - 2 * pad);
  }
  function warn(t) { if (warnEl) warnEl.textContent = t; }
  // Narrow the headline until it takes `n` lines (this screen's device); warn when it can't.
  function fitLines() {
    var n = S[bp()].headline.lines | 0;
    title.style.maxWidth = "";
    warn("");
    if (!n) return;
    var hi = available(), lo = Math.min(hi, longestWord());
    title.style.maxWidth = hi + "px";
    var most = lineCount();
    title.style.maxWidth = lo + "px";
    var least = lineCount();
    if (most > n) { title.style.maxWidth = hi + "px"; return warn("Doesn't fit in " + n + " line" + (n > 1 ? "s" : "") + " at this size: it needs at least " + most + ". Make the headline smaller."); }
    if (least < n) { title.style.maxWidth = lo + "px"; return warn("At this size the headline can't take " + n + " lines without cutting words: " + least + " is the most."); }
    while (hi - lo > 1) {
      var mid = (hi + lo) >> 1;
      title.style.maxWidth = mid + "px";
      if (lineCount() <= n) hi = mid; else lo = mid;
    }
    title.style.maxWidth = hi + "px";
  }

  function globe() { return window.CA_DOT_GLOBE && window.CA_DOT_GLOBE.instances[0]; }
  // The globe gets every device's settings; it uses the one for its width.
  // Only a real change is sent, so its spin never restarts for nothing.
  var sentGlobe = "";
  function pushGlobe() {
    var g = globe();
    if (!g) return;
    var devs = {};
    DEVS.forEach(function (d) { devs[d] = clone(S[d].globe); });
    var j = JSON.stringify(devs);
    if (j !== sentGlobe) { sentGlobe = j; g.set({ devices: devs }); }
    else g.themeChanged(); // dots follow a new background (light or dark set)
  }
  function apply() {
    styleEl.textContent = DEVS.map(cssDevice).join("\n");
    if (HAS_HERO) {
      if (foot) hero.style.setProperty("--ca-foot-h", foot.offsetHeight + "px");
      fitLines();
      pushGlobe();
    }
  }
  apply();
  if (HAS_HERO && !globe()) document.addEventListener("dot-globe:ready", pushGlobe, { once: true });

  // Settings changed in another tab, or in the simulator's panel: re-apply.
  var ui = null;
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY && e.key !== null) return;
    S = read(); apply();
    if (ui) ui.refresh();
  });
  window.addEventListener("resize", function () { if (HAS_HERO) fitLines(); });
  // The line count is measured in the site's fonts: fit again once they load.
  if (HAS_HERO && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitLines(); });

  // Inside a simulator frame: apply only, no panel. Phones and tablets have
  // overlay scrollbars, so the frame hides its own to keep the full width.
  if (SIM) {
    var noBars = document.head.appendChild(document.createElement("style"));
    noBars.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";
    return;
  }

  // ======================= The panel =======================
  var uid = 0;
  // A labelled control. spec: { type: range|select|check|color, label, min,
  // max, step, unit, fmt, options: [[value, label]] }. show(null) shows the
  // range at `fallback` with "site's own" as its value.
  function control(parent, spec, onInput) {
    var id = "ca-dp-" + (++uid), row = document.createElement("div"), html;
    row.className = "ca-dpanel__row ca-dpanel__row--" + spec.type;
    if (spec.type === "range") {
      html = '<label for="' + id + '">' + esc(spec.label) + '</label><input id="' + id + '" type="range" min="' + spec.min + '" max="' + spec.max + '" step="' + (spec.step || 1) + '">' +
        '<output for="' + id + '"></output>';
    } else if (spec.type === "select") {
      html = '<label for="' + id + '">' + esc(spec.label) + '</label><select id="' + id + '">' +
        spec.options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("") + "</select>";
    } else if (spec.type === "check") {
      html = '<label class="ca-dpanel__check"><input id="' + id + '" type="checkbox"> ' + esc(spec.label) + "</label>";
    } else if (spec.type === "color") {
      html = '<label for="' + id + '">' + esc(spec.label) + '</label><input id="' + id + '" type="color">';
    }
    row.innerHTML = html;
    parent.appendChild(row);
    var input = row.querySelector("input,select"), out = row.querySelector("output");
    function label(v) { return (spec.fmt ? spec.fmt(+v) : v) + (spec.unit || ""); }
    function show(v, fallback) {
      if (spec.type === "check") input.checked = !!v;
      else if (v === null || v === undefined || v === "") { input.value = fallback != null ? fallback : ""; if (out) out.textContent = fallback != null ? label(fallback) + " (site's own)" : "site's own"; return; }
      else input.value = v;
      if (out) out.textContent = label(v);
    }
    input.addEventListener("input", function () {
      var v = spec.type === "check" ? input.checked : spec.type === "range" ? +input.value : input.value;
      if (spec.type === "select" && spec.number) v = +v;
      if (out) out.textContent = label(v);
      onInput(v);
    });
    return { row: row, input: input, show: show };
  }
  function heading(parent, text) {
    var h = document.createElement("p");
    h.className = "ca-dpanel__group";
    h.textContent = text;
    parent.appendChild(h);
    return h;
  }
  function hint(parent, text) {
    var p = document.createElement("p");
    p.className = "ca-dpanel__hint";
    if (text) p.textContent = text;
    parent.appendChild(p);
    return p;
  }
  function button(parent, text, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", fn);
    parent.appendChild(b);
    return b;
  }

  // The device being edited: the window's own size at first, then the tab chosen.
  var cur = sget("ca-dpanel-device");
  if (DEVS.indexOf(cur) < 0) cur = bp();

  // Panel shell.
  var box = document.createElement("section");
  box.className = "ca-dpanel" + (CONTROLLER ? " ca-dpanel--docked" : "");
  box.id = "ca-dpanel";
  box.setAttribute("aria-label", "Design panel");
  var collapsed = !CONTROLLER && innerWidth < 700; // phones start collapsed (it would cover the hero)
  var cs = sget("ca-dpanel-collapsed");
  if (cs !== null && !CONTROLLER) collapsed = cs === "1";
  box.innerHTML =
    '<div class="ca-dpanel__head"><button type="button" class="ca-dpanel__toggle" aria-expanded="' + !collapsed + '" aria-controls="ca-dpanel-body">' +
    '<span>Design</span><span class="ca-dpanel__chev" aria-hidden="true"></span></button></div>' +
    '<div class="ca-dpanel__tabs" role="tablist" aria-label="Device"' + (collapsed ? " hidden" : "") + '>' +
    DEVS.map(function (d) { return '<button type="button" role="tab" id="ca-dtab-' + d + '" aria-controls="ca-dpanel-body" data-device="' + d + '">' + NAMES[d] + "</button>"; }).join("") +
    "</div>" +
    '<div class="ca-dpanel__body" id="ca-dpanel-body" role="tabpanel"' + (collapsed ? " hidden" : "") + '>' +
    '<p class="ca-dpanel__ranges">Phone under 768px · Tablet 768-1199px · Desktop 1200px and up</p>' +
    '<p class="ca-dpanel__note" role="status"></p>' +
    '<div class="ca-dpanel__tools"></div>' +
    '<div class="ca-dpanel__sections"></div></div>' +
    '<div class="ca-dpanel__foot ca-dpanel__foot--all"' + (collapsed ? " hidden" : "") + '>' +
    '<button type="button" data-act="copy-all">Copy settings</button><button type="button" data-act="reset-all">Reset all</button>' +
    '<span class="ca-dpanel__status" role="status" aria-live="polite"></span></div>';
  var panelBody = box.querySelector(".ca-dpanel__body");
  var sectionsEl = box.querySelector(".ca-dpanel__sections");
  var tabsEl = box.querySelector(".ca-dpanel__tabs");
  var noteEl = box.querySelector(".ca-dpanel__note");
  var toolsEl = box.querySelector(".ca-dpanel__tools");
  var footAll = box.querySelector(".ca-dpanel__foot--all");
  var allStatus = footAll.querySelector(".ca-dpanel__status");
  var toggle = box.querySelector(".ca-dpanel__toggle");
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panelBody.hidden = tabsEl.hidden = footAll.hidden = !open;
    sset("ca-dpanel-collapsed", open ? "0" : "1");
  });
  (document.querySelector("[data-design-panel-home]") || document.body).appendChild(box);

  // Device helpers: copy from another device, copy or reset this one.
  var toolStatus = document.createElement("span");
  toolStatus.className = "ca-dpanel__status";
  toolStatus.setAttribute("role", "status");
  toolStatus.setAttribute("aria-live", "polite");
  var fromDesktop = button(toolsEl, "Copy from Desktop", function () { copyFrom("desktop"); });
  var fromTablet = button(toolsEl, "Copy from Tablet", function () { copyFrom("tablet"); });
  button(toolsEl, "Copy this device", function () {
    var o = {}; o[cur] = S[cur];
    copyText(label() + "\n" + JSON.stringify(o, null, 2), toolStatus);
  });
  button(toolsEl, "Reset this device", function () {
    S[cur] = deviceDef(cur); commit(); showAll();
    toolStatus.textContent = NAMES[cur] + " is back to the defaults.";
  });
  toolsEl.appendChild(toolStatus);
  function copyFrom(d) {
    S[cur] = clone(S[d]); commit(); showAll();
    toolStatus.textContent = NAMES[cur] + " now starts from " + NAMES[d] + "'s settings.";
  }
  function label() { return "Canary Alpha design settings: " + NAMES[cur] + " (" + RANGES[cur] + ")"; }

  box.querySelector('[data-act="copy-all"]').addEventListener("click", function () {
    var o = { screenSizes: RANGES };
    DEVS.forEach(function (d) { o[d] = S[d]; });
    copyText("Canary Alpha design settings: Desktop, Tablet and Phone\n" + JSON.stringify(o, null, 2), allStatus);
  });
  box.querySelector('[data-act="reset-all"]').addEventListener("click", function () {
    // Saved as defaults (not removed), so the older panel's settings aren't carried over again.
    S = defaults(); commit(); showAll();
    allStatus.textContent = "Every device is back to the defaults.";
  });

  // A collapsible section with its "Editing: Tablet" label.
  var shows = [], labels = [], refreshBg = function () {};
  function section(key, name, startOpen) {
    var id = "ca-dsec-" + key, open = startOpen, s = sget(id);
    if (s !== null) open = s === "1";
    var sec = document.createElement("div");
    sec.className = "ca-dsec";
    sec.innerHTML = '<h3 class="ca-dsec__head"><button type="button" class="ca-dsec__toggle" aria-expanded="' + open + '" aria-controls="' + id + '">' +
      '<span>' + esc(name) + '</span><span class="ca-dpanel__chev" aria-hidden="true"></span></button></h3>' +
      '<div class="ca-dsec__body" id="' + id + '"' + (open ? "" : " hidden") + '><p class="ca-dsec__editing"></p><div class="ca-dsec__controls"></div></div>';
    var t = sec.querySelector(".ca-dsec__toggle"), body = sec.querySelector(".ca-dsec__body");
    t.addEventListener("click", function () {
      var o = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", String(o));
      body.hidden = !o;
      sset(id, o ? "1" : "0");
    });
    labels.push(sec.querySelector(".ca-dsec__editing"));
    sectionsEl.appendChild(sec);
    return sec.querySelector(".ca-dsec__controls");
  }
  // A control bound to S[cur][group][key] (or [key][sub]); `only` limits
  // it to some devices.
  function bind(parent, group, key, spec, opts) {
    opts = opts || {};
    var c = control(parent, spec, function (v) {
      var g = S[cur][group];
      if (opts.sub) g[key][opts.sub] = v; else g[key] = v;
      commit();
      if (opts.after) opts.after();
      if (group === "globe") refreshBg(); // the dot checks under Background
    });
    shows.push(function () {
      c.row.hidden = !!opts.only && opts.only.indexOf(cur) < 0;
      var g = S[cur][group], v = opts.sub ? g[key][opts.sub] : g[key];
      c.show(v, opts.fallback ? opts.fallback() : null);
    });
    return c;
  }

  // ---------------- Headline ----------------
  function buildHeadline() {
    var b = section("headline", "Headline", false);
    heading(b, "Position");
    bind(b, "headline", "align", { type: "select", label: "Alignment", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] });
    bind(b, "headline", "vertical", { type: "select", label: "Vertical", options: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] }, { only: ["desktop"] });
    bind(b, "headline", "offsetX", { type: "range", label: "Offset X", min: -400, max: 400, unit: "px" });
    bind(b, "headline", "offsetY", { type: "range", label: "Offset Y", min: -300, max: 300, unit: "px" });
    heading(b, "Size and lines");
    function computed(el) { return HAS_HERO && el && cur === bp() ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : null; }
    bind(b, "headline", "headline", { type: "range", label: "Headline size", min: 24, max: 140, unit: "px" }, { fallback: function () { return computed(title); } });
    bind(b, "headline", "subheading", { type: "range", label: "Subheading size", min: 12, max: 40, unit: "px" }, { fallback: function () { return computed(sub); } });
    bind(b, "headline", "lines", { type: "select", label: "Headline lines", number: true, options: [["0", "Auto"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] });
    warnEl = document.createElement("p");
    warnEl.className = "ca-dpanel__warn";
    warnEl.setAttribute("role", "status");
    b.appendChild(warnEl);
    var n = hint(b);
    shows.push(function () { n.textContent = cur === "desktop" ? "Desktop: the headline is its own layer; Vertical places it in the hero." : "Below 1200px the headline sits in the page's flow: alignment and offsets only."; });
  }

  // ---------------- Buttons ----------------
  function buildButtons() {
    var b = section("buttons", "Buttons", false);
    bind(b, "buttons", "align", { type: "select", label: "Alignment", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] });
    bind(b, "buttons", "size", { type: "range", label: "Label size", min: 12, max: 24, unit: "px" });
    bind(b, "buttons", "order", { type: "select", label: "Order", options: [["learn", "Learn more first"], ["signup", "Sign up first"]] });
    var n = hint(b);
    shows.push(function () { n.textContent = cur === "desktop" ? "Desktop: Right keeps the buttons at the right of the subheading; Left puts them just after it." : "Below 1200px the buttons sit under the subheading."; });
  }

  // ---------------- Globe ----------------
  function buildGlobe() {
    var b = section("globe", "Globe", HAS_HERO);
    bind(b, "globe", "visible", { type: "check", label: "Show the globe on this device" });
    bind(b, "globe", "size", { type: "range", label: "Size", min: 15, max: 120, unit: "% of width" });
    bind(b, "globe", "maxSize", { type: "range", label: "Max size", min: 120, max: 1600, step: 10, unit: "px" });
    bind(b, "globe", "x", { type: "select", label: "Horizontal", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] });
    bind(b, "globe", "offsetX", { type: "range", label: "Fine X", min: -800, max: 800, unit: "px" });
    bind(b, "globe", "y", { type: "select", label: "Vertical", options: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] });
    bind(b, "globe", "offsetY", { type: "range", label: "Fine Y", min: -500, max: 500, unit: "px" });
    bind(b, "globe", "layer", { type: "select", label: "Layer", options: [["behind", "Behind the headline"], ["beside", "Beside the headline"]] });
    var ln = hint(b);
    shows.push(function () {
      ln.textContent = cur === "desktop" ? "Beside keeps the globe to one side of the headline (choose Left or Right); never taller than the hero." :
        "Behind: the globe sits behind the headline and the buttons. Beside: it has its own row between them. Either way it fades out at the hero's edges.";
    });
    heading(b, "Dots");
    bind(b, "globe", "dots", { type: "range", label: "Density (dots at 720px)", min: 2000, max: 40000, step: 500 });
    bind(b, "globe", "dotsPhone", { type: "range", label: "Most dots on a phone", min: 1000, max: 15000, step: 500 }, { only: ["phone"] });
    bind(b, "globe", "dotSize", { type: "range", label: "Dot size", min: 0.5, max: 4, step: 0.1, unit: "px" });
    bind(b, "globe", "dotColor", { type: "color", label: "Dot colour on light backgrounds" }, { sub: "light", after: textNote });
    bind(b, "globe", "dotOpacity", { type: "range", label: "Opacity on light", min: 0.1, max: 1, step: 0.05 }, { sub: "light", after: textNote });
    bind(b, "globe", "dotColor", { type: "color", label: "Dot colour on dark backgrounds" }, { sub: "dark", after: textNote });
    bind(b, "globe", "dotOpacity", { type: "range", label: "Opacity on dark", min: 0.1, max: 1, step: 0.05 }, { sub: "dark", after: textNote });
    var tn = hint(b);
    // The text sits on the dots as they are: its contrast on the brightest dot.
    function textNote() {
      var s = S[cur], parts = ["light", "dark"].map(function (m) {
        var bg = s.background[m], dc = s.globe.dotColor[m], da = +s.globe.dotOpacity[m];
        if (!hexOk(bg) || !hexOk(dc) || isNaN(da)) return "";
        var dot = mix(dc, bg, Math.max(0, Math.min(1, da))), t = TOKENS[m];
        return (m === "light" ? "Light" : "Dark") + ": headline " + contrast(t.ink, dot).toFixed(1) + ":1, subheading " + contrast(t.muted, dot).toFixed(1) + ":1";
      }).filter(Boolean);
      tn.textContent = "Text on the brightest dot (AA needs 4.5:1): " + parts.join("; ") + ".";
    }
    shows.push(textNote);
    heading(b, "Rotation");
    bind(b, "globe", "autoRotate", { type: "check", label: "Auto-rotate" });
    bind(b, "globe", "speed", { type: "range", label: "Speed", min: 0, max: 40, step: 0.5, unit: "°/s" });
    bind(b, "globe", "direction", { type: "select", label: "Direction", number: true, options: [["1", "Eastward"], ["-1", "Westward"]] });
    bind(b, "globe", "startLon", { type: "range", label: "Starting longitude", min: -180, max: 180, unit: "°" });
    bind(b, "globe", "tilt", { type: "range", label: "Tilt", min: -60, max: 75, unit: "°" });
    if (HAS_HERO) {
      heading(b, "Performance (this window)");
      var fps = document.createElement("p");
      fps.className = "ca-dpanel__fps";
      fps.setAttribute("aria-live", "off");
      b.appendChild(fps);
      setInterval(function () {
        var g = globe();
        if (!g) return;
        fps.textContent = (g.fps ? g.fps + " frames a second" : "Not drawing (still, hidden or off screen)") + " · " + (g.dots.length / 3) + " dots drawn" + (g.gl ? "" : " · no WebGL: still picture");
      }, 500);
    }
  }

  // ---------------- Background ----------------
  function buildBackground() {
    var b = section("background", "Background", !HAS_HERO), m = sget("ca-dpanel-mode");
    if (m !== "light" && m !== "dark") m = mode();
    var modeSel = control(b, { type: "select", label: "Colour for", options: [["light", "Light mode"], ["dark", "Dark mode"]] }, function (v) { m = v; sset("ca-dpanel-mode", v); show(); });
    var preview = document.createElement("button");
    preview.type = "button";
    preview.className = "ca-dpanel__small";
    b.appendChild(preview);
    preview.addEventListener("click", function () {
      if (CONTROLLER) document.dispatchEvent(new CustomEvent("design:theme", { detail: m }));
      else document.documentElement.setAttribute("data-theme", m);
      show();
    });
    heading(b, "Presets");
    var sw = document.createElement("div");
    sw.className = "ca-dpanel__swatches";
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", "Background presets");
    b.appendChild(sw);
    heading(b, "Custom");
    var pick = control(b, { type: "color", label: "Colour picker" }, function (v) { setGround(v); });
    var hexRow = document.createElement("div");
    hexRow.className = "ca-dpanel__row ca-dpanel__row--hex";
    var hexId = "ca-dp-" + (++uid);
    hexRow.innerHTML = '<label for="' + hexId + '">Hex code</label><input id="' + hexId + '" type="text" inputmode="text" maxlength="7" spellcheck="false" autocomplete="off">';
    b.appendChild(hexRow);
    var hex = hexRow.querySelector("input");
    hex.addEventListener("input", function () {
      var v = hex.value.trim();
      if (v && v[0] !== "#") v = "#" + v;
      hex.setAttribute("aria-invalid", String(!hexOk(v)));
      if (hexOk(v)) setGround(v.toLowerCase(), true);
    });
    heading(b, "Contrast (WCAG AA)");
    var list = document.createElement("ul");
    list.className = "ca-dpanel__checks";
    b.appendChild(list);
    var cwarn = document.createElement("p");
    cwarn.className = "ca-dpanel__warn";
    cwarn.setAttribute("role", "status");
    b.appendChild(cwarn);
    hint(b, "Applies to the page and the hero, not the yellow panels. Visitors still see the site's own colours.");

    function setGround(v, fromHex) { S[cur].background[m] = v; commit(); show(fromHex); }
    function checks(bg) {
      var t = TOKENS[m], out = [], gl = S[cur].globe;
      out.push(["Body text", contrast(t.ink, bg), 4.5]);
      out.push(["Secondary text", contrast(t.muted, bg), 4.5]);
      out.push(["Buttons (label and arrow)", contrast(t.ink, bg), 4.5]);
      // Hover turns buttons Canary yellow; in Light they get a black outline (styles.css), so only Dark is measured.
      if (m === "dark") out.push(["Button hover (yellow)", contrast(CANARY, bg), 4.5]);
      var set = darkGround(bg) ? "dark" : "light", dc = gl.dotColor[set], da = +gl.dotOpacity[set];
      if (hexOk(dc) && !isNaN(da)) {
        out.push(["Globe dots (" + (set === "dark" ? "light dots" : "dark dots") + ")", contrast(mix(dc, bg, da), bg), 3]);
        out.push(["Secondary text on the brightest globe dot", contrast(t.muted, mix(dc, bg, da)), 4.5]);
      }
      return out;
    }
    function show(fromHex) {
      var bg = S[cur].background[m], here = mode() === m;
      modeSel.show(m);
      pick.show(bg);
      if (!fromHex) { hex.value = bg; hex.setAttribute("aria-invalid", "false"); }
      preview.textContent = here ? "Showing " + m + " mode now" : "Show " + m + " mode";
      preview.disabled = here && !CONTROLLER;
      sw.innerHTML = "";
      PRESETS[m].forEach(function (pr) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ca-dpanel__swatch";
        btn.setAttribute("aria-pressed", String(pr[0] === bg));
        btn.title = pr[1] + " " + pr[0];
        btn.innerHTML = '<span class="ca-dpanel__chip" style="background:' + pr[0] + '"></span><span>' + esc(pr[1]) + "</span>";
        btn.addEventListener("click", function () { setGround(pr[0]); });
        sw.appendChild(btn);
      });
      var fails = [];
      list.innerHTML = checks(bg).map(function (c) {
        var ok = c[1] >= c[2];
        if (!ok) fails.push(c[0]);
        return '<li class="' + (ok ? "is-ok" : "is-low") + '"><span aria-hidden="true">' + (ok ? "✓" : "⚠") + "</span> " + esc(c[0]) + ": " +
          c[1].toFixed(1) + ":1 <span class=\"ca-dpanel__need\">(needs " + c[2] + ":1)</span>" + (ok ? "" : ' <span class="ca-dpanel__sr">below AA</span>') + "</li>";
      }).join("");
      cwarn.textContent = fails.length ? "Below WCAG AA on this background: " + fails.join(", ") + "." : "";
    }
    shows.push(function () { show(); });
    refreshBg = function () { show(); };
    new MutationObserver(function () { show(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  function mode() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // ---------------- Header ----------------
  function buildHeader() {
    var b = section("header", "Header", false);
    bind(b, "header", "top", { type: "select", label: "At the top", options: [["transparent", "Transparent"], ["solid", "Solid page colour"]] });
    bind(b, "header", "scroll", { type: "select", label: "After scrolling", options: [["solid", "Solid, line under it"], ["solid-noline", "Solid, no line"], ["transparent", "Stays transparent"]] });
    hint(b, "The bar switches once the page scrolls; the change fades in (no fade with reduced motion).");
  }

  if (HAS_HERO || CONTROLLER) { buildHeadline(); buildButtons(); buildGlobe(); }
  buildBackground();
  buildHeader();

  // ---------------- Tabs ----------------
  var tabs = Array.prototype.slice.call(tabsEl.querySelectorAll("[role=tab]"));
  function note() {
    if (CONTROLLER) { noteEl.textContent = "The highlighted frame is " + NAMES[cur] + "; every frame uses its own device's settings."; return; }
    noteEl.textContent = cur === bp() ? "You're viewing " + NAMES[cur] + " now (" + innerWidth + "px wide)." :
      "You're editing " + NAMES[cur] + " settings; use the simulator to see them.";
    noteEl.classList.toggle("is-other", cur !== bp());
  }
  function showAll() {
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-device") === cur;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panelBody.setAttribute("aria-labelledby", "ca-dtab-" + cur);
    labels.forEach(function (l) { l.textContent = "Editing: " + NAMES[cur] + " (" + RANGES[cur] + ")"; });
    fromDesktop.hidden = cur === "desktop";
    fromTablet.hidden = cur !== "phone";
    shows.forEach(function (f) { f(); });
    note();
  }
  function choose(d, focus) {
    cur = d;
    sset("ca-dpanel-device", d);
    toolStatus.textContent = "";
    showAll();
    if (focus) document.getElementById("ca-dtab-" + d).focus();
    document.dispatchEvent(new CustomEvent("design:device", { detail: d }));
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { choose(t.getAttribute("data-device")); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
      if (j < 0 && e.key !== "ArrowLeft") return;
      e.preventDefault();
      choose(tabs[(j + tabs.length) % tabs.length].getAttribute("data-device"), true);
    });
  });
  window.addEventListener("resize", note);
  ui = { refresh: showAll };
  choose(cur);
})();
