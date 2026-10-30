/*
 * "Explain this": a small circled "i" next to a term, metric or paragraph.
 * Clicking or tapping it opens a compact popover with up to four short
 * sections (What it means, What it does, Why it matters, How it changes the
 * crypto space; empty ones are hidden; Simple mode shows only the first and
 * third), a "Learn more" link and the "Education only" note.
 *
 * Text comes from learn/data/explainers.js, keyed by term ID, so one
 * definition is reused everywhere.
 *
 *   CA_EXPLAIN.icon("market-cap")          the icon button (HTML); "" if the ID is unknown
 *   CA_EXPLAIN.icon("market-cap", "label") with a custom accessible name
 *   <span class="explain-slot" data-explain="market-cap"></span>
 *                                          in page HTML: becomes the icon on load
 *   CA_EXPLAIN.enhance(root)               turn slots inside root into icons
 *
 * Behaviour: opens on click, tap or Enter/Space (never hover alone); closes
 * on a click outside, the close button or Esc (focus returns to the icon).
 * It is a labelled dialog, focused when it opens so screen readers announce
 * it. On desktop it sits next to the icon and is kept inside the window; on
 * phones it is a bottom sheet. It floats above the page (one element at the
 * end of <body>), so opening it never moves anything; the icon itself has a
 * fixed size and a 44px tap area that takes no space.
 *
 * Load after components/learn/learn-core.js.
 */
window.CA_EXPLAIN = (function () {
  var L = window.CA_LEARN;
  var DATA = window.CA_LEARN_EXPLAINERS || {};
  var esc = L.esc;
  var ICON = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M10 9v5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    '<circle cx="10" cy="6.1" r="1.1" fill="currentColor"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var sheet = window.matchMedia("(max-width: 767px)");

  function icon(id, label) {
    var e = DATA[id];
    if (!e) return "";
    return '<button type="button" class="explain" data-explain="' + esc(id) + '" aria-haspopup="dialog" aria-expanded="false" ' +
      'aria-label="Explain: ' + esc(label || e.term) + '">' + ICON + "</button>";
  }

  function enhance(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("span.explain-slot[data-explain]"), function (s) {
      var html = icon(s.getAttribute("data-explain"), s.getAttribute("data-label"));
      if (html) s.outerHTML = html;
      else s.parentNode.removeChild(s);
    });
  }

  /* ---- The popover --------------------------------------------------------- */
  var pop = null, current = null;

  function learnMore(id, e) {
    var lm = e.learnMore || {}, v = lm.video && L.video(lm.video), a = lm.article && L.article(lm.article);
    if (v) return '<a class="explain-pop__more" href="' + esc(L.url.video(v.id)) + '">Learn more: watch “' + esc(v.title) + "”</a>";
    if (a) return '<a class="explain-pop__more" href="' + esc(L.url.article(a.id)) + '">Learn more: read “' + esc(a.title) + "”</a>";
    return '<a class="explain-pop__more" href="' + esc(L.url.glossary(id)) + '">Learn more in the glossary</a>';
  }

  function content(id) {
    var e = DATA[id], simple = L.mode() === "simple";
    var parts = [
      ["What it means", e.means],
      ["What it does", simple ? "" : e.does],
      ["Why it matters", e.matters],
      ["How it changes the crypto space", simple ? "" : e.changes]
    ].filter(function (p) { return p[1]; });
    return '<div class="explain-pop__head"><p class="explain-pop__title" id="explain-pop-title">' + esc(e.term) + "</p>" +
        '<button type="button" class="explain-pop__close" aria-label="Close">' + CLOSE + "</button></div>" +
      '<dl class="explain-pop__body">' + parts.map(function (p) {
        return "<div><dt>" + p[0] + "</dt><dd>" + esc(p[1]) + "</dd></div>";
      }).join("") + "</dl>" +
      '<div class="explain-pop__foot">' + learnMore(id, e) + L.eduNote("explain-pop__edu") + "</div>";
  }

  function ensure() {
    if (pop) return;
    pop = document.createElement("div");
    pop.className = "explain-pop";
    pop.id = "explain-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "false");
    pop.setAttribute("aria-labelledby", "explain-pop-title");
    pop.tabIndex = -1;
    pop.hidden = true;
    document.body.appendChild(pop);
    pop.addEventListener("click", function (e) {
      if (e.target.closest(".explain-pop__close")) close(true);
    });
    pop.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      // Tabbing out of either end returns to the icon (the popover lives at
      // the end of the page, away from it).
      var f = pop.querySelectorAll("a[href], button");
      var first = f[0], last = f[f.length - 1], at = document.activeElement;
      if ((e.shiftKey && (at === first || at === pop)) || (!e.shiftKey && at === last)) {
        e.preventDefault();
        close(true);
      }
    });
  }

  function place() {
    if (!current) return;
    var isSheet = sheet.matches;
    pop.classList.toggle("is-sheet", isSheet);
    if (isSheet) { pop.style.left = ""; pop.style.top = ""; return; }
    var r = current.getBoundingClientRect(), m = 8;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), vw - w - m);
    var below = r.bottom + 10, above = r.top - 10 - h, top;
    if (below + h <= vh - m) top = below;
    else if (above >= m) top = above;
    else top = Math.max(m, Math.min(below, vh - m - h));
    pop.style.left = Math.round(left + window.scrollX) + "px";
    pop.style.top = Math.round(top + window.scrollY) + "px";
  }

  function open(btn) {
    ensure();
    if (current === btn) { close(true); return; }
    if (current) current.setAttribute("aria-expanded", "false");
    current = btn;
    pop.innerHTML = content(btn.getAttribute("data-explain"));
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-controls", "explain-pop");
    place();
    pop.focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (!current) return;
    var b = current;
    current = null;
    pop.hidden = true;
    b.setAttribute("aria-expanded", "false");
    if (returnFocus) b.focus({ preventScroll: true });
  }

  // Capture phase, so a click on an icon inside a clickable row or card
  // never also opens that row or card.
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".explain");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    open(b);
  }, true);
  document.addEventListener("pointerdown", function (e) {
    if (!current) return;
    if (pop.contains(e.target) || (e.target.closest && e.target.closest(".explain"))) return;
    close(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && current) { e.preventDefault(); close(true); }
  });
  document.addEventListener("focusin", function (e) {
    if (current && !pop.contains(e.target) && e.target !== current) close(false);
  });
  window.addEventListener("resize", place);
  document.addEventListener("ca-learn-mode", function () {
    if (current) { pop.innerHTML = content(current.getAttribute("data-explain")); place(); }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { enhance(); });
  else enhance();

  return { icon: icon, enhance: enhance, close: function () { close(false); } };
})();
