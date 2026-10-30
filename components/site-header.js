/*
 * Site header component. Fills any <header data-site-header> with the top
 * menu bar. Load it (synchronously, before page scripts) on every page:
 *
 *   <link rel="stylesheet" href="../components/site-header.css">
 *   <header class="site-header" data-site-header data-home="./"></header>
 *   <script src="../components/site-header.js"></script>
 *
 * data-home is the link for the brand, relative to the page (default "./").
 * data-root is the way back to the site root ("" on the home page, "../" one
 * folder down). With it, the menu links come from window.CA_SITE_LINKS.menu
 * (site-links.js, loaded first), each href prefixed with data-root; the
 * footer reads the same file, so the two stay in sync.
 * Without data-root, data-links (optional) lists menu links as
 * "Label=href|Label=href", e.g. data-links="Pricing=#pricing|FAQ=#faq".
 * The links sit in a drop-down panel opened by the menu button (at every
 * width). At its top, three display options:
 *   Show       the menu stays open while you scroll and on every page you
 *              open, until you choose Auto hide or Hide;
 *   Auto hide  (default) choosing a link, clicking outside or Escape
 *              closes it;
 *   Hide       closes it now and goes back to Auto hide.
 * Show is for tablet and desktop (768px and up) only: on phones the option
 * is hidden and the menu always auto-hides, so it never covers half the
 * screen. A Show chosen on a wider screen still applies there.
 * The choice is remembered in this browser (localStorage "ca-menu-mode");
 * nothing else is stored. On the home page (data-home="#top") the brand scrolls to the top.
 * The theme toggle markup (one icon button) lives here; the page's script
 * wires it up (switching Light/Dark, its icon and label, saving the choice).
 *
 * Logged in or out comes ONLY from CA_AUTH (components/auth.js, loaded in
 * <head>). Logged out, the menu shows Log in and Sign up. Logged in, they
 * give way to a Dashboard group (Free, Pro, Enterprise; locked ones marked)
 * and the bar gets an account button (name, plan, Log out).
 */
(function () {
  // Theme icons: Lucide (https://lucide.dev, ISC licence), 24x24 grid,
  // 2px stroke, currentColor. The toggle shows the theme it switches to:
  // "moon" in Light, "sun" in Dark.
  var SVG_OPEN = '<svg class="themes__icon" viewBox="0 0 24 24" width="20" height="20" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ICONS = {
    light: SVG_OPEN + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>' +
      '<path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/>' +
      '<path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    dark: SVG_OPEN + '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    // Lucide "menu".
    menu: SVG_OPEN + '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
    // Display options: Lucide "pin" (Show), "timer" (Auto hide), "eye-off" (Hide).
    pin: SVG_OPEN + '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16' +
      'a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1' +
      ' 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
    timer: SVG_OPEN + '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/></svg>',
    // Lucide "lock", "chevron-down", "user".
    lock: SVG_OPEN.replace('class="themes__icon"', 'class="site-header__lock"') + '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    chevron: SVG_OPEN.replace('class="themes__icon"', 'class="site-header__chevron"') + '<path d="m6 9 6 6 6-6"/></svg>',
    hide: SVG_OPEN + '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>' +
      '<path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>' +
      '<path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>' +
      '<path d="m2 2 20 20"/></svg>'
  };

  // Display options for the menu panel (see the top of this file).
  var MODES = [
    { mode: "show", label: "Show", icon: "pin", title: "Keep the menu open while you scroll and on every page" },
    { mode: "auto", label: "Auto hide", icon: "timer", title: "Close the menu after you choose a link" },
    { mode: "hide", label: "Hide", icon: "hide", title: "Close the menu" }
  ];
  var MODE_KEY = "ca-menu-mode";
  function savedMode() {
    try { return localStorage.getItem(MODE_KEY) === "show" ? "show" : "auto"; } catch (e) { return "auto"; }
  }
  function saveMode(mode) {
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  }
  var modeButtons = '<div class="site-header__modes" role="group" aria-label="Menu display">' +
    MODES.map(function (m) {
      return '<button type="button" class="site-header__mode" data-mode="' + m.mode + '" title="' + m.title + '"' +
        (m.mode === "hide" ? "" : ' aria-pressed="false"') + ">" +
        ICONS[m.icon].replace('class="themes__icon"', 'class="site-header__mode-icon"') + m.label + "</button>";
    }).join("") + "</div>";

  // "Canary α Research" logo, coloured by currentColor: the words are live
  // text in Satoshi (--font-logo, styles.css); the α is the traced mark
  // from brand/reference/alpha.png. The underline shows on hover, like the
  // text link it replaced.
  var LOGO = '<span class="site-header__logo ca-logo" aria-hidden="true">Canary' +
    '<svg class="ca-logo__alpha" viewBox="7716 -1510 1529 1530" focusable="false"><path fill="currentColor" d="M8270 -1510 L8224 -1508 L8162 -1498 L8109 -1481 L8057 -1458 L7991 -1417 L7948 -1382 L7902 -1336 L7870 -1296 L7833 -1244 L7807 -1198 L7781 -1138 L7756 -1066 L7741 -1007 L7728 -935 L7718 -839 L7716 -784 L7716 -698 L7721 -609 L7730 -527 L7743 -455 L7757 -402 L7786 -317 L7816 -254 L7845 -205 L7882 -156 L7929 -107 L7991 -57 L8031 -34 L8083 -11 L8142 6 L8205 17 L8264 20 L8346 16 L8438 0 L8514 -27 L8583 -63 L8648 -112 L8708 -172 L8760 -245 L8803 -322 L8807 -314 L8828 -222 L8864 -107 L8885 -61 L8903 -31 L8919 -15 L8941 2 L8974 15 L9000 19 L9029 19 L9053 16 L9082 6 L9108 -9 L9145 -42 L9174 -84 L9201 -136 L9217 -182 L9232 -245 L9241 -307 L9245 -373 L9243 -388 L9191 -388 L9184 -327 L9171 -278 L9148 -238 L9122 -214 L9095 -201 L9069 -194 L9029 -194 L9010 -199 L8977 -218 L8952 -245 L8930 -278 L8897 -350 L8881 -399 L8861 -478 L8895 -606 L8934 -777 L9086 -1467 L8822 -1467 L8819 -1464 L8724 -1024 L8686 -1132 L8638 -1244 L8594 -1322 L8542 -1391 L8509 -1424 L8481 -1448 L8415 -1484 L8389 -1494 L8346 -1503 L8274 -1510Z M8293 -1388 L8326 -1387 L8362 -1378 L8412 -1355 L8460 -1316 L8502 -1267 L8541 -1204 L8600 -1083 L8640 -981 L8680 -853 L8632 -606 L8607 -504 L8573 -389 L8533 -291 L8492 -215 L8451 -159 L8402 -114 L8372 -96 L8349 -86 L8310 -76 L8287 -75 L8251 -77 L8218 -85 L8185 -100 L8165 -113 L8137 -139 L8115 -166 L8075 -238 L8046 -327 L8023 -452 L8010 -619 L8009 -790 L8020 -954 L8040 -1089 L8067 -1184 L8100 -1260 L8123 -1296 L8162 -1339 L8201 -1366 L8224 -1376 L8261 -1386 L8290 -1387Z"/></svg>' +
    "Research</span>";

  // Both icons are in the button; the page's script shows the right one.
  // aria-label names the action; data-label feeds the hover tooltip (CSS).
  var THEME_BUTTON = '<button type="button" class="themes__toggle" aria-label="Switch to dark" ' +
    'data-label="Switch to dark">' +
    ICONS.dark.replace('class="themes__icon"', 'class="themes__icon themes__icon--dark"') +
    ICONS.light.replace('class="themes__icon"', 'class="themes__icon themes__icon--light"') +
    "</button>";

  // The footer (site-footer.js) shows the same logo.
  window.CA_SITE_LOGO = LOGO;

  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  var headers = document.querySelectorAll("header[data-site-header]");
  Array.prototype.forEach.call(headers, function (header) {
    var home = header.getAttribute("data-home") || "./";
    var root = header.getAttribute("data-root");
    var site = window.CA_SITE_LINKS;
    var auth = window.CA_AUTH;
    var user = auth ? auth.getCurrentUser() : null;
    var TIER_NAMES = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
    var pairs = root !== null && site && site.menu
      ? site.menu.map(function (link) { return [link.label, root + link.href, link.loggedOut]; })
      : (header.getAttribute("data-links") || "").split("|").filter(Boolean).map(function (pair) {
        var i = pair.indexOf("=");
        return [pair.slice(0, i), pair.slice(i + 1)];
      });
    // Logged in: the Dashboard group takes the place of Log in / Sign up.
    var dashGroup = user && root !== null && site && site.dashboards
      ? '<li class="site-header__group"><button type="button" class="site-header__group-btn" aria-expanded="false" aria-controls="site-header-dashboards">' +
          "Dashboard" + ICONS.chevron + "</button>" +
          '<ul class="site-header__sub" id="site-header-dashboards" hidden>' + site.dashboards.map(function (d) {
            var locked = !auth.hasTier(d.tier);
            return '<li><a href="' + root + d.href + '"' + (locked ? ' class="is-locked"' : "") + ">" + d.label +
              (locked ? '<span class="site-header__plan">' + ICONS.lock + TIER_NAMES[d.tier] +
                '<span class="site-header__sr"> plan required</span></span>' : "") + "</a></li>";
          }).join("") + "</ul></li>"
      : "";
    var placed = false;
    var links = pairs.map(function (pair) {
      if (pair[2] && user) {
        if (placed) return "";
        placed = true;
        return dashGroup;
      }
      return '<li><a href="' + pair[1] + '">' + pair[0] + "</a></li>";
    }).join("") + (user && !placed ? dashGroup : "");
    var initial = user ? (user.name || user.email).trim().charAt(0).toUpperCase() : "";
    var account = user
      ? '<div class="site-header__account">' +
          '<button type="button" class="site-header__account-btn" aria-expanded="false" aria-controls="site-header-account" ' +
            'aria-label="Account: ' + esc(user.name || user.email) + ", " + TIER_NAMES[user.tier] + ' plan"><span class="site-header__avatar" aria-hidden="true">' + esc(initial) + "</span></button>" +
          '<div class="site-header__account-panel" id="site-header-account" hidden>' +
            '<p class="site-header__who"><span class="site-header__name">' + esc(user.name || user.email) + "</span>" +
              '<span class="site-header__email">' + esc(user.email) + "</span></p>" +
            '<p class="site-header__tier"><span class="site-header__tier-badge">' + TIER_NAMES[user.tier] + "</span> plan</p>" +
            '<button type="button" class="site-header__logout">Log out</button>' +
          "</div></div>"
      : "";
    header.innerHTML =
      '<div class="site-header__inner">' +
        // Brand: the logo (outlined paths, built by brand/build_logo.py).
        '<a class="site-header__brand" href="' + home + '" aria-label="Canary Alpha Research">' + LOGO + "</a>" +
        '<nav class="site-header__nav" aria-label="Main">' +
          (links ? '<button type="button" class="site-header__toggle" aria-expanded="false" ' +
            'aria-controls="site-header-panel" aria-label="Menu">' + ICONS.menu + "</button>" +
            '<div class="site-header__panel" id="site-header-panel">' + modeButtons +
              '<ul class="site-header__links">' + links + "</ul></div>" : "") +
        "</nav>" + account +
        '<div class="themes">' + THEME_BUTTON + "</div>" +
      "</div>";

    var toggle = header.querySelector(".site-header__toggle");
    var mode = savedMode();
    function setOpen(open) {
      header.classList.toggle("is-open", open);
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      if (open) setAccount(false);
    }

    // Account drop-down: name, plan, Log out. Closes on outside click or Esc.
    var accountBtn = header.querySelector(".site-header__account-btn");
    var accountPanel = header.querySelector(".site-header__account-panel");
    function setAccount(open) {
      if (!accountBtn) return;
      accountPanel.hidden = !open;
      accountBtn.setAttribute("aria-expanded", String(open));
      if (open && !pinned()) setOpen(false);
    }
    if (accountBtn) {
      accountBtn.addEventListener("click", function () { setAccount(accountPanel.hidden); });
      header.querySelector(".site-header__logout").addEventListener("click", function () {
        auth.signOut();
        // Off a members-only page (auth-gate.js ran) to the home page.
        if (window.CA_ACCESS) location.href = auth.urls.home;
        else location.reload();
      });
      document.addEventListener("click", function (e) {
        if (!accountPanel.hidden && !e.target.closest(".site-header__account")) setAccount(false);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !accountPanel.hidden) { setAccount(false); accountBtn.focus(); }
      });
    }

    // Dashboard group in the menu: opens and closes in place.
    var groupBtn = header.querySelector(".site-header__group-btn");
    if (groupBtn) groupBtn.addEventListener("click", function () {
      var open = groupBtn.getAttribute("aria-expanded") !== "true";
      groupBtn.setAttribute("aria-expanded", String(open));
      document.getElementById("site-header-dashboards").hidden = !open;
    });
    // Show only counts from 768px (see the top of this file).
    var wide = window.matchMedia("(min-width: 768px)");
    function pinned() { return mode === "show" && wide.matches; }
    function markMode() {
      var shown = pinned() ? "show" : "auto";
      Array.prototype.forEach.call(header.querySelectorAll(".site-header__mode[aria-pressed]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === shown));
      });
    }
    function setMode(next) {
      mode = next;
      saveMode(next);
      markMode();
    }
    if (wide.addEventListener) wide.addEventListener("change", markMode);
    if (toggle) {
      markMode(); // shows the saved choice; only a click saves one
      // Show: open on arrival, on every page.
      if (pinned()) setOpen(true);
      toggle.addEventListener("click", function () {
        setOpen(!header.classList.contains("is-open"));
      });
    }
    header.addEventListener("click", function (e) {
      var option = e.target.closest(".site-header__mode");
      if (option) {
        var chosen = option.getAttribute("data-mode");
        if (chosen === "hide") { setMode("auto"); setOpen(false); toggle.focus(); }
        else setMode(chosen);
        return;
      }
      if (!pinned() && e.target.closest(".site-header__links a")) setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!pinned() && !header.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });

    // Brand on the home page: back to the top, and drop the #section hash.
    if (home === "#top") header.querySelector(".site-header__brand").addEventListener("click", function (e) {
      e.preventDefault();
      if (!pinned()) setOpen(false);
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", location.pathname + location.search);
    });
  });

  // Faint shadow once the page is scrolled, so content sliding under the bar
  // has an edge. Nothing shows at the top of the page.
  function onScroll() {
    var scrolled = window.scrollY > 0;
    Array.prototype.forEach.call(headers, function (header) {
      header.classList.toggle("is-scrolled", scrolled);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
