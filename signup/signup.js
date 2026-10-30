/*
 * Sign up page (signup/). In production mode it shows "Join the list"
 * (join-form, below). The demo signup form, used when production mode is
 * off: validates in the browser,
 * then starts a demo free-tier session through components/auth.js and opens
 * the free dashboard. Nothing is sent and the password is not stored.
 * Validation and the submit flow: components/form-fields.js.
 */
(function () {
  var rules = window.CA_FORM.rules;

  // "Join the list" (production mode): sends name and email to the
  // "waitlist" Formspree endpoint in components/site.config.js.
  var join = document.getElementById("join-form");
  if (join) {
    window.CA_FORM.attach(join, { email: rules.email }, function (form, done) {
      window.CA_FORM.send(form, "waitlist", ["name", "email"], done);
    });
  }

  var form = document.getElementById("signup-form");

  // Called on a valid submit. Fields: name, email, password, phone,
  // sms_opt_in ("yes" when ticked, absent when not).
  function submitSignupForm(form, done) {
    // TODO: connect to the real auth provider and form backend here (create
    // the account, save phone and sms_opt_in), then call done() on success
    // or done("message") on failure.
    var auth = window.CA_AUTH, f = form.elements;
    auth.signUp(f.name.value, f.email.value, f.password.value).then(function (r) {
      if (!r.ok) { done(r.error); return; }
      location.replace(auth.dashboardUrl("free"));
    });
  }

  window.CA_FORM.attach(form, {
    name: rules.required("name"),
    email: rules.email,
    password: rules.newPassword,
    phone: rules.phone,
    // Text updates need a number to text.
    sms_opt_in: function (value, form) {
      return value && !form.elements.phone.value.trim()
        ? "Add a phone number above to get text updates, or untick this box." : "";
    }
  }, submitSignupForm);
})();
