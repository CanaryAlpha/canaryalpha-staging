/*
 * Shared bits for the members' pages (dashboard/, account/): escaping,
 * dates, plan names, verdict colours, and the billing actions. Data
 * always comes from the site's api/ through CA_AUTH.fetch, which checks the
 * plan on the server.
 */
window.CA_MEMBERS = (function () {
  var auth = window.CA_AUTH;
  var NAMES = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function date(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }

  // The research decision labels vary ("Avoid", "AVOID", "STAGED DCA — ...");
  // the colour follows the first word that matters.
  function verdictClass(decision) {
    var d = String(decision || "").toLowerCase();
    if (/avoid/.test(d)) return "avoid";
    if (/watch/.test(d)) return "watch";
    if (/hold|dca/.test(d)) return "hold";
    if (/deploy|buy|accumulate/.test(d)) return "deploy";
    return "watch";
  }

  // JSON from the site's api/, or an Error with the server's message.
  function api(path, opts) {
    return auth.fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (r.status === 401) {
          location.replace(auth.urls.login + "?next=" + encodeURIComponent(location.pathname + location.search));
          return new Promise(function () {});
        }
        if (!r.ok) {
          var e = new Error(body.message || "Something went wrong. Please try again.");
          e.code = body.error;
          throw e;
        }
        return body;
      });
    });
  }

  // Stripe Checkout or the customer portal; both are pages on Stripe.
  // upgrade(plan): a Pro member straight to the portal's page confirming
  // the move to that Enterprise price.
  function checkout(plan) {
    return api("billing/checkout", { method: "POST", body: JSON.stringify({ plan: plan }) })
      .then(function (b) { location.assign(b.url); });
  }
  function portal() {
    return api("billing/portal", { method: "POST", body: "{}" }).then(function (b) { location.assign(b.url); });
  }
  function upgrade(plan) {
    return api("billing/portal", { method: "POST", body: JSON.stringify({ upgrade: plan }) }).then(function (b) { location.assign(b.url); });
  }

  // A button that runs an action, shows it is busy, and reports a failure
  // in the given status element.
  function wire(button, action, status) {
    button.addEventListener("click", function () {
      if (button.disabled) return;
      var label = button.textContent;
      button.disabled = true;
      button.textContent = "One moment…";
      if (status) status.textContent = "";
      action().catch(function (e) {
        button.disabled = false;
        button.textContent = label;
        if (status) status.textContent = e.message;
      });
    });
  }

  function errorBox(e) {
    return '<p class="members__error" role="alert">' + esc(e && e.message ? e.message : "Something went wrong. Please reload the page.") + "</p>";
  }

  return {
    NAMES: NAMES, esc: esc, date: date, verdictClass: verdictClass,
    api: api, checkout: checkout, portal: portal, upgrade: upgrade, wire: wire, errorBox: errorBox,
    ready: window.CA_ACCESS ? window.CA_ACCESS.ready : auth.ready
  };
})();
