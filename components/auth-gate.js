/*
 * Page access check (demo). Put it in <head>, after the stylesheets and
 * components/auth.js, on every page that needs a login:
 *
 *   <script src="../../components/auth-gate.js" data-require="pro" data-what="dashboard"></script>
 *
 * data-require: "any" (any logged-in user), "pro" or "enterprise".
 * data-what: "dashboard" or "page", for the paywall heading.
 *
 * Asks ONLY CA_AUTH (auth.js). Until the check is done the page's <main>
 * is hidden (html.auth-checking, styles.css), so locked content never
 * flashes. Logged out: off to the login page, which comes back here
 * after. Logged in on a lower tier: <main> becomes the paywall and the
 * page's own scripts skip their work (they look at CA_ACCESS.blocked).
 */
(function () {
  var script = document.currentScript;
  var need = (script && script.getAttribute("data-require")) || "any";
  var what = (script && script.getAttribute("data-what")) || "dashboard";
  var auth = window.CA_AUTH;
  var root = document.documentElement;
  root.classList.add("auth-checking");

  var user = auth.getCurrentUser();
  if (!user) {
    window.CA_ACCESS = { blocked: true, reason: "login" };
    location.replace(auth.urls.login + "?next=" + encodeURIComponent(location.pathname + location.search + location.hash));
    return;
  }
  if (need === "any" || auth.hasTier(need)) {
    window.CA_ACCESS = { blocked: false };
    root.classList.remove("auth-checking");
    return;
  }

  window.CA_ACCESS = { blocked: true, reason: "tier", need: need };

  // What each plan adds, for the paywall.
  var PLANS = {
    pro: {
      name: "Pro",
      bullets: [
        "Every token we cover, with Canary scores and verdicts",
        "The full market map and asset list, with every control",
        "Whale-wallet forensics and what changed since the last report"
      ]
    },
    enterprise: {
      name: "Enterprise",
      bullets: [
        "Custom reports on any token or project, tracked live",
        "Priority report completion with private delivery",
        "Everything in Pro, with platform access extended by each report"
      ]
    }
  };

  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var ARROW = '<svg class="button__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  function cta(href, label) {
    return '<a class="button button--ghost paywall__cta" href="' + esc(href) + '"><span>' + label + "</span>" + ARROW + "</a>";
  }

  function paywall() {
    var main = document.querySelector("main");
    if (!main) return;
    var plan = PLANS[need];
    var tierName = { free: "Free", pro: "Pro", enterprise: "Enterprise" }[user.tier];
    main.className = "paywall";
    main.innerHTML =
      '<section class="paywall__box" aria-labelledby="paywall-title">' +
        '<p class="paywall__tag">' + LOCK + "<span>" + plan.name + "</span></p>" +
        '<h1 class="paywall__title" id="paywall-title">This ' + esc(what) + " is part of " + plan.name + "</h1>" +
        '<p class="paywall__intro">You’re logged in as ' + esc(user.name || user.email) + " on the " + tierName + " plan. " + plan.name + " includes:</p>" +
        '<ul class="paywall__list">' + plan.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
        '<div class="paywall__actions">' +
          (need === "pro" ? cta(auth.urls.pricing, "Upgrade to Pro") : "") +
          cta(auth.urls.contact, need === "pro" ? "Enterprise? Contact us" : "Contact us about Enterprise") +
          (need === "enterprise" && !auth.hasTier("pro") ? cta(auth.urls.pricing, "Upgrade to Pro") : "") +
        "</div>" +
        '<p class="paywall__back"><a href="' + esc(auth.dashboardUrl(user.tier)) + '">Back to your dashboard</a></p>' +
      "</section>";
    document.title = plan.name + " required — Canary Alpha Research";
    root.classList.remove("auth-checking");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paywall);
  else paywall();
})();
