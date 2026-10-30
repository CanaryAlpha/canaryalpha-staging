/*
 * Contact Us form (contact/). Validates in the browser, then sends name,
 * email, phone and message to the "contact" Formspree endpoint in
 * components/site.config.js. Until that endpoint is set, nothing is sent and
 * the visitor is asked to email us. Validation and sending:
 * components/form-fields.js.
 */
(function () {
  var form = document.getElementById("contact-form");
  var rules = window.CA_FORM.rules;

  // Called on a valid submit. Fields: name, email, phone, message.
  function submitContactForm(form, done) {
    window.CA_FORM.send(form, "contact", ["name", "email", "phone", "message"], done);
  }

  window.CA_FORM.attach(form, {
    name: rules.required("name"),
    email: rules.email,
    phone: rules.phone,
    message: rules.length("message", 10, 2000)
  }, submitContactForm);
})();
