/*
 * Design panels for the homepage hero, for the site owner only. Loaded by
 * index.html only when the address has ?design=1 (kept for the tab's session;
 * ?design=0 turns it off), so visitors never get them.
 *
 *   A. Headline: alignment, vertical position, X/Y offsets, headline and
 *      subheading sizes per screen size (desktop 1100px+, tablet 600-1099px,
 *      phone under 600px) and a line count (1-4) reached by narrowing the
 *      headline (text-wrap: balance), never by cutting words. Layout only:
 *      the text and the H1 stay as they are.
 *   B. Globe: placement, dots, rotation and the glow (every setting in
 *      components/dot-globe.config.js), live, plus the frame rate. Saved
 *      settings from before markers, arcs and zoom were removed still load:
 *      the globe ignores keys its config doesn't have.
 *
 * Both apply instantly, save to this browser (localStorage, nothing is sent
 * anywhere), and have Copy settings (JSON) and Reset. Saved settings only
 * apply while the panels are on; with them off the page shows the defaults
 * in code, as every visitor sees it.
 */
(function () {
  "use strict";
  var KEY_A = "ca-design-headline", KEY_B = "ca-design-globe";
  var hero = document.querySelector(".hero");
  var title = document.querySelector(".hero__title");
  var sub = document.querySelector(".hero__text");
  var foot = document.querySelector(".hero__foot");
  if (!hero || !title) return;

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

  // ---- Panel shell: a small floating box with a collapse button. ----
  function panel(id, name, side) {
    var box = document.createElement("section");
    box.className = "ca-dpanel ca-dpanel--" + side;
    box.id = id;
    box.setAttribute("aria-label", name + " design panel");
    // Phones start collapsed (the panels would cover the hero); after that
    // each remembers its state for the tab's session.
    var collapsed = innerWidth < 700;
    try { var c = sessionStorage.getItem(id + "-collapsed"); if (c !== null) collapsed = c === "1"; } catch (e) {}
    box.innerHTML =
      '<div class="ca-dpanel__head"><button type="button" class="ca-dpanel__toggle" aria-expanded="' + !collapsed + '" aria-controls="' + id + '-body">' +
      '<span>' + esc(name) + '</span><span class="ca-dpanel__chev" aria-hidden="true"></span></button></div>' +
      '<div class="ca-dpanel__body" id="' + id + '-body"' + (collapsed ? " hidden" : "") + '></div>' +
      '<div class="ca-dpanel__foot"' + (collapsed ? " hidden" : "") + '><button type="button" data-act="copy">Copy settings</button>' +
      '<button type="button" data-act="reset">Reset</button><span class="ca-dpanel__status" role="status" aria-live="polite"></span></div>';
    var t = box.querySelector(".ca-dpanel__toggle");
    t.addEventListener("click", function () {
      var open = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", String(open));
      box.querySelector(".ca-dpanel__body").hidden = !open;
      box.querySelector(".ca-dpanel__foot").hidden = !open;
      try { sessionStorage.setItem(id + "-collapsed", open ? "0" : "1"); } catch (e) {}
    });
    document.body.appendChild(box);
    return { box: box, body: box.querySelector(".ca-dpanel__body"), status: box.querySelector(".ca-dpanel__status") };
  }

  // A labelled control. spec: { type: range|select|check|color,
  // label, min, max, step, unit, options: [[value, label]] }.
  var uid = 0;
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

  // ======================= Panel A: the headline =======================
  var DEF_A = {
    align: "left", vertical: "top", offsetX: 0, offsetY: 0,
    sizes: { desktop: { headline: null, subheading: null, lines: 0 },
             tablet: { headline: null, subheading: null, lines: 0 },
             phone: { headline: null, subheading: null, lines: 0 } }
  };
  var A = Object.assign(clone(DEF_A), load(KEY_A) || {});
  A.sizes = Object.assign(clone(DEF_A.sizes), A.sizes || {});
  var styleA = document.head.appendChild(document.createElement("style"));
  styleA.id = "ca-design-headline-css";
  var editing = bp();
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
    var cs = getComputedStyle(hero), pad = parseFloat(cs.getPropertyValue("--pad")) || 16;
    return Math.floor(hero.clientWidth - 2 * pad);
  }
  // Narrow the headline until it takes `n` lines; warn when it can't.
  function fitLines() {
    var n = A.sizes[bp()].lines | 0;
    title.style.maxWidth = "";
    if (warnEl) warnEl.textContent = "";
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
  function warn(t) { if (warnEl) warnEl.textContent = t; }

  function applyA() {
    if (foot) hero.style.setProperty("--ca-foot-h", foot.offsetHeight + "px");
    styleA.textContent = cssA();
    fitLines();
  }

  function buildA() {
    var p = panel("ca-dpanel-headline", "Headline", "left"), b = p.body;
    heading(b, "Position");
    var ctl = {};
    ctl.align = control(b, { type: "select", label: "Alignment", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] }, A.align, function (v) { A.align = v; changed(); });
    ctl.vertical = control(b, { type: "select", label: "Vertical (desktop)", options: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] }, A.vertical, function (v) { A.vertical = v; changed(); });
    ctl.offsetX = control(b, { type: "range", label: "Offset X", min: -400, max: 400, unit: "px" }, A.offsetX, function (v) { A.offsetX = v; changed(); });
    ctl.offsetY = control(b, { type: "range", label: "Offset Y", min: -300, max: 300, unit: "px" }, A.offsetY, function (v) { A.offsetY = v; changed(); });

    heading(b, "Size and lines");
    ctl.bp = control(b, { type: "select", label: "Screen size", options: [["desktop", "Desktop (1100px+)"], ["tablet", "Tablet (600-1099px)"], ["phone", "Phone (under 600px)"]] }, editing, function (v) { editing = v; showSizes(); });
    var note = document.createElement("p");
    note.className = "ca-dpanel__hint";
    b.appendChild(note);
    function computed(el) { return Math.round(parseFloat(getComputedStyle(el).fontSize)); }
    ctl.headline = control(b, { type: "range", label: "Headline size", min: 24, max: 140, unit: "px" }, 0, function (v) { A.sizes[editing].headline = v; changed(); });
    ctl.subheading = control(b, { type: "range", label: "Subheading size", min: 12, max: 40, unit: "px" }, 0, function (v) { A.sizes[editing].subheading = v; changed(); });
    ctl.lines = control(b, { type: "select", label: "Headline lines", options: [["0", "Auto"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] }, "0", function (v) { A.sizes[editing].lines = +v; changed(); });
    warnEl = document.createElement("p");
    warnEl.className = "ca-dpanel__warn";
    warnEl.setAttribute("role", "status");
    b.appendChild(warnEl);

    function showSizes() {
      var s = A.sizes[editing], here = editing === bp();
      ctl.headline.show(s.headline || (here ? computed(title) : ""));
      ctl.subheading.show(s.subheading || (here && sub ? computed(sub) : ""));
      ctl.lines.show(String(s.lines || 0));
      note.textContent = here ? "You're viewing this screen size now." : "You're viewing " + bp() + " width: resize the window to see " + editing + " changes.";
    }
    function changed() { save(KEY_A, A); applyA(); }
    function showAll() {
      ["align", "vertical", "offsetX", "offsetY"].forEach(function (k) { ctl[k].show(A[k]); });
      showSizes();
    }
    showSizes();
    window.addEventListener("resize", function () { applyA(); showSizes(); });

    p.box.querySelector('[data-act="copy"]').addEventListener("click", function () {
      copyText(JSON.stringify({ headline: A }, null, 2), p.status);
    });
    p.box.querySelector('[data-act="reset"]').addEventListener("click", function () {
      A = clone(DEF_A); drop(KEY_A); applyA(); showAll(); p.status.textContent = "Reset to the defaults";
    });
  }

  // ======================= Panel B: the globe =======================
  function buildB(g) {
    var DEF_B = clone(window.CA_DOT_GLOBE.defaults || g.get());
    var saved = load(KEY_B);
    if (saved && typeof saved === "object") g.set(saved); // unknown (removed) keys are ignored
    var B = g.get();
    var p = panel("ca-dpanel-globe", "Globe", "right"), b = p.body, ctl = [];
    function set(path, v) {
      var parts = path.split("."), patch = {};
      if (parts.length === 2) { patch[parts[0]] = clone(B[parts[0]]); patch[parts[0]][parts[1]] = v; }
      else patch[path] = v;
      g.set(patch); B = g.get(); save(KEY_B, B);
    }
    function get(path) { var parts = path.split("."); return parts.length === 2 ? B[parts[0]][parts[1]] : B[path]; }
    function add(path, spec) {
      var c = control(b, spec, get(path), function (v) {
        if (spec.type === "select" && spec.number) v = +v;
        set(path, v);
      });
      ctl.push({ path: path, spec: spec, c: c });
    }
    heading(b, "Placement");
    add("placement", { type: "select", label: "Position", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] });
    add("layer", { type: "select", label: "Layer (desktop)", options: [["behind", "Behind the text"], ["beside", "Beside the text"]] });
    add("size", { type: "range", label: "Size", min: 0.3, max: 1.4, step: 0.01, fmt: function (v) { return Math.round(v * 100); }, unit: "%" });
    add("offsetX", { type: "range", label: "Offset X", min: -600, max: 600, unit: "px" });
    add("offsetY", { type: "range", label: "Offset Y", min: -400, max: 400, unit: "px" });
    heading(b, "Dots");
    add("dots", { type: "range", label: "Density (desktop)", min: 2000, max: 40000, step: 500 });
    add("dotsPhone", { type: "range", label: "Density (phone)", min: 1000, max: 15000, step: 500 });
    add("dotSize", { type: "range", label: "Dot size", min: 0.5, max: 4, step: 0.1, unit: "px" });
    add("dotColor.light", { type: "color", label: "Dot colour, Light" });
    add("dotOpacity.light", { type: "range", label: "Dot opacity, Light", min: 0.1, max: 1, step: 0.05 });
    add("dotColor.dark", { type: "color", label: "Dot colour, Dark" });
    add("dotOpacity.dark", { type: "range", label: "Dot opacity, Dark", min: 0.1, max: 1, step: 0.05 });
    heading(b, "Rotation");
    add("autoRotate", { type: "check", label: "Auto-rotate" });
    add("speed", { type: "range", label: "Speed", min: 0, max: 40, step: 0.5, unit: "°/s" });
    add("direction", { type: "select", label: "Direction", number: true, options: [["1", "Eastward"], ["-1", "Westward"]] });
    add("startLon", { type: "range", label: "Starting longitude", min: -180, max: 180, unit: "°" });
    add("tilt", { type: "range", label: "Tilt", min: -60, max: 75, unit: "°" });
    heading(b, "Atmosphere");
    add("glow", { type: "check", label: "Glow on" });
    add("glowStrength", { type: "range", label: "Strength", min: 0, max: 1, step: 0.05 });
    heading(b, "Performance");
    var fps = document.createElement("p");
    fps.className = "ca-dpanel__fps";
    fps.setAttribute("aria-live", "off");
    b.appendChild(fps);
    setInterval(function () {
      fps.textContent = (g.fps ? g.fps + " frames a second" : "Not drawing (still, hidden or off screen)") + " · " + (g.dots.length / 3) + " dots drawn" + (g.gl ? "" : " · no WebGL: still picture");
    }, 500);

    p.box.querySelector('[data-act="copy"]').addEventListener("click", function () {
      copyText(JSON.stringify({ globe: B }, null, 2), p.status);
    });
    p.box.querySelector('[data-act="reset"]').addEventListener("click", function () {
      drop(KEY_B); g.set(clone(DEF_B)); B = g.get();
      ctl.forEach(function (x) { x.c.show(get(x.path)); });
      p.status.textContent = "Reset to the defaults";
    });
  }

  buildA();
  applyA();
  function globeReady() {
    var g = window.CA_DOT_GLOBE && window.CA_DOT_GLOBE.instances[0];
    if (g) buildB(g);
    return !!g;
  }
  if (!globeReady()) document.addEventListener("dot-globe:ready", globeReady, { once: true });
})();
