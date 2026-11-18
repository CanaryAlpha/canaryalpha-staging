/*
 * Design panel, for the site owner only. Loaded only when the address has
 * ?design=1 (kept for the tab's session; ?design=0 turns it off): by
 * index.html on the homepage and by components/design-mode.js on Learn, the
 * glossary and Sign up. Visitors never get it.
 *
 * One floating panel with three collapsible sections:
 *   Headline    alignment, vertical position, X/Y offsets, headline and
 *               subheading sizes per screen size and a line count (1-4)
 *               reached by narrowing the headline, never by cutting words.
 *   Globe       per screen size (desktop 1100px+, tablet 600-1099px, phone
 *               under 600px, the hero's own breakpoints): visible, size (% of
 *               the hero's width, max px), horizontal and vertical position
 *               with fine offsets, and layer; then the dots, rotation, glow
 *               and the frame rate (components/dot-globe.config.js).
 *   Background  the page colour (--ground) for Light and for Dark, from
 *               presets, a picker or a hex code, with a live WCAG AA contrast
 *               check of the text, buttons and globe dots on it. The globe
 *               picks its Light or Dark dot colours by how dark the chosen
 *               background is, so the dots stay visible either way.
 *
 * Headline and Globe show on the homepage only; Background on every page
 * that loads the panel. Each section has Copy settings, Reset and saves to
 * this browser (localStorage, nothing is sent anywhere); "Copy all settings"
 * gives all three as one JSON block. Saved settings only apply while design
 * mode is on; with it off the page shows the defaults in code.
 *
 * Two other modes, for the device simulator (design/simulator/):
 *   ?sim=1      inside a simulator frame: no panel; the saved settings are
 *               applied, and re-applied whenever they change in another tab
 *               or in the simulator's own panel (the storage event).
 *   simulator   on the simulator page (<body data-design-simulator>): the
 *               panel with every section, editing the saved settings, which
 *               the frames pick up live.
 */
(function () {
  "use strict";
  var KEY_A = "ca-design-headline", KEY_B = "ca-design-globe", KEY_C = "ca-design-background";
  var SIM = /[?&]sim=1(?:&|$)/.test(location.search);
  var CONTROLLER = !!document.querySelector("[data-design-simulator]");
  var hero = document.querySelector(".hero");
  var title = document.querySelector(".hero__title");
  var sub = document.querySelector(".hero__text");
  var foot = document.querySelector(".hero__foot");
  var HAS_HERO = !!(hero && title);
  var DEVICES = [["desktop", "Desktop (1100px+)"], ["tablet", "Tablet (600-1099px)"], ["phone", "Phone (under 600px)"]];

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function bp() { return innerWidth >= 1100 ? "desktop" : innerWidth >= 600 ? "tablet" : "phone"; }
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

  // ======================= State =======================
  // A: headline
  var DEF_A = {
    align: "left", vertical: "top", offsetX: 0, offsetY: 0,
    sizes: { desktop: { headline: null, subheading: null, lines: 3 },
             tablet: { headline: null, subheading: null, lines: 2 },
             phone: { headline: null, subheading: null, lines: 0 } }
  };
  function readA() {
    var a = Object.assign(clone(DEF_A), load(KEY_A) || {});
    a.sizes = Object.assign(clone(DEF_A.sizes), a.sizes || {});
    return a;
  }
  var A = readA();

  // B: globe (the defaults are in components/dot-globe.config.js)
  var GLOBE_DEF = clone(window.CA_DOT_GLOBE_DEFAULTS || (window.CA_DOT_GLOBE && window.CA_DOT_GLOBE.defaults) || {});

  // C: background. The site's own colours (styles.css) are the defaults.
  var DEF_C = { light: { ground: "#ffffff" }, dark: { ground: "#000000" } };
  var TOKENS = { light: { ink: "#000000", muted: "#595959" }, dark: { ink: "#ffffff", muted: "#a3a3a3" } };
  var CANARY = "#ffef00";
  var PRESETS = {
    dark: [["#000000", "Black (now)"], ["#0a0a0a", "Near-black"], ["#0d0b08", "Warm near-black"], ["#080a0e", "Cool near-black"],
           ["#121212", "Soft black"], ["#1c1c1c", "Deep charcoal"], ["#17150a", "Dark canary"]],
    light: [["#ffffff", "White (now)"], ["#fafaf7", "Off-white"], ["#f7f4ec", "Warm off-white"], ["#f4f6f9", "Cool off-white"],
            ["#efefef", "Light grey"], ["#fffbe6", "Pale canary"]]
  };
  function readC() {
    var c = clone(DEF_C), s = load(KEY_C) || {};
    ["light", "dark"].forEach(function (m) { if (s[m] && hexOk(s[m].ground)) c[m].ground = s[m].ground.toLowerCase(); });
    return c;
  }
  var C = readC();
  function mode() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // ======================= Applying =======================
  var styleA = document.head.appendChild(document.createElement("style"));
  styleA.id = "ca-design-headline-css";
  var styleC = document.head.appendChild(document.createElement("style"));
  styleC.id = "ca-design-background-css";
  var warnEl = null;

  function cssA() {
    var dx = (+A.offsetX || 0) + "px", dy = (+A.offsetY || 0) + "px", c = [];
    var hx = A.align === "center" ? "-50%" : "0px";
    var vy = A.vertical === "middle" ? "-50%" : "0px";
    // Desktop: the headline is its own layer, placed anywhere in the hero.
    c.push("@media (min-width: 1100px){.hero .hero__title{" +
      (A.align === "right" ? "left:auto;right:var(--pad);" : A.align === "center" ? "left:50%;right:auto;" : "") +
      (A.vertical === "middle" ? "top:50%;" : A.vertical === "bottom" ? "top:auto;bottom:calc(var(--arrow-clear) + var(--ca-foot-h, 6rem) + 2rem);" : "") +
      "text-align:" + A.align + ";transform:translate(calc(" + hx + " + " + dx + "),calc(" + vy + " + " + dy + "));}}");
    // Below 1100px it stacks in the page's flow: alignment and offsets only.
    c.push("@media (max-width: 1099px){.hero .hero__title{text-align:" + A.align + ";" +
      (A.align === "center" ? "margin-inline:auto;" : A.align === "right" ? "margin-left:auto;margin-right:0;" : "") +
      "transform:translate(" + dx + "," + dy + ");}}");
    var q = { desktop: "(min-width: 1100px)", tablet: "(min-width: 600px) and (max-width: 1099px)", phone: "(max-width: 599px)" };
    Object.keys(q).forEach(function (k) {
      var s = A.sizes[k], r = "";
      if (s.headline) r += ".hero .hero__title{font-size:" + s.headline + "px;}";
      if (s.subheading) r += ".hero .hero__foot .hero__text{font-size:" + s.subheading + "px;}";
      if (r) c.push("@media " + q[k] + "{" + r + "}");
    });
    return c.join("\n");
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
  // Narrow the headline until it takes `n` lines; warn when it can't.
  function fitLines() {
    var n = A.sizes[bp()].lines | 0;
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
  function applyA() {
    if (!HAS_HERO) return;
    if (foot) hero.style.setProperty("--ca-foot-h", foot.offsetHeight + "px");
    styleA.textContent = cssA();
    fitLines();
  }

  function cssC() {
    var l = C.light.ground, d = C.dark.ground;
    return ":root,:root[data-theme=\"light\"]{--ground:" + l + ";}\n" +
      "@media (prefers-color-scheme: dark){:root:not([data-theme]){--ground:" + d + ";}}\n" +
      ":root[data-theme=\"dark\"]{--ground:" + d + ";}";
  }
  function globe() { return window.CA_DOT_GLOBE && window.CA_DOT_GLOBE.instances[0]; }
  function applyC() {
    styleC.textContent = cssC();
    var g = globe();
    if (g) g.themeChanged(); // dots follow the new background (light or dark set)
  }

  // Globe: saved settings over the defaults; unknown (removed) keys are ignored by the globe.
  function readB() {
    var b = clone(GLOBE_DEF), s = load(KEY_B);
    if (s && typeof s === "object") {
      Object.keys(s).forEach(function (k) { if (k !== "devices" && k in b) b[k] = s[k]; });
      if (s.devices && typeof s.devices === "object") {
        b.devices = b.devices || {};
        DEVICES.forEach(function (d) { b.devices[d[0]] = Object.assign({}, b.devices[d[0]] || {}, s.devices[d[0]] || {}); });
      }
    }
    return b;
  }
  // Only the keys that changed go to the globe, so a change elsewhere never
  // resets its spin to the starting longitude.
  var appliedB = {};
  function pushB(b) {
    var g = globe(), patch = {}, any = false;
    if (!g) return;
    Object.keys(b).forEach(function (k) {
      var j = JSON.stringify(b[k]);
      if (appliedB[k] !== j) { patch[k] = clone(b[k]); appliedB[k] = j; any = true; }
    });
    if (any) g.set(patch);
  }
  function applyB() { pushB(readB()); }

  applyC();
  applyA();
  function whenGlobe(fn) {
    if (globe()) fn(globe());
    else document.addEventListener("dot-globe:ready", function () { if (globe()) fn(globe()); }, { once: true });
  }
  if (HAS_HERO) whenGlobe(function () { applyB(); });

  // Settings changed in another tab, or in the simulator's panel: re-apply.
  window.addEventListener("storage", function (e) {
    if (e.key === KEY_A || e.key === null) { A = readA(); applyA(); }
    if (e.key === KEY_B || e.key === null) applyB();
    if (e.key === KEY_C || e.key === null) { C = readC(); applyC(); }
    if (ui && e.key) ui.refresh(e.key);
  });
  window.addEventListener("resize", function () { if (HAS_HERO) applyA(); });

  // Inside a simulator frame: apply only, no panel. Phones and tablets have
  // overlay scrollbars, so the frame hides its own to keep the full width.
  var ui = null;
  if (SIM) {
    var noBars = document.head.appendChild(document.createElement("style"));
    noBars.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";
    return;
  }

  // ======================= The panel =======================
  var uid = 0;
  // A labelled control. spec: { type: range|select|check|color, label, min,
  // max, step, unit, fmt, options: [[value, label]] }.
  function control(parent, spec, value, onInput) {
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
    function show(v) {
      if (spec.type === "check") input.checked = !!v;
      else input.value = v;
      if (out) out.textContent = (spec.fmt ? spec.fmt(+v) : v) + (spec.unit || "");
    }
    show(value);
    input.addEventListener("input", function () {
      var v = spec.type === "check" ? input.checked : spec.type === "range" ? +input.value : input.value;
      if (out) out.textContent = (spec.fmt ? spec.fmt(+v) : v) + (spec.unit || "");
      onInput(v);
    });
    return { row: row, input: input, show: show };
  }
  function heading(parent, text) {
    var h = document.createElement("p");
    h.className = "ca-dpanel__group";
    h.textContent = text;
    parent.appendChild(h);
  }
  function hint(parent, text) {
    var p = document.createElement("p");
    p.className = "ca-dpanel__hint";
    if (text) p.textContent = text;
    parent.appendChild(p);
    return p;
  }

  // Panel shell: one floating box, collapsible, holding collapsible sections.
  var box = document.createElement("section");
  box.className = "ca-dpanel" + (CONTROLLER ? " ca-dpanel--docked" : "");
  box.id = "ca-dpanel";
  box.setAttribute("aria-label", "Design panel");
  var collapsed = !CONTROLLER && innerWidth < 700; // phones start collapsed (it would cover the hero)
  try { var cs = sessionStorage.getItem("ca-dpanel-collapsed"); if (cs !== null && !CONTROLLER) collapsed = cs === "1"; } catch (e) {}
  box.innerHTML =
    '<div class="ca-dpanel__head"><button type="button" class="ca-dpanel__toggle" aria-expanded="' + !collapsed + '" aria-controls="ca-dpanel-body">' +
    '<span>Design</span><span class="ca-dpanel__chev" aria-hidden="true"></span></button></div>' +
    '<div class="ca-dpanel__body" id="ca-dpanel-body"' + (collapsed ? " hidden" : "") + '></div>' +
    '<div class="ca-dpanel__foot ca-dpanel__foot--all"' + (collapsed ? " hidden" : "") + '><button type="button" data-act="copy-all">Copy all settings</button>' +
    '<span class="ca-dpanel__status" role="status" aria-live="polite"></span></div>';
  var panelBody = box.querySelector(".ca-dpanel__body");
  var allStatus = box.querySelector(".ca-dpanel__foot--all .ca-dpanel__status");
  var toggle = box.querySelector(".ca-dpanel__toggle");
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panelBody.hidden = !open;
    box.querySelector(".ca-dpanel__foot--all").hidden = !open;
    try { sessionStorage.setItem("ca-dpanel-collapsed", open ? "0" : "1"); } catch (e) {}
  });
  (document.querySelector("[data-design-panel-home]") || document.body).appendChild(box);

  // A collapsible section (a dropdown) with its own Copy settings and Reset.
  function section(key, name, startOpen) {
    var id = "ca-dsec-" + key, open = startOpen;
    try { var s = sessionStorage.getItem(id); if (s !== null) open = s === "1"; } catch (e) {}
    var sec = document.createElement("div");
    sec.className = "ca-dsec";
    sec.innerHTML = '<h3 class="ca-dsec__head"><button type="button" class="ca-dsec__toggle" aria-expanded="' + open + '" aria-controls="' + id + '">' +
      '<span>' + esc(name) + '</span><span class="ca-dpanel__chev" aria-hidden="true"></span></button></h3>' +
      '<div class="ca-dsec__body" id="' + id + '"' + (open ? "" : " hidden") + '><div class="ca-dsec__controls"></div>' +
      '<div class="ca-dpanel__foot"><button type="button" data-act="copy">Copy settings</button><button type="button" data-act="reset">Reset</button>' +
      '<span class="ca-dpanel__status" role="status" aria-live="polite"></span></div></div>';
    var t = sec.querySelector(".ca-dsec__toggle"), body = sec.querySelector(".ca-dsec__body");
    t.addEventListener("click", function () {
      var o = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", String(o));
      body.hidden = !o;
      try { sessionStorage.setItem(id, o ? "1" : "0"); } catch (e) {}
    });
    panelBody.appendChild(sec);
    return {
      body: sec.querySelector(".ca-dsec__controls"), status: sec.querySelector(".ca-dsec__body .ca-dpanel__status"),
      onCopy: function (fn) { sec.querySelector('[data-act="copy"]').addEventListener("click", fn); },
      onReset: function (fn) { sec.querySelector('[data-act="reset"]').addEventListener("click", fn); }
    };
  }

  var refreshers = {};
  ui = { refresh: function (key) { if (refreshers[key]) refreshers[key](); } };

  // ---------------- Section: Headline ----------------
  function buildA() {
    var p = section("headline", "Headline", false), b = p.body, ctl = {}, editing = bp();
    heading(b, "Position");
    ctl.align = control(b, { type: "select", label: "Alignment", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] }, A.align, function (v) { A.align = v; changed(); });
    ctl.vertical = control(b, { type: "select", label: "Vertical (desktop)", options: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] }, A.vertical, function (v) { A.vertical = v; changed(); });
    ctl.offsetX = control(b, { type: "range", label: "Offset X", min: -400, max: 400, unit: "px" }, A.offsetX, function (v) { A.offsetX = v; changed(); });
    ctl.offsetY = control(b, { type: "range", label: "Offset Y", min: -300, max: 300, unit: "px" }, A.offsetY, function (v) { A.offsetY = v; changed(); });

    heading(b, "Size and lines");
    ctl.bp = control(b, { type: "select", label: "Screen size", options: DEVICES }, editing, function (v) { editing = v; showSizes(); });
    var note = hint(b);
    function computed(el) { return Math.round(parseFloat(getComputedStyle(el).fontSize)); }
    ctl.headline = control(b, { type: "range", label: "Headline size", min: 24, max: 140, unit: "px" }, 0, function (v) { A.sizes[editing].headline = v; changed(); });
    ctl.subheading = control(b, { type: "range", label: "Subheading size", min: 12, max: 40, unit: "px" }, 0, function (v) { A.sizes[editing].subheading = v; changed(); });
    ctl.lines = control(b, { type: "select", label: "Headline lines", options: [["0", "Auto"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] }, "0", function (v) { A.sizes[editing].lines = +v; changed(); });
    warnEl = document.createElement("p");
    warnEl.className = "ca-dpanel__warn";
    warnEl.setAttribute("role", "status");
    b.appendChild(warnEl);

    function showSizes() {
      var s = A.sizes[editing], here = HAS_HERO && editing === bp();
      ctl.headline.show(s.headline || (here ? computed(title) : ""));
      ctl.subheading.show(s.subheading || (here && sub ? computed(sub) : ""));
      ctl.lines.show(String(s.lines || 0));
      note.textContent = CONTROLLER ? "Changes show in the frames; line warnings show on the homepage itself." :
        here ? "You're viewing this screen size now." : "You're viewing " + bp() + " width: resize the window to see " + editing + " changes.";
    }
    function changed() { save(KEY_A, A); applyA(); }
    function showAll() {
      ["align", "vertical", "offsetX", "offsetY"].forEach(function (k) { ctl[k].show(A[k]); });
      showSizes();
    }
    showSizes();
    window.addEventListener("resize", showSizes);
    refreshers[KEY_A] = showAll;
    p.onCopy(function () { copyText(JSON.stringify({ headline: A }, null, 2), p.status); });
    p.onReset(function () { A = clone(DEF_A); drop(KEY_A); applyA(); showAll(); p.status.textContent = "Reset to the defaults"; });
  }

  // ---------------- Section: Globe ----------------
  function buildB() {
    var B = readB(), g = globe();
    var p = section("globe", "Globe", true), b = p.body, ctl = [], dctl = {}, editing = bp();
    function changed() { save(KEY_B, B); pushB(B); }
    function set(path, v) {
      var parts = path.split(".");
      if (parts.length === 2) B[parts[0]][parts[1]] = v; else B[path] = v;
      changed();
    }
    function get(path) { var parts = path.split("."); return parts.length === 2 ? B[parts[0]][parts[1]] : B[path]; }
    function add(path, spec) {
      var c = control(b, spec, get(path), function (v) {
        if (spec.type === "select" && spec.number) v = +v;
        set(path, v);
      });
      ctl.push({ path: path, spec: spec, c: c });
    }
    // Per screen size.
    heading(b, "Screen size");
    var devSel = control(b, { type: "select", label: "Editing", options: [["desktop", "Desktop"], ["tablet", "Tablet"], ["phone", "Phone"]] }, editing, function (v) { editing = v; showDevice(); });
    devSel.row.classList.add("ca-dpanel__row--device");
    var dnote = hint(b);
    function dset(k, v) { B.devices[editing][k] = v; changed(); }
    function dadd(k, spec) { dctl[k] = control(b, spec, "", function (v) { dset(k, v); }); }
    dadd("visible", { type: "check", label: "Show the globe on this screen size" });
    dadd("size", { type: "range", label: "Size", min: 15, max: 120, unit: "% of width" });
    dadd("maxSize", { type: "range", label: "Max size", min: 120, max: 1600, step: 10, unit: "px" });
    dadd("x", { type: "select", label: "Horizontal", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] });
    dadd("offsetX", { type: "range", label: "Fine X", min: -800, max: 800, unit: "px" });
    dadd("y", { type: "select", label: "Vertical", options: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] });
    dadd("offsetY", { type: "range", label: "Fine Y", min: -500, max: 500, unit: "px" });
    dadd("layer", { type: "select", label: "Layer", options: [["behind", "Behind the headline"], ["beside", "Beside the headline"]] });
    var lnote = hint(b);
    function showDevice() {
      B.devices = B.devices || {};
      var s = B.devices[editing] = Object.assign({}, (GLOBE_DEF.devices || {})[editing] || {}, B.devices[editing] || {});
      Object.keys(dctl).forEach(function (k) { dctl[k].show(s[k]); });
      devSel.show(editing);
      var here = editing === bp();
      dnote.textContent = CONTROLLER ? "Each frame uses its own screen size's settings." :
        here ? "You're viewing this screen size now (" + innerWidth + "px wide)." : "You're viewing " + bp() + " width (" + innerWidth + "px): resize the window, or use the simulator, to see " + editing + ".";
      lnote.textContent = editing === "desktop" ? "Beside keeps the globe to one side of the headline (choose Left or Right); never taller than the hero." :
        "Beside: the globe has its own row between the headline and the buttons. Behind: it sits behind them.";
    }
    showDevice();
    window.addEventListener("resize", showDevice);

    heading(b, "Dots");
    add("dots", { type: "range", label: "Density (dots at 720px)", min: 2000, max: 40000, step: 500 });
    add("dotsPhone", { type: "range", label: "Most dots on a phone", min: 1000, max: 15000, step: 500 });
    add("dotSize", { type: "range", label: "Dot size", min: 0.5, max: 4, step: 0.1, unit: "px" });
    add("dotColor.light", { type: "color", label: "Dot colour on light backgrounds" });
    add("dotOpacity.light", { type: "range", label: "Opacity on light", min: 0.1, max: 1, step: 0.05 });
    add("dotColor.dark", { type: "color", label: "Dot colour on dark backgrounds" });
    add("dotOpacity.dark", { type: "range", label: "Opacity on dark", min: 0.1, max: 1, step: 0.05 });
    heading(b, "Rotation");
    add("autoRotate", { type: "check", label: "Auto-rotate" });
    add("speed", { type: "range", label: "Speed", min: 0, max: 40, step: 0.5, unit: "°/s" });
    add("direction", { type: "select", label: "Direction", number: true, options: [["1", "Eastward"], ["-1", "Westward"]] });
    add("startLon", { type: "range", label: "Starting longitude", min: -180, max: 180, unit: "°" });
    add("tilt", { type: "range", label: "Tilt", min: -60, max: 75, unit: "°" });
    heading(b, "Atmosphere");
    add("glow", { type: "check", label: "Glow on" });
    add("glowStrength", { type: "range", label: "Strength", min: 0, max: 1, step: 0.05 });
    if (g) {
      heading(b, "Performance");
      var fps = document.createElement("p");
      fps.className = "ca-dpanel__fps";
      fps.setAttribute("aria-live", "off");
      b.appendChild(fps);
      setInterval(function () {
        fps.textContent = (g.fps ? g.fps + " frames a second" : "Not drawing (still, hidden or off screen)") + " · " + (g.dots.length / 3) + " dots drawn" + (g.gl ? "" : " · no WebGL: still picture");
      }, 500);
    }
    function showAll() { B = readB(); ctl.forEach(function (x) { x.c.show(get(x.path)); }); showDevice(); }
    refreshers[KEY_B] = showAll;
    p.onCopy(function () { copyText(JSON.stringify({ globe: B }, null, 2), p.status); });
    p.onReset(function () {
      drop(KEY_B); B = readB(); pushB(B);
      showAll(); p.status.textContent = "Reset to the defaults";
    });
  }

  // ---------------- Section: Background ----------------
  function buildC() {
    var p = section("background", "Background", !HAS_HERO), b = p.body, editing = mode();
    var modeSel = control(b, { type: "select", label: "Editing", options: [["light", "Light mode"], ["dark", "Dark mode"]] }, editing, function (v) { editing = v; show(); });
    var preview = document.createElement("button");
    preview.type = "button";
    preview.className = "ca-dpanel__small";
    b.appendChild(preview);
    preview.addEventListener("click", function () {
      if (CONTROLLER) document.dispatchEvent(new CustomEvent("design:theme", { detail: editing }));
      else document.documentElement.setAttribute("data-theme", editing);
      show();
    });
    heading(b, "Presets");
    var sw = document.createElement("div");
    sw.className = "ca-dpanel__swatches";
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", "Background presets");
    b.appendChild(sw);
    heading(b, "Custom");
    var pick = control(b, { type: "color", label: "Colour picker" }, C[editing].ground, function (v) { setGround(v); });
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

    function setGround(v, fromHex) {
      C[editing].ground = v;
      save(KEY_C, C); applyC(); show(fromHex);
    }
    function checks(m, bg) {
      var t = TOKENS[m], out = [];
      out.push(["Body text", contrast(t.ink, bg), 4.5]);
      out.push(["Secondary text", contrast(t.muted, bg), 4.5]);
      out.push(["Buttons (label and arrow)", contrast(t.ink, bg), 4.5]);
      // Hover turns buttons Canary yellow; in Light they get a black outline (styles.css), so only Dark is measured.
      if (m === "dark") out.push(["Button hover (yellow)", contrast(CANARY, bg), 4.5]);
      var gd = (GLOBE_DEF.dotColor || {}), go = (GLOBE_DEF.dotOpacity || {});
      var B = readB(), set = darkGround(bg) ? "dark" : "light";
      var dc = (B.dotColor || gd)[set] || (set === "dark" ? "#f2f2f2" : "#111111"), da = +((B.dotOpacity || go)[set] || 0.8);
      if (hexOk(dc)) out.push(["Globe dots (" + (set === "dark" ? "light dots" : "dark dots") + ")", contrast(mix(dc, bg, da), bg), 3]);
      return out;
    }
    function show(fromHex) {
      var bg = C[editing].ground, here = mode() === editing;
      modeSel.show(editing);
      pick.show(bg);
      if (!fromHex) { hex.value = bg; hex.setAttribute("aria-invalid", "false"); }
      preview.textContent = here ? "Showing " + editing + " mode now" : "Show " + editing + " mode";
      preview.disabled = here && !CONTROLLER;
      sw.innerHTML = "";
      PRESETS[editing].forEach(function (pr) {
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
      list.innerHTML = checks(editing, bg).map(function (c) {
        var ok = c[1] >= c[2];
        if (!ok) fails.push(c[0]);
        return '<li class="' + (ok ? "is-ok" : "is-low") + '"><span aria-hidden="true">' + (ok ? "✓" : "⚠") + "</span> " + esc(c[0]) + ": " +
          c[1].toFixed(1) + ":1 <span class=\"ca-dpanel__need\">(needs " + c[2] + ":1)</span>" + (ok ? "" : ' <span class="ca-dpanel__sr">below AA</span>') + "</li>";
      }).join("");
      cwarn.textContent = fails.length ? "Below WCAG AA on this background: " + fails.join(", ") + "." : "";
    }
    show();
    new MutationObserver(function () { show(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    refreshers[KEY_C] = function () { show(); };
    refreshers[KEY_B] = (function (prev) { return function () { if (prev) prev(); show(); }; })(refreshers[KEY_B]);
    p.onCopy(function () { copyText(JSON.stringify({ background: C }, null, 2), p.status); });
    p.onReset(function () { C = clone(DEF_C); drop(KEY_C); applyC(); show(); p.status.textContent = "Reset to the site's colours"; });
  }

  if (HAS_HERO || CONTROLLER) buildA();
  if (HAS_HERO) whenGlobe(function () { buildB(); buildC(); });
  else {
    if (CONTROLLER) buildB();
    buildC();
  }
  box.querySelector('[data-act="copy-all"]').addEventListener("click", function () {
    copyText(JSON.stringify({ headline: A, globe: readB(), background: C }, null, 2), allStatus);
  });
})();
