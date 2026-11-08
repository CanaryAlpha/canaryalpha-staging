/*
 * Members' page check. Put it in <head>, after components/auth.js:
 *
 *   <script src="../components/auth-gate.js" data-require="any"></script>
 *
 * data-require: "any" (any logged-in user), "pro" or "enterprise".
 *
 * The real guard is on the server: middleware.js won't serve these pages
 * without a session, and the api/ functions that hold the content check the
 * plan themselves. This only keeps the page tidy while it asks the server
 * who is logged in: <main> stays hidden (html.auth-checking, styles.css)
 * until the answer is in, a lapsed session goes to the login page, and a
 * plan that's too low gets a short note instead of an empty page.
 *
 * Page scripts wait for CA_ACCESS.ready: a Promise of the user
 * ({ name, email, tier }), which never resolves when the page is blocked.
 */
(function () {
  var script = document.currentScript;
  var need = (script && script.getAttribute("data-require")) || "any";
  var auth = window.CA_AUTH;
  var root = document.documentElement;
  root.classList.add("auth-checking");

  var NAMES = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function whenReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function paywall(user, paidPlans) {
    var main = document.querySelector("main");
    if (!main) return;
    var plan = NAMES[need];
    var cta = paidPlans
      ? '<a class="members__button" href="' + esc(auth.urls.account) + '">See plans on your Settings page</a>'
      : '<a class="members__button" href="' + esc(auth.urls.waitlist + "?plan=" + need) + '">Coming soon. Join the list</a>';
    main.className = "paywall";
    main.innerHTML =
      '<section class="paywall__box" aria-labelledby="paywall-title">' +
        '<p class="paywall__tag"><span>' + plan + "</span></p>" +
        '<h1 class="paywall__title" id="paywall-title">This page is part of ' + plan + "</h1>" +
        '<p class="paywall__intro">You&rsquo;re logged in as ' + esc(user.name || user.email) + " on the " + NAMES[user.tier] + " plan.</p>" +
        '<div class="paywall__actions">' + cta + "</div>" +
        '<p class="paywall__back"><a href="' + esc(auth.dashboardUrl()) + '">Back to your dashboard</a></p>' +
      "</section>";
    document.title = plan + " required — Canary Alpha Research";
    root.classList.remove("auth-checking");
  }

  var access = { blocked: true };
  access.ready = auth.ready.then(function (user) {
    if (!user) {
      location.replace(auth.urls.login + "?next=" + encodeURIComponent(location.pathname + location.search + location.hash));
      return new Promise(function () {});
    }
    if (need !== "any" && !auth.hasTier(need)) {
      return auth.config().then(function (cfg) {
        whenReady(function () { paywall(user, cfg.paidPlans); });
        return new Promise(function () {});
      });
    }
    access.blocked = false;
    whenReady(function () { root.classList.remove("auth-checking"); });
    return user;
  }, function () {
    // The server couldn't be asked: say so rather than guess.
    whenReady(function () {
      var main = document.querySelector("main");
      if (main) {
        main.className = "paywall";
        main.innerHTML = '<section class="paywall__box"><h1 class="paywall__title">We couldn&rsquo;t load your account</h1>' +
          '<p class="paywall__intro">Check your connection and reload the page. If it keeps happening, email ' +
          '<a href="mailto:hello@canaryalpha.co">hello@canaryalpha.co</a>.</p></section>';
      }
      root.classList.remove("auth-checking");
    });
    return new Promise(function () {});
  });
  window.CA_ACCESS = access;
})();
