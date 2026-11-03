/*
 * The account page (account/): who is logged in, their plan as the server
 * sees it (api/me), the billing actions, Clerk's profile panel, Log out.
 *
 * Paid plans show "Coming soon. Join the list" until the server's switch
 * (PAID_PLANS_ENABLED) is on; then the plan buttons start Stripe Checkout,
 * and a Pro member's Enterprise buttons open the portal's upgrade page.
 * Anyone who has a Stripe customer can always open the billing portal.
 * Coming back from Stripe (?checkout=success) re-reads the plan first, so
 * a new plan shows at once.
 */
(function () {
  var M = window.CA_MEMBERS, auth = window.CA_AUTH;
  var planBox = document.querySelector("[data-account-plan]");
  var who = document.querySelector("[data-account-who]");
  var notice = document.querySelector("[data-account-notice]");
  var params = new URLSearchParams(location.search);
  var back = params.get("checkout");

  function say(text) { notice.textContent = text; notice.hidden = false; }

  // The member's subscription, Pro or Enterprise, in one line.
  function planLine(b) {
    if (!b.plan || !b.status) return "";
    var name = M.NAMES[b.plan], end = M.esc(M.date(b.periodEnd));
    var every = b.interval === "year" ? "yearly" : "monthly";
    var reports = b.plan === "enterprise" ? ' <a href="../dashboard/enterprise/">Your bespoke reports</a>' : "";
    if (b.status === "past_due") return "<p>" + name + " (" + every + "): your last payment didn&rsquo;t go through. Update your card to keep " + name + "." + reports + "</p>";
    return b.cancelAtPeriodEnd
      ? "<p>" + name + " (" + every + "): cancelled. You keep " + name + " until " + end + "." + reports + "</p>"
      : "<p>" + name + " (" + every + "): renews on " + end + "." + reports + "</p>";
  }

  var SOON = function (plan) { return '<p><a class="members__button" href="../waitlist/?plan=' + plan + '">Coming soon. Join the list</a></p>'; };
  var ENTERPRISE_TEXT = "Everything in Pro, plus 3 bespoke reports a month on any token or project you choose, delivered privately. $1,000 a month, or $8,400 a year (save 30%).";

  function render(me) {
    var b = me.billing, tier = me.tier, paid = me.paidPlans;
    who.textContent = (me.user.name ? me.user.name + " · " : "") + me.user.email;
    var html = '<p class="account__plan"><span class="account__badge">' + M.NAMES[tier] + "</span> plan</p>" + planLine(b);
    var live = b.plan && b.status;
    var actions = [];
    // No plan: both plans. Pro: the move up to Enterprise (the portal
    // shows the prorated amount before anything is charged).
    if (!live) {
      actions.push('<div class="account__offer"><p class="account__offer-title">Pro</p>' + (paid
        ? '<p class="members__muted">Every report we publish. $30 a month, or $288 a year (save 20%).</p>' +
          '<p class="account__buttons"><button type="button" class="members__button" data-checkout="pro_monthly">Pro monthly, $30</button>' +
          '<button type="button" class="members__button" data-checkout="pro_yearly">Pro yearly, $288</button></p>'
        : '<p class="members__muted">Every report we publish.</p>' + SOON("pro")) + "</div>");
      actions.push('<div class="account__offer" id="enterprise"><p class="account__offer-title">Enterprise</p>' + (paid
        ? '<p class="members__muted">' + ENTERPRISE_TEXT + "</p>" +
          '<p class="account__buttons"><button type="button" class="members__button" data-checkout="enterprise_monthly">Enterprise monthly, $1,000</button>' +
          '<button type="button" class="members__button" data-checkout="enterprise_yearly">Enterprise yearly, $8,400</button></p>'
        : '<p class="members__muted">Everything in Pro, plus 3 bespoke reports a month on any token or project you choose.</p>' + SOON("enterprise")) + "</div>");
    } else if (b.plan === "pro") {
      actions.push('<div class="account__offer" id="enterprise"><p class="account__offer-title">Upgrade to Enterprise</p>' + (paid
        ? '<p class="members__muted">' + ENTERPRISE_TEXT + " You pay only the difference for the rest of this billing period; Stripe shows the amount before you confirm.</p>" +
          '<p class="account__buttons"><button type="button" class="members__button" data-upgrade="enterprise_monthly">Enterprise monthly, $1,000</button>' +
          '<button type="button" class="members__button" data-upgrade="enterprise_yearly">Enterprise yearly, $8,400</button></p>'
        : '<p class="members__muted">Everything in Pro, plus 3 bespoke reports a month on any token or project you choose.</p>' + SOON("enterprise")) + "</div>");
    }
    if (b.customer) {
      actions.push('<div class="account__offer"><p class="account__offer-title">Billing</p><p class="members__muted">Switch between monthly and yearly, change or cancel your plan, update your card, and download invoices.</p>' +
        '<p><button type="button" class="members__button" data-portal>Manage billing</button></p></div>');
    }
    planBox.innerHTML = html + actions.join("") + '<p class="members__error" data-billing-status role="alert"></p>';
    var status = planBox.querySelector("[data-billing-status]");
    Array.prototype.forEach.call(planBox.querySelectorAll("[data-checkout]"), function (btn) {
      M.wire(btn, function () { return M.checkout(btn.getAttribute("data-checkout")); }, status);
    });
    Array.prototype.forEach.call(planBox.querySelectorAll("[data-upgrade]"), function (btn) {
      M.wire(btn, function () { return M.upgrade(btn.getAttribute("data-upgrade")); }, status);
    });
    var portal = planBox.querySelector("[data-portal]");
    if (portal) M.wire(portal, M.portal, status);
    auth.remember(me);
  }

  function load() { return M.api("me").then(render); }

  M.ready.then(function () {
    if (back === "success") {
      say("Thank you. Your payment went through; your plan is updated below.");
      return M.api("billing/sync", { method: "POST", body: "{}" }).catch(function () {}).then(load);
    }
    if (back === "cancelled") say("Checkout was cancelled. Nothing was charged.");
    return load();
  }).then(function () {
    if (back) history.replaceState(null, "", location.pathname + location.hash);
    // #order-report: the old pricing link, from when Enterprise was per report.
    if (location.hash === "#enterprise" || location.hash === "#order-report") {
      var el = document.getElementById("enterprise");
      if (el) el.scrollIntoView();
    }
  }).catch(function (e) { planBox.innerHTML = M.errorBox(e); });

  // Log out: everywhere this session is open, then home.
  M.wire(document.querySelector("[data-logout]"), function () {
    return auth.signOut().then(function () { location.assign(auth.urls.home); });
  });
})();
