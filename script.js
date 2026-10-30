(function () {
  var thisScript = document.currentScript && document.currentScript.src;
  var THEME_KEY = "ca-demo-theme";
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var toggle = document.querySelector(".themes__toggle");

  function get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  // ---- Theme -------------------------------------------------------------
  function current() {
    var t = root.getAttribute("data-theme");
    return t || (mq.matches ? "dark" : "light");
  }

  // The toggle shows and names the theme it switches to.
  function render() {
    if (!toggle) return;
    var dark = current() === "dark";
    var label = dark ? "Switch to light" : "Switch to dark";
    toggle.classList.toggle("is-dark", dark);
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("data-label", label);
  }

  if (toggle) toggle.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    set(THEME_KEY, next);
    render();
  });

  // Until the reader picks a theme, keep following the OS live.
  mq.addEventListener("change", function () {
    if (!root.hasAttribute("data-theme")) render();
  });

  render();

  // ---- Back to top ---------------------------------------------------------
  // Shown once the hero (section 1) is mostly scrolled past (under a quarter
  // of it still on screen), hidden again as it comes back. "Mostly" rather
  // than "fully" so it still appears on tall screens with short content.
  var toTop = document.querySelector(".back-to-top");
  var hero = document.querySelector(".hero");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (toTop && hero) {
    toTop.hidden = false; // visibility is then driven by .is-visible
    new IntersectionObserver(function (entries) {
      toTop.classList.toggle("is-visible", entries[0].intersectionRatio < 0.25);
    }, { threshold: [0, 0.25] }).observe(hero);
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
      // Keep keyboard users at the top too: focus the home link.
      var home = document.querySelector(".site-header__brand");
      if (home) home.focus({ preventScroll: true });
    });
  }

  // ---- FAQ accordion -------------------------------------------------------
  // One question open at a time, ~0.25s height animation
  // (none under prefers-reduced-motion). Native <details>, so keyboard
  // and screen readers work without the script.
  (function () {
    var items = [].slice.call(document.querySelectorAll(".faq__item"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var DUR = 250;

    function animate(item, open) {
      var a = item.querySelector(".faq__a");
      if (item._anim) item._anim.cancel();
      if (reduce.matches || !a.animate) { item.open = open; return; }
      var from = a.offsetHeight;
      if (open) item.open = true;
      var to = open ? a.scrollHeight : 0;
      if (!open && !item.open) return;
      item._anim = a.animate({ height: [from + "px", to + "px"] }, { duration: DUR, easing: "ease" });
      item._anim.onfinish = function () { item._anim = null; if (!open) item.open = false; };
    }

    items.forEach(function (item) {
      item.querySelector(".faq__q").addEventListener("click", function (e) {
        e.preventDefault();
        var opening = !item.open || item._closing;
        item._closing = !opening;
        if (opening) items.forEach(function (o) { if (o !== item && o.open && !o._closing) { o._closing = true; animate(o, false); } });
        animate(item, opening);
        if (opening) item._closing = false;
      });
      item.addEventListener("toggle", function () { if (!item.open) item._closing = false; });
    });
  })();

  // ---- Old section links -----------------------------------------------------
  // Sections 3-6 were renamed (and #framework became #our-process); old
  // links land on the new ids.
  (function () {
    var OLD = { "#section-3": "#our-process", "#framework": "#our-process", "#section-4": "#how-it-works", "#section-5": "#why-us",
                "#section-6": "#pricing" };
    function redirect() {
      var to = OLD[location.hash];
      if (!to) return;
      history.replaceState(null, "", to);
      var t = document.querySelector(to);
      if (t) t.scrollIntoView();
    }
    redirect();
    window.addEventListener("hashchange", redirect);
  })();

  // ---- Menu links ------------------------------------------------------------
  // Highlights the menu link for the section in view (a band across the
  // middle of the screen). Smooth scrolling comes from the CSS.
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll(".site-header__links a"));
    // Only in-page links (#id); other pages link back to the homepage.
    links = links.filter(function (l) { return /^#[\w-]+$/.test(l.getAttribute("href")); });
    var targets = links.map(function (l) { return document.querySelector(l.getAttribute("href")); })
      .filter(Boolean);
    if (!targets.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        links.forEach(function (l) {
          if (l.getAttribute("href") !== "#" + e.target.id) return;
          if (e.isIntersecting) l.setAttribute("aria-current", "true");
          else l.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  })();

  // ---- Font test panel (design tool, not for visitors) ------------------
  // ?fonts=1 turns it on for this browser session, ?fonts=0 turns it off.
  (function () {
    var m = /[?&]fonts=([01])(?:&|$)/.exec(location.search);
    var on = m ? m[1] === "1" : false;
    try {
      if (m) {
        if (on) sessionStorage.setItem("ca-font-panel", "1");
        else sessionStorage.removeItem("ca-font-panel");
      }
      on = sessionStorage.getItem("ca-font-panel") === "1";
    } catch (e) {}
    if (window.CA_SITE && window.CA_SITE.productionMode) on = false; // not on the public site
    if (!on || !thisScript) return;
    var s = document.createElement("script");
    s.src = new URL("components/font-panel.js?v=3", thisScript).href;
    document.head.appendChild(s);
  })();

  // The headline size slider is gone; drop its old saved setting.
  try { localStorage.removeItem("ca-demo-font-scale"); } catch (e) {}
})();
