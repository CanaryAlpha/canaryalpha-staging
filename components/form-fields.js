/*
 * Form fields: client-side validation, inline errors and the submit flow for
 * the site's forms (contact/, signup/, login/). CA_FORM.send() is the only
 * thing that sends: to the Formspree endpoint in components/site.config.js,
 * and only the fields it is given. With no endpoint it sends nothing and asks
 * the visitor to email us instead.
 *
 * Markup for one field (styles: "Forms" in styles.css):
 *
 *   <div class="field">
 *     <label class="field__label" for="contact-email">Email</label>
 *     <input class="field__input" id="contact-email" name="email" ...
 *            aria-describedby="contact-email-error">
 *     <p class="field__error" id="contact-email-error" aria-live="polite"></p>
 *   </div>
 *
 * CA_FORM.attach(form, checks, submit):
 *   checks  { fieldName: function (value, form) -> error text or "" }
 *   submit  function (form, done) called on a valid submit; call done()
 *           when finished, or done("message") to show an error and keep
 *           the fields (see submitContactForm / submitSignupForm / login).
 *           done({ html: "..." }) shows a note with a link instead (it is
 *           built only from our own text, never from what was typed).
 *
 * CA_FORM.send(form, key, fields, done): posts the named fields to
 * CA_SITE.forms[key], then calls done() or done({ html }) as above.
 * The submit button shows its data-busy label while submitting; the
 * element [data-form-status] (aria-live) shows data-success afterwards.
 */
window.CA_FORM = (function () {
  var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  var rules = {
    required: function (label) {
      return function (value) { return value.trim() ? "" : "Please enter your " + label + "."; };
    },
    email: function (value) {
      if (!value.trim()) return "Please enter your email address.";
      return EMAIL.test(value.trim()) ? "" : "Please enter a valid email address, like name@example.com.";
    },
    // Optional: empty is fine; otherwise 7 to 15 digits, with + ( ) - . and spaces allowed.
    phone: function (value) {
      var v = value.trim();
      if (!v) return "";
      var digits = v.replace(/\D/g, "").length;
      return /^\+?[\d\s().-]+$/.test(v) && digits >= 7 && digits <= 15
        ? "" : "Please enter a valid phone number, or leave it blank.";
    },
    password: function (value) { return value ? "" : "Please enter your password."; },
    newPassword: function (value) {
      if (!value) return "Please choose a password.";
      return value.length >= 8 ? "" : "Use at least 8 characters.";
    },
    length: function (label, min, max) {
      return function (value) {
        var n = value.trim().length;
        if (!n) return "Please enter a " + label + ".";
        if (n < min) return "Your " + label + " needs at least " + min + " characters.";
        if (n > max) return "Your " + label + " can be at most " + max + " characters.";
        return "";
      };
    }
  };

  function errorFor(input) {
    return document.getElementById(input.id + "-error");
  }

  function show(input, message) {
    var error = errorFor(input);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.closest(".field").classList.toggle("is-invalid", !!message);
    if (error && error.textContent !== message) error.textContent = message;
  }

  function value(input) {
    return input.type === "checkbox" ? (input.checked ? input.value : "") : input.value;
  }

  // "12 / 2000" under a textarea with data-counter="<id of the counter>".
  function counter(input) {
    var out = document.getElementById(input.getAttribute("data-counter"));
    if (out) out.textContent = input.value.length + " / " + input.maxLength;
  }

  function attach(form, checks, submit) {
    var button = form.querySelector('[type="submit"]');
    var status = form.querySelector("[data-form-status]");
    var label = button.textContent;
    var touched = {};

    function check(name) {
      var input = form.elements[name];
      var message = checks[name](value(input), form);
      show(input, message);
      return message;
    }

    Object.keys(checks).forEach(function (name) {
      var input = form.elements[name];
      if (input.getAttribute("data-counter")) {
        counter(input);
        input.addEventListener("input", function () { counter(input); });
      }
      // Errors show after leaving a field (or on submit), then update as
      // you type, so nothing nags before you have had a go.
      input.addEventListener("blur", function () {
        if (input.value || touched[name]) { touched[name] = true; check(name); }
      });
      input.addEventListener(input.type === "checkbox" ? "change" : "input", function () {
        if (touched[name]) check(name);
        // A field another one depends on (phone, for text updates) rechecks it too.
        Object.keys(touched).forEach(function (other) {
          if (other !== name && form.elements[other].getAttribute("data-depends") === name) check(other);
        });
        if (status) status.textContent = "";
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // never a real submission
      if (button.disabled) return;
      var first = null;
      Object.keys(checks).forEach(function (name) {
        touched[name] = true;
        if (check(name) && !first) first = form.elements[name];
      });
      if (first) { first.focus(); return; }

      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = button.getAttribute("data-busy");
      if (status) status.textContent = "";
      submit(form, function (error) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.textContent = label;
        // done("message"): the submit failed; keep what was typed.
        if (status) status.classList.toggle("is-error", !!error && !error.html);
        if (error) {
          if (status) { if (error.html) status.innerHTML = error.html; else status.textContent = error; }
          return;
        }
        form.reset();
        touched = {};
        Object.keys(checks).forEach(function (name) {
          var input = form.elements[name];
          show(input, "");
          if (input.getAttribute("data-counter")) counter(input);
        });
        if (status) status.textContent = status.getAttribute("data-success");
      });
    });
  }

  // Show/hide for password fields: <button data-password-toggle
  // aria-controls="<input id>">. The label says what a click will do.
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-password-toggle]");
    if (!b) return;
    var input = document.getElementById(b.getAttribute("aria-controls"));
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    b.setAttribute("aria-pressed", String(show));
    b.textContent = show ? "Hide" : "Show";
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  // ---- Sending (Formspree) ------------------------------------------------
  function emailLink(subject) {
    var email = (window.CA_SITE && window.CA_SITE.email) || "hello@canaryalpha.co";
    return '<a href="mailto:' + email + (subject ? "?subject=" + encodeURIComponent(subject) : "") + '">' + email + "</a>";
  }
  function send(form, key, fields, done) {
    var site = window.CA_SITE || {};
    var endpoint = (site.forms || {})[key];
    var subject = form.getAttribute("data-mail-subject") || "";
    if (!endpoint) {
      // Not connected yet: keep what was typed and point to email.
      done({ html: "This form isn't connected yet. Please email us at " + emailLink(subject) + "." });
      return;
    }
    var body = new FormData();
    fields.forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      if (input.type === "checkbox") { if (input.checked) body.append(name, input.value); }
      else if (input.value.trim()) body.append(name, input.value.trim());
    });
    if (subject) body.append("_subject", subject);
    fetch(endpoint, { method: "POST", body: body, headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
      .catch(function () {
        done({ html: "Something went wrong and your message wasn't sent. Please try again, or email us at " + emailLink(subject) + "." });
      });
  }

  return { rules: rules, attach: attach, send: send };
})();
