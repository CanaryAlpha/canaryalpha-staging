/*
 * Pricing buttons for the paid plans. The page ships them as "Coming soon.
 * Join the list" (waitlist/), which is what everyone sees while paid plans
 * are closed. When the server's switch is on (PAID_PLANS_ENABLED, read
 * from /api/config by components/auth.js), each button with
 * data-paid-href / data-paid-label becomes the real one.
 */
(function () {
  var auth = window.CA_AUTH;
  if (!auth) return;
  auth.config().then(function (cfg) {
    if (!cfg.paidPlans) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-paid-href]"), function (a) {
      a.setAttribute("href", a.getAttribute("data-paid-href"));
      var label = a.querySelector("span");
      if (label) label.textContent = a.getAttribute("data-paid-label");
      a.classList.remove("plan__cta--soon");
    });
  });
})();
