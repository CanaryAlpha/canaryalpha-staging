/*
 * STAGING ONLY: a small "Hero spacing" panel on the staging homepage for
 * choosing how far the hero buttons sit from the right edge (desktop) and
 * how much space goes between them. tools/build-staging.py adds it to the
 * staging build's index.html; the live site never loads it (tools/ is not
 * deployed: .vercelignore). Delete this file once the spacing is chosen.
 *
 * Staging's hero is text only and centred, where the right-edge distance
 * doesn't apply, so "Live layout" shows the live arrangement (buttons to
 * the right of the text; the hero animation itself is not on staging).
 * Settings stay in this browser (localStorage), never sent.
 */
(function () {
  var KEY = "ca-hero-spacing";
  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  var actions = document.querySelector(".hero__actions");
  if (!hero || !actions) return;
  var textOnly = hero.classList.contains("hero--text");

  // Distances are measured from the last label's arrow to the window's
  // right edge, and between one label's arrow and the next label.
  var DEFAULTS = { right: 80, gap: 50, live: true, open: window.innerWidth >= 768 };
  var s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  Object.keys(DEFAULTS).forEach(function (k) { if (!(k in s)) s[k] = DEFAULTS[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var css = document.createElement("style");
  css.textContent = [
    /* Each button has 1.25rem (20px) side padding; the page margin is
       2.5rem (40px) on desktop. Right distance = 40 + 20 + margin-right.
       Label gap = 2 x 20 + flex gap. */
    '@media (min-width: 1100px) { html[data-hs] .hero__actions { margin-right: calc(var(--hs-right) - 60px); } }',
    'html[data-hs] .hero__actions { gap: calc(var(--hs-gap) - 40px); }',
    '@media (max-width: 599px) { html[data-hs] .hero__actions { gap: 0.5rem; } }',
    '.hs { position: fixed; z-index: 2147483646; right: 12px; bottom: 64px; width: min(16.5rem, calc(100vw - 24px)); max-height: calc(100vh - 140px); overflow: auto;',
    '  background: #fff; color: #0A0A0A; border: 1px solid #0A0A0A; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.25);',
    '  font: 13px/1.35 system-ui, -apple-system, sans-serif; text-shadow: none; }',
    '.hs[data-closed] { width: auto; }',
    '.hs__head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: 6px 6px 6px 10px; background: #FFEF00; border-radius: 9px 9px 0 0; }',
    '.hs[data-closed] .hs__head { border-radius: 9px; }',
    '.hs__title { margin: 0; font: 700 13px/1.2 system-ui, sans-serif; }',
    '.hs__body { padding: 8px 10px 10px; display: grid; gap: 9px; }',
    '.hs[data-closed] .hs__body { display: none; }',
    '.hs__label { display: block; margin: 0 0 3px; font-weight: 700; }',
    '.hs__row { display: flex; gap: 4px; flex-wrap: wrap; }',
    '.hs button { all: unset; box-sizing: border-box; min-height: 30px; padding: 4px 8px; border: 1px solid #0A0A0A; border-radius: 6px; background: #fff; color: #0A0A0A; cursor: pointer; font: 600 12px/1.2 system-ui, sans-serif; text-align: center; }',
    '.hs button[aria-pressed="true"] { background: #0A0A0A; color: #FFEF00; }',
    '.hs button:hover, .hs button:focus-visible { background: #0A0A0A; color: #FFEF00 !important; text-shadow: none !important; }',
    '.hs button:focus-visible, .hs input:focus-visible { outline: 2px solid #0A0A0A; outline-offset: 2px; }',
    '.hs input[type=range] { width: 100%; margin: 0; accent-color: #0A0A0A; }',
    '.hs__out { margin: 0; color: #3D3D3D; font-size: 11.5px; }'
  ].join("\n");
  document.head.appendChild(css);

  var panel = document.createElement("section");
  panel.className = "hs";
  panel.setAttribute("aria-label", "Hero spacing (staging only)");
  panel.innerHTML =
    '<div class="hs__head"><p class="hs__title">Hero spacing (staging)</p><button type="button" data-hs-toggle aria-controls="hs-body">Hide</button></div>' +
    '<div class="hs__body" id="hs-body">' +
      (textOnly ? '<div class="hs__row"><button type="button" data-hs-live>Live layout</button></div>' : "") +
      '<div><label class="hs__label" for="hs-right">From the right edge: <span data-hs-rightval></span></label>' +
        '<input type="range" id="hs-right" data-hs-right min="40" max="240" step="5">' +
        '<div class="hs__row" style="margin-top:4px" role="group" aria-label="Presets">' +
          '<button type="button" data-hs-preset="40" title="Same as the text\'s left margin (the first live version)">40</button>' +
          '<button type="button" data-hs-preset="60">60</button>' +
          '<button type="button" data-hs-preset="80" title="Twice the text\'s left margin">80</button>' +
          '<button type="button" data-hs-menu title="In line with the menu icon in the bar above">Menu icon</button></div></div>' +
      '<div><label class="hs__label" for="hs-gap">Between buttons: <span data-hs-gapval></span></label>' +
        '<input type="range" id="hs-gap" data-hs-gap min="40" max="120" step="2"></div>' +
      '<div class="hs__row"><button type="button" data-hs-reset>Reset</button><button type="button" data-hs-copy>Copy choice</button></div>' +
      '<p class="hs__out" aria-live="polite"></p>' +
      '<p class="hs__out">Desktop only (1100px+ wide): narrower windows stack the buttons under the text.</p>' +
    "</div>";
  document.body.appendChild(panel);
  var out = panel.querySelector(".hs__out");
  var toggle = panel.querySelector("[data-hs-toggle]");
  var liveBtn = panel.querySelector("[data-hs-live]");

  // What the page actually shows, measured: last arrow to the right edge,
  // and the space between labels.
  function measure() {
    var bs = Array.prototype.filter.call(actions.querySelectorAll(".button"), function (b) { return b.offsetParent; });
    var rs = bs.map(function (b) { var r = document.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect(); });
    if (!rs.length) return "";
    var gaps = [];
    for (var i = 1; i < rs.length; i++) if (Math.abs(rs[i].top - rs[0].top) < 2) gaps.push(Math.round(rs[i].left - rs[i - 1].right));
    return "On this page now: last button " + Math.round(window.innerWidth - rs[rs.length - 1].right) + "px from the right edge" +
      (gaps.length ? ", " + gaps.join("/") + "px between buttons." : " (stacked at this width).");
  }

  function menuIconDistance() {
    var icons = Array.prototype.filter.call(document.querySelectorAll("header[data-site-header] button"), function (b) { return b.offsetParent; });
    var menu = document.querySelector(".site-header__toggle");
    var el = menu && menu.offsetParent ? menu : icons[0];
    if (!el) return 115;
    var r = el.getBoundingClientRect(), svg = el.querySelector("svg"), sr = svg ? svg.getBoundingClientRect() : r;
    return Math.round(window.innerWidth - sr.right);
  }

  function apply() {
    root.setAttribute("data-hs", "");
    root.style.setProperty("--hs-right", s.right + "px");
    root.style.setProperty("--hs-gap", s.gap + "px");
    if (textOnly) {
      hero.classList.toggle("hero--text", !s.live);
      liveBtn.setAttribute("aria-pressed", String(s.live));
    }
    panel.querySelector("[data-hs-right]").value = s.right;
    panel.querySelector("[data-hs-gap]").value = s.gap;
    panel.querySelector("[data-hs-rightval]").textContent = s.right + "px";
    panel.querySelector("[data-hs-gapval]").textContent = s.gap + "px";
    panel.querySelectorAll("[data-hs-preset]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-hs-preset") === s.right)); });
    panel.toggleAttribute("data-closed", !s.open);
    toggle.textContent = s.open ? "Hide" : "Show";
    toggle.setAttribute("aria-expanded", String(s.open));
    requestAnimationFrame(function () { out.textContent = measure(); });
  }

  panel.addEventListener("input", function (e) {
    if (e.target.hasAttribute("data-hs-right")) s.right = +e.target.value;
    else if (e.target.hasAttribute("data-hs-gap")) s.gap = +e.target.value;
    else return;
    save(); apply();
  });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-hs-toggle")) s.open = !s.open;
    else if (b.hasAttribute("data-hs-live")) s.live = !s.live;
    else if (b.hasAttribute("data-hs-preset")) s.right = +b.getAttribute("data-hs-preset");
    else if (b.hasAttribute("data-hs-menu")) s.right = menuIconDistance();
    else if (b.hasAttribute("data-hs-reset")) s = JSON.parse(JSON.stringify(DEFAULTS));
    else if (b.hasAttribute("data-hs-copy")) {
      var text = "Hero spacing: last button " + s.right + "px from the right edge, " + s.gap + "px between buttons (desktop).";
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy choice"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
      return;
    } else return;
    save(); apply();
  });
  window.addEventListener("resize", function () { out.textContent = measure(); });
  apply();
})();
