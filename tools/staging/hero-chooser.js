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

  var DEFAULTS = { style: "a", preview: "out", arrows: "on", size: "std", gap: 0, place: "right", open: true };
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
    '  html[data-hc-place="below"] .hero--text .hero__foot { align-items: center; } }',
    /* The panel itself: fixed colours, the same in both themes. */
    '.hc { position: fixed; z-index: 2147483646; right: 12px; bottom: 72px; width: min(19rem, calc(100vw - 24px)); max-height: calc(100vh - 140px); overflow: auto;',
    '  background: #fff; color: #0A0A0A; border: 1px solid #0A0A0A; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.25);',
    '  font: 14px/1.4 system-ui, -apple-system, sans-serif; text-shadow: none; }',
    '.hc[data-closed] { width: auto; }',
    '.hc__head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: 8px 8px 8px 12px; background: #FFEF00; border-radius: 9px 9px 0 0; }',
    '.hc[data-closed] .hc__head { border-radius: 9px; }',
    '.hc__title { margin: 0; font: 700 14px/1.2 system-ui, sans-serif; }',
    '.hc__body { padding: 10px 12px 12px; display: grid; gap: 10px; }',
    '.hc[data-closed] .hc__body { display: none; }',
    '.hc fieldset { margin: 0; padding: 0; border: 0; display: grid; gap: 4px; }',
    '.hc legend { padding: 0; margin-bottom: 4px; font-weight: 700; }',
    '.hc label { display: flex; align-items: flex-start; gap: 6px; cursor: pointer; }',
    '.hc label small { display: block; color: #3D3D3D; }',
    '.hc input[type=radio], .hc input[type=checkbox] { margin: 3px 0 0; accent-color: #0A0A0A; }',
    '.hc input[type=range] { width: 100%; accent-color: #0A0A0A; }',
    '.hc button { all: unset; box-sizing: border-box; min-height: 32px; padding: 4px 10px; border: 1px solid #0A0A0A; border-radius: 6px; background: #fff; color: #0A0A0A; cursor: pointer; font: 600 13px/1.2 system-ui, sans-serif; text-align: center; }',
    '.hc button:hover, .hc button:focus-visible { background: #0A0A0A; color: #FFEF00 !important; text-shadow: none !important; }',
    '.hc button:focus-visible, .hc input:focus-visible { outline: 2px solid #0A0A0A; outline-offset: 2px; }',
    '.hc__row { display: flex; gap: 6px; flex-wrap: wrap; }',
    '.hc__out { margin: 0; padding: 8px; background: #F4F4F4; border-radius: 6px; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }',
    '.hc__note { margin: 0; color: #3D3D3D; font-size: 12px; }'
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
    out.textContent = "Option: " + STYLE_NAMES[s.style] +
      "\nArrows: " + s.arrows + " · Height: " + (s.size === "lg" ? "52px" : "44px") +
      "\nSpacing: " + (s.gap ? s.gap + "px" : "default") + " · Desktop: " + (s.place === "right" ? "right of text" : "below text") +
      "\nPreview: " + PREVIEW_NAMES[s.preview];
    panel.toggleAttribute("data-closed", !s.open);
    toggle.textContent = s.open ? "Hide" : "Show";
    toggle.setAttribute("aria-expanded", String(s.open));
    sync();
  }

  function radios(name, legend, opts) {
    return '<fieldset><legend>' + legend + "</legend>" + opts.map(function (o) {
      return '<label><input type="radio" name="hc-' + name + '" value="' + o[0] + '"><span>' + o[1] + (o[2] ? "<small>" + o[2] + "</small>" : "") + "</span></label>";
    }).join("") + "</fieldset>";
  }

  var panel = document.createElement("section");
  panel.className = "hc";
  panel.setAttribute("aria-label", "Hero buttons options (staging only)");
  panel.innerHTML =
    '<div class="hc__head"><p class="hc__title">Hero buttons (staging)</p><button type="button" data-hc-toggle aria-controls="hc-body">Hide</button></div>' +
    '<div class="hc__body" id="hc-body">' +
      radios("style", "Primary button", [
        ["a", "A. Filled", "Submit-button fill: black (Light), white (Dark)"],
        ["b", "B. Ghost only", "Same as Learn more and Log in"],
        ["c", "C. Black and yellow", "Like Log in's Continue, both themes"]
      ]) +
      radios("preview", "Preview as", [["out", "Logged out"], ["free", "Logged in: Free"], ["pro", "Logged in: Pro"], ["enterprise", "Logged in: Enterprise"]]) +
      '<fieldset><legend>Adjust</legend>' +
        '<label><input type="checkbox" name="hc-arrows"><span>Show arrows</span></label>' +
        '<label><input type="checkbox" name="hc-size"><span>Taller buttons (52px)</span></label>' +
        '<label><input type="checkbox" name="hc-place"><span>Desktop: buttons below the text</span></label>' +
        '<label style="display:block">Spacing between buttons: <span data-hc-gapval></span><input type="range" name="hc-gap" min="0" max="40" step="4" aria-describedby="hc-gapnote"></label>' +
        '<p class="hc__note" id="hc-gapnote">0 = the default spacing.</p>' +
      "</fieldset>" +
      '<div class="hc__row"><button type="button" data-hc-theme="light">Light</button><button type="button" data-hc-theme="dark">Dark</button><button type="button" data-hc-reset>Reset</button><button type="button" data-hc-copy>Copy my choice</button></div>' +
      '<pre class="hc__out" aria-live="polite"></pre>' +
      '<p class="hc__note">Staging only; settings stay in this browser. Tell Claude the option you like (or paste "Copy my choice").</p>' +
    "</div>";
  document.body.appendChild(panel);
  var out = panel.querySelector(".hc__out");
  var toggle = panel.querySelector("[data-hc-toggle]");

  function sync() {
    panel.querySelectorAll('input[name="hc-style"]').forEach(function (i) { i.checked = i.value === s.style; });
    panel.querySelectorAll('input[name="hc-preview"]').forEach(function (i) { i.checked = i.value === s.preview; });
    panel.querySelector('input[name="hc-arrows"]').checked = s.arrows === "on";
    panel.querySelector('input[name="hc-size"]').checked = s.size === "lg";
    panel.querySelector('input[name="hc-place"]').checked = s.place === "below";
    panel.querySelector('input[name="hc-gap"]').value = s.gap;
    panel.querySelector("[data-hc-gapval]").textContent = s.gap ? s.gap + "px" : "default";
  }

  panel.addEventListener("change", function (e) {
    var t = e.target, n = t.name;
    if (n === "hc-style") s.style = t.value;
    else if (n === "hc-preview") s.preview = t.value;
    else if (n === "hc-arrows") s.arrows = t.checked ? "on" : "off";
    else if (n === "hc-size") s.size = t.checked ? "lg" : "std";
    else if (n === "hc-place") s.place = t.checked ? "below" : "right";
    else return;
    save(); apply();
  });
  panel.addEventListener("input", function (e) {
    if (e.target.name !== "hc-gap") return;
    s.gap = +e.target.value; save(); apply();
  });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-hc-toggle")) { s.open = !s.open; save(); apply(); }
    else if (b.hasAttribute("data-hc-reset")) { s = JSON.parse(JSON.stringify(DEFAULTS)); save(); apply(); }
    else if (b.hasAttribute("data-hc-theme")) {
      var t = b.getAttribute("data-hc-theme");
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("ca-demo-theme", t); } catch (x) {}
    } else if (b.hasAttribute("data-hc-copy")) {
      var text = out.textContent;
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy my choice"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    }
  });

  apply();
  // The page's own login check (index.html) settles after this runs; keep
  // the preview the panel shows.
  if (window.CA_AUTH && window.CA_AUTH.ready) window.CA_AUTH.ready.then(apply, apply);
})();
