/*
 * Our own sign-up form (signup/), in the site's form style, with a
 * "Confirm password" field (Clerk's ready-made form has none). Clerk still
 * does the account work: password rules, the bot check, the emailed code
 * and the session. Login, password reset and the account page keep
 * Clerk's own forms (clerk-forms.js).
 *
 *   var s = CA_SIGNUP.mount(slot, Clerk, { agreedAt, consentText, next })
 *   s.consent(true|false)  the consent box is (un)ticked: "Create account"
 *                          is disabled, with a hint, until it is ticked
 *
 * Step 1: name (optional), email, password, confirm password. Step 2: the
 * 6-digit code Clerk emails. Then the session starts and the page goes to
 * next (a path on this site). Needs components/form-fields.js (CA_FORM).
 */
window.CA_SIGNUP = (function () {
  var F = window.CA_FORM;
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function field(id, name, label, type, attrs) {
    return '<div class="field">' +
      '<label class="field__label" for="' + id + '">' + label + "</label>" +
      '<input class="field__input" id="' + id + '" name="' + name + '" type="' + type + '" ' + attrs + ' aria-describedby="' + id + '-error">' +
      '<p class="field__error" id="' + id + '-error" aria-live="polite"></p></div>';
  }
  // hint (optional): HTML under the field, read out with it.
  function passwordField(id, name, label, attrs, hint) {
    var described = (hint ? id + "-hint " : "") + id + "-error";
    return '<div class="field">' +
      '<label class="field__label" for="' + id + '">' + label + "</label>" +
      '<div class="field__pw"><input class="field__input" id="' + id + '" name="' + name + '" type="password" ' + attrs + ' aria-describedby="' + described + '">' +
      '<button type="button" class="field__pw-toggle" data-password-toggle aria-controls="' + id + '" aria-pressed="false" aria-label="Show password">Show</button></div>' +
      (hint ? '<div class="field__hint" id="' + id + '-hint">' + hint + "</div>" : "") +
      '<p class="field__error" id="' + id + '-error" aria-live="polite"></p></div>';
  }

  // Clerk's password rules (dashboard, Passwords): 15 or more characters,
  // strong enough (zxcvbn 3), and not in a known data breach. Length and
  // the confirmation are ticked off as the visitor types (rules() below);
  // strength and breaches only Clerk can judge, when the account is made.
  var TICK = '<svg class="pw-rules__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<circle cx="8" cy="8" r="7"/><path d="M4.75 8.25l2.25 2.25 4.25-4.5"/></svg>';
  function rule(key, text) {
    return '<li data-rule="' + key + '">' + TICK + "<span>" + text + '</span><span class="pw-rules__state"> (not yet)</span></li>';
  }
  var PASSWORD_HINT = '<ul class="pw-rules">' +
      rule("length", "At least 15 characters") +
      rule("match", "Both passwords match") +
    "</ul>" +
    '<p class="pw-rules__note">It also can&rsquo;t be easy to guess or have appeared in a data breach; ' +
    "that&rsquo;s checked when you create your account. A few unrelated words together works well.</p>";

  // Clerk's error, in words for the visitor. Links are our own text only.
  function clerkError(e) {
    var err = e && e.errors && e.errors[0];
    if (!err) return "Something went wrong. Please try again.";
    if (err.code === "form_identifier_exists") {
      return { html: 'An account with this email already exists. <a href="../login/">Log in</a> instead.' };
    }
    if (err.code === "form_code_incorrect") return "That code isn't right. Check the email and try again.";
    if (err.code === "verification_expired") return "That code has expired. Send a new one below.";
    return err.longMessage || err.message || "Something went wrong. Please try again.";
  }

  // A sign-up Clerk hasn't finished: what it still needs, in words. Clerk
  // Protect can challenge a sign-up (clerk-js shows the challenge over the
  // page); if that couldn't run, "protect_check" is left in missingFields.
  function unfinished(su) {
    var missing = (su && su.missingFields || []).filter(function (n) { return n !== "email_address" && n !== "password"; });
    if (missing.indexOf("protect_check") !== -1) {
      return "We couldn't finish a quick security check. Please try again. If you use a VPN, turning it off can help. " +
        "Still stuck? Email hello@canaryalpha.co.";
    }
    if (missing.length) return "Sign-up also needs: " + missing.join(", ") + ". Please email hello@canaryalpha.co.";
    return "Your account isn't finished yet. Please email hello@canaryalpha.co.";
  }

  function mount(slot, Clerk, opts) {
    var email = "";
    var consented = false;
    // "Create account" waits for the consent box. Re-applied after every
    // attempt, because the form helper re-enables the button when it ends.
    function gate() {
      var b = slot.querySelector("#signup-form [type=submit]");
      var hint = slot.querySelector("#signup-consent-hint");
      if (!b || b.getAttribute("aria-busy") === "true") return;
      b.disabled = !consented;
      if (hint) hint.hidden = consented;
    }

    function stepDetails() {
      slot.innerHTML =
        '<form class="form form--signup" id="signup-form" novalidate>' +
          '<div class="form__row">' +
            field("signup-first", "first_name", "First name (optional)", "text", 'autocomplete="given-name" maxlength="100"') +
            field("signup-last", "last_name", "Last name (optional)", "text", 'autocomplete="family-name" maxlength="100"') +
          "</div>" +
          field("signup-email", "email", "Email", "email", 'autocomplete="email" inputmode="email" required maxlength="254"') +
          passwordField("signup-password", "password", "Password", 'autocomplete="new-password" required minlength="15" maxlength="128"', PASSWORD_HINT) +
          passwordField("signup-confirm", "confirm_password", "Confirm password", 'autocomplete="new-password" required maxlength="128" data-depends="password"') +
          // Clerk puts its bot check here when it needs one.
          '<div id="clerk-captcha"></div>' +
          '<div class="form__actions">' +
            '<button type="submit" class="form__submit" data-busy="Creating your account&hellip;" aria-describedby="signup-consent-hint">Create account</button>' +
            '<p class="form__hint" id="signup-consent-hint">Tick the box above to agree to our terms first.</p>' +
            '<p class="form__status" data-form-status role="status" aria-live="polite"></p>' +
          "</div></form>";
      var form = slot.querySelector("form");
      if (email) form.elements.email.value = email;
      gate();
      // Tick off the password rules as the visitor types.
      function rules() {
        var pw = form.elements.password.value, again = form.elements.confirm_password.value;
        [["length", pw.length >= 15], ["match", !!again && again === pw]].forEach(function (r) {
          var li = form.querySelector('[data-rule="' + r[0] + '"]');
          li.classList.toggle("is-met", r[1]);
          li.querySelector(".pw-rules__state").textContent = r[1] ? " (done)" : " (not yet)";
        });
      }
      form.elements.password.addEventListener("input", rules);
      form.elements.confirm_password.addEventListener("input", rules);
      F.attach(form, {
        first_name: function () { return ""; },
        last_name: function () { return ""; },
        email: F.rules.email,
        password: F.rules.newPassword,
        confirm_password: function (v, f) {
          if (!v) return "Please type your password again.";
          return v === f.elements.password.value ? "" : "The passwords don't match.";
        }
      }, function (f, done0) {
        function done(e) { done0(e); gate(); }
        if (!opts.agreedAt()) { done("Tick the box above to agree to our terms first."); return; }
        email = f.elements.email.value.trim();
        Clerk.client.signUp.create({
          emailAddress: email,
          password: f.elements.password.value,
          firstName: f.elements.first_name.value.trim() || undefined,
          lastName: f.elements.last_name.value.trim() || undefined,
          legalAccepted: true,
          unsafeMetadata: { termsAgreedAt: opts.agreedAt(), consentText: opts.consentText }
        }).then(function (su) {
          var other = (su.missingFields || []).filter(function (n) { return n !== "email_address" && n !== "password"; });
          if (other.length) throw { errors: [{ longMessage: unfinished(su) }] };
          return su.prepareEmailAddressVerification({ strategy: "email_code" });
        }).then(function () {
          stepCode();
        }, function (e) { done(clerkError(e)); });
      });
    }

    function stepCode() {
      slot.innerHTML =
        '<form class="form form--signup" id="signup-code-form" novalidate>' +
          '<p class="form-page__intro" id="signup-code-intro" tabindex="-1">We sent a 6-digit code to <strong>' + esc(email) + "</strong>. Enter it to finish creating your account.</p>" +
          field("signup-code", "code", "Code", "text", 'autocomplete="one-time-code" inputmode="numeric" required maxlength="6" pattern="[0-9]{6}"') +
          '<div class="form__actions">' +
            '<button type="submit" class="form__submit" data-busy="Checking&hellip;">Verify and continue</button>' +
            '<p class="form__status" data-form-status role="status" aria-live="polite"></p>' +
          "</div>" +
          '<p class="form__links"><button type="button" class="members__link" data-resend>Send a new code</button>' +
          '<button type="button" class="members__link" data-back>Use a different email</button></p>' +
        "</form>";
      var form = slot.querySelector("form");
      var status = form.querySelector("[data-form-status]");
      slot.querySelector("#signup-code-intro").focus();
      F.attach(form, {
        code: function (v) { return /^\d{6}$/.test(v.trim()) ? "" : "Enter the 6-digit code from the email."; }
      }, function (f, done) {
        var su = Clerk.client.signUp;
        su.attemptEmailAddressVerification({ code: f.elements.code.value.trim() }).then(function (res) {
          if (res.status !== "complete") throw { errors: [{ longMessage: unfinished(res) }] };
          return Clerk.setActive({ session: res.createdSessionId });
        }).then(function () {
          location.replace(opts.next());
        }, function (e) { done(clerkError(e)); });
      });
      form.querySelector("[data-resend]").addEventListener("click", function () {
        status.classList.remove("is-error");
        status.textContent = "Sending a new code…";
        Clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" }).then(function () {
          status.textContent = "A new code is on its way to " + email + ".";
        }, function (e) {
          var m = clerkError(e);
          status.classList.add("is-error");
          status.textContent = m.html ? "Couldn't send a new code. Please try again." : m;
        });
      });
      form.querySelector("[data-back]").addEventListener("click", stepDetails);
    }

    stepDetails();
    gate();
    return {
      started: function () { return !!email && !!slot.querySelector("#signup-code-form"); },
      consent: function (yes) { consented = !!yes; gate(); }
    };
  }

  return { mount: mount };
})();
