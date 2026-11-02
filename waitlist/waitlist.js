/*
 * "Join the list" for the paid plans (waitlist/). Sends name, email and the
 * plan asked about (?plan=pro or ?plan=enterprise) to the "waitlist"
 * Formspree endpoint in components/site.config.js.
 */
(function () {
  var form = document.getElementById("join-form");
  var plan = new URLSearchParams(location.search).get("plan");
  form.elements.plan.value = plan === "pro" || plan === "enterprise" ? plan : "";
  window.CA_FORM.attach(form, { email: window.CA_FORM.rules.email }, function (form, done) {
    window.CA_FORM.send(form, "waitlist", ["name", "email", "plan"], done);
  });
})();
