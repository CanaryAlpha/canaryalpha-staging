/*
 * STAGING ONLY: a small "Hero buttons" panel on the staging homepage for
 * comparing the three primary-button options and adjusting the buttons.
 * tools/build-staging.py adds it to the staging build's index.html; the
 * live site never loads it (tools/ is not deployed: .vercelignore).
 * Remove this file once an option is chosen, and the staging build stops
 * adding it.
 *
 * Options for the primary button (Sign up / Go to dashboard):
 *   A  Filled: the form Submit button's fill (--selected-bg / --selected-ink).
 *      This is what the hero-buttons branch ships (styles.css).
 *   B  Ghost: the shared .button--ghost, like Learn more and Log in.
 *   C  Black with Canary Yellow text in both themes, like the Log in panel.
 * Settings are kept in this browser only (localStorage), never sent.
 */
(function () {
  var KEY = "ca-hero-chooser";
  var root = document.documentElement;
  var actions = document.querySelector(".hero__actions");
  if (!actions) return;
  var dash = document.querySelector("[data-hero-dashboard]");

  // The staging homepage has the text-only hero (centred): there the buttons
  // default to a centred row under the text; the live layout (to the right
  // of the text on desktop) is one switch away. Phones start collapsed.
  var DEFAULTS = { style: "a", preview: "out", arrows: "on", size: "std", gap: 0,
    place: document.querySelector(".hero--text") ? "below" : "right", open: window.innerWidth >= 768 };
  var s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  Object.keys(DEFAULTS).forEach(function (k) { if (!(k in s)) s[k] = DEFAULTS[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var css = document.createElement("style");
  css.textContent = [
    /* Option B: the primary button drawn as the shared ghost button. */
    'html[data-hc-style="b"] .hero__actions .button.button--primary { background: transparent; border-color: transparent; color: var(--ink); font-weight: inherit; --canary-halo: inherit; --canary-halo-icon: inherit; }',
    /* Option C: black with Canary Yellow text in both themes (the Log in panel's Continue). */
    'html[data-hc-style="c"] .hero__actions .button.button--primary { background: #0A0A0A; border-color: #0A0A0A; color: #FFEF00; }',
    '@media (hover: hover) { html[data-hc-style="c"] .hero__actions .button.button--primary:hover { background: #333333; border-color: #333333; } }',
    'html[data-hc-style="c"] .hero__actions .button.button--primary:focus-visible { background: #333333; border-color: #333333; }',
    'html[data-hc-arrows="off"] .hero__actions .button__icon { display: none; }',
    'html[data-hc-size="lg"] .hero__actions .button.button { min-height: 52px; font-size: 1.0625rem; }',
    'html[data-hc-gap] .hero__actions { gap: var(--hc-gap); }',
    '@media (min-width: 1100px) { html[data-hc-place="below"] .hero__foot { flex-direction: column; align-items: flex-start; gap: 1.25rem; }',
    '  html[data-hc-place="below"] .hero--text .hero__foot { align-items: center; }',
    '  html[data-hc-place="below"] .hero--text .hero__foot .hero__text { margin-inline: auto; text-align: center; } }',
    /* The panel itself: compact, fixed colours, the same in both themes. */
    '.hc { position: fixed; z-index: 2147483646; right: 12px; bottom: 64px; width: min(16.5rem, calc(100vw - 24px)); max-height: calc(100vh - 140px); overflow: auto;',
    '  background: #fff; color: #0A0A0A; border: 1px solid #0A0A0A; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.25);',
    '  font: 13px/1.35 system-ui, -apple-system, sans-serif; text-shadow: none; }',
    '.hc[data-closed] { width: auto; }',
    '.hc__head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: 6px 6px 6px 10px; background: #FFEF00; border-radius: 9px 9px 0 0; }',
    '.hc[data-closed] .hc__head { border-radius: 9px; }',
    '.hc__title { margin: 0; font: 700 13px/1.2 system-ui, sans-serif; }',
    '.hc__body { padding: 8px 10px 10px; display: grid; gap: 8px; }',
    '.hc[data-closed] .hc__body { display: none; }',
    '.hc__label { margin: 0 0 3px; font-weight: 700; }',
    '.hc__seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }',
    '.hc__chips { display: flex; flex-wrap: wrap; gap: 4px; }',
    '.hc button, .hc select { all: unset; box-sizing: border-box; min-height: 30px; padding: 4px 8px; border: 1px solid #0A0A0A; border-radius: 6px; background: #fff; color: #0A0A0A; cursor: pointer; font: 600 12px/1.2 system-ui, sans-serif; text-align: center; }',
    '.hc select { width: 100%; text-align: left; background: #fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M0 0h10L5 6z%27/%3E%3C/svg%3E") no-repeat right 8px center / 8px; padding-right: 22px; }',
    '.hc button[aria-pressed="true"] { background: #0A0A0A; color: #FFEF00; }',
    '.hc button:hover, .hc button:focus-visible { background: #0A0A0A; color: #FFEF00 !important; text-shadow: none !important; }',
    '.hc button:focus-visible, .hc select:focus-visible, .hc input:focus-visible { outline: 2px solid #0A0A0A; outline-offset: 2px; }',
    '.hc input[type=range] { width: 100%; margin: 0; accent-color: #0A0A0A; }',
    '.hc__hint { margin: 3px 0 0; color: #3D3D3D; font-size: 11.5px; }',
    '.hc__row { display: flex; gap: 4px; flex-wrap: wrap; }',
    '.hc__out { margin: 0; color: #3D3D3D; font-size: 11.5px; }'
  ].join("\n");
  document.head.appendChild(css);

  var HOME = { free: "dashboard/", pro: "dashboard/pro/", enterprise: "dashboard/enterprise/" };
  var STYLE_NAMES = { a: "A. Filled (Submit-button fill)", b: "B. Ghost only", c: "C. Black and yellow" };
  var PREVIEW_NAMES = { out: "Logged out", free: "Logged in: Free", pro: "Logged in: Pro", enterprise: "Logged in: Enterprise" };

  function apply() {
    root.setAttribute("data-hc-style", s.style);
    root.setAttribute("data-hc-arrows", s.arrows);
    root.setAttribute("data-hc-size", s.size);
    root.setAttribute("data-hc-place", s.place);
    if (s.gap) { root.setAttribute("data-hc-gap", ""); root.style.setProperty("--hc-gap", s.gap / 16 + "rem"); }
    else { root.removeAttribute("data-hc-gap"); root.style.removeProperty("--hc-gap"); }
    // Preview only: shows the logged-in buttons without logging in. The
    // real check (index.html) runs as usual when this panel is closed.
    if (s.preview === "out") root.removeAttribute("data-auth-state");
    else { root.setAttribute("data-auth-state", "in"); if (dash) dash.setAttribute("href", HOME[s.preview]); }
    var full = "Hero buttons: option " + STYLE_NAMES[s.style] + "; arrows " + s.arrows +
      "; height " + (s.size === "lg" ? "52px" : "44px") + "; spacing " + (s.gap ? s.gap + "px" : "default") +
      "; desktop " + (s.place === "right" ? "right of the text" : "below the text") + " (previewed: " + PREVIEW_NAMES[s.preview] + ")";
    out.setAttribute("data-full", full);
    out.textContent = "Copy choice copies your settings to paste to Claude.";
    panel.toggleAttribute("data-closed", !s.open);
    toggle.textContent = s.open ? "Hide" : "Show";
    toggle.setAttribute("aria-expanded", String(s.open));
    sync();
  }

  var panel = document.createElement("section");
  panel.className = "hc";
  panel.setAttribute("aria-label", "Hero buttons options (staging only)");
  panel.innerHTML =
    '<div class="hc__head"><p class="hc__title">Hero buttons (staging)</p><button type="button" data-hc-toggle aria-controls="hc-body">Hide</button></div>' +
    '<div class="hc__body" id="hc-body">' +
      '<div><p class="hc__label" id="hc-style-l">Sign up button</p><div class="hc__seg" role="group" aria-labelledby="hc-style-l">' +
        '<button type="button" data-hc-style="a" title="Filled: the form Submit fill">A</button>' +
        '<button type="button" data-hc-style="b" title="Ghost: like Learn more and Log in">B</button>' +
        '<button type="button" data-hc-style="c" title="Black and yellow: like Log in\u2019s Continue">C</button></div>' +
        '<p class="hc__hint" data-hc-stylename></p></div>' +
      '<div><label class="hc__label" for="hc-preview" style="display:block">Preview as</label>' +
        '<select id="hc-preview" data-hc-preview><option value="out">Logged out</option><option value="free">Logged in: Free</option><option value="pro">Logged in: Pro</option><option value="enterprise">Logged in: Enterprise</option></select></div>' +
      '<div><p class="hc__label" id="hc-adj-l">Adjust</p><div class="hc__chips" role="group" aria-labelledby="hc-adj-l">' +
        '<button type="button" data-hc-flag="arrows">Arrows</button>' +
        '<button type="button" data-hc-flag="size">Taller (52px)</button>' +
        '<button type="button" data-hc-flag="place">Desktop: below text</button></div></div>' +
      '<div><label class="hc__label" for="hc-gap" style="display:block">Spacing: <span data-hc-gapval></span></label><input type="range" id="hc-gap" data-hc-gap min="0" max="40" step="4"></div>' +
      '<div class="hc__row"><button type="button" data-hc-theme="light">Light</button><button type="button" data-hc-theme="dark">Dark</button><button type="button" data-hc-reset>Reset</button><button type="button" data-hc-copy>Copy choice</button></div>' +
      '<p class="hc__out" aria-live="polite"></p>' +
    "</div>";
  document.body.appendChild(panel);
  var out = panel.querySelector(".hc__out");
  var toggle = panel.querySelector("[data-hc-toggle]");

  function sync() {
    panel.querySelectorAll("[data-hc-style]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-hc-style") === s.style)); });
    panel.querySelector("[data-hc-stylename]").textContent = STYLE_NAMES[s.style];
    panel.querySelector("[data-hc-preview]").value = s.preview;
    panel.querySelector('[data-hc-flag="arrows"]').setAttribute("aria-pressed", String(s.arrows === "on"));
    panel.querySelector('[data-hc-flag="size"]').setAttribute("aria-pressed", String(s.size === "lg"));
    panel.querySelector('[data-hc-flag="place"]').setAttribute("aria-pressed", String(s.place === "below"));
    panel.querySelector("[data-hc-gap]").value = s.gap;
    panel.querySelector("[data-hc-gapval]").textContent = s.gap ? s.gap + "px" : "default";
  }

  panel.addEventListener("change", function (e) {
    if (!e.target.hasAttribute("data-hc-preview")) return;
    s.preview = e.target.value; save(); apply();
  });
  panel.addEventListener("input", function (e) {
    if (!e.target.hasAttribute("data-hc-gap")) return;
    s.gap = +e.target.value; save(); apply();
  });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var flag = b.getAttribute("data-hc-flag");
    if (b.hasAttribute("data-hc-style")) s.style = b.getAttribute("data-hc-style");
    else if (flag === "arrows") s.arrows = s.arrows === "on" ? "off" : "on";
    else if (flag === "size") s.size = s.size === "lg" ? "std" : "lg";
    else if (flag === "place") s.place = s.place === "below" ? "right" : "below";
    else if (b.hasAttribute("data-hc-toggle")) s.open = !s.open;
    else if (b.hasAttribute("data-hc-reset")) s = JSON.parse(JSON.stringify(DEFAULTS));
    else if (b.hasAttribute("data-hc-theme")) {
      var t = b.getAttribute("data-hc-theme");
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("ca-demo-theme", t); } catch (x) {}
      return;
    } else if (b.hasAttribute("data-hc-copy")) {
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy choice"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(out.getAttribute("data-full")).then(done, function () {});
      return;
    } else return;
    save(); apply();
  });

  apply();
  // The page's own login check (index.html) settles after this runs; keep
  // the preview the panel shows.
  if (window.CA_AUTH && window.CA_AUTH.ready) window.CA_AUTH.ready.then(apply, apply);
})();
