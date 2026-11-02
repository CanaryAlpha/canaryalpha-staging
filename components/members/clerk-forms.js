/*
 * Clerk's own forms, in our pages: sign in (login/, on the Canary panel)
 * and the profile panel (account/). Sign up (signup/) is our own form,
 * signup-form.js, on the same panel. Put the slot in the page:
 *
 *   <div class="clerk-slot" data-clerk="sign-in|sign-up|profile"></div>
 *
 * Clerk runs the whole flow: passwords, email verification codes, "Forgot
 * password?" and account deletion. After logging in or signing up it goes
 * to ?next= (a path on this site only) or the dashboard.
 *
 * Sign up shows under the consent box (components/consent-checkbox.js);
 * it can't be sent until the box is ticked, and the time it was ticked is
 * saved with the new account
 * (Clerk unsafeMetadata.termsAgreedAt; Clerk keeps its own server time,
 * createdAt, alongside).
 *
 * The profile panel follows the site theme (styles.css tokens); sign in
 * uses fixed colours for the Canary panel (panelAppearance).
 */
(function () {
  var auth = window.CA_AUTH;
  var slot = document.querySelector("[data-clerk]");
  if (!slot) return;
  var kind = slot.getAttribute("data-clerk");

  function next() {
    var n = new URLSearchParams(location.search).get("next") || "";
    return /^\/(?!\/)/.test(n) ? n : "/dashboard/";
  }
  function note(html) { slot.innerHTML = '<p class="clerk-slot__note">' + html + "</p>"; }

  function appearance() {
    var cs = getComputedStyle(document.documentElement);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    return {
      variables: {
        colorPrimary: v("--ink"), colorText: v("--ink"), colorTextSecondary: v("--muted"),
        colorBackground: v("--ground"), colorInputBackground: v("--ground"), colorInputText: v("--ink"),
        colorDanger: v("--danger"), colorSuccess: v("--success"), colorNeutral: v("--ink"),
        fontFamily: v("--font-body"), borderRadius: "6px", fontSize: "1rem"
      },
      // The page has its own heading and "Log in" / "Sign up" link, and the
      // form sits on the page like our other forms: no card frame.
      elements: {
        rootBox: { width: "100%" },
        cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "0", borderRadius: "0" },
        card: { boxShadow: "none", border: "0", padding: "0", background: "transparent" },
        header: kind === "profile" ? {} : { display: "none" },
        footerAction: { display: "none" }
      }
    };
  }

  // Log in sits on the Canary panel (members.css .auth-panel), which is
  // the same in both themes, so every Clerk colour is fixed for yellow
  // rather than read from the site theme. Contrast on #FFEF00: text
  // #0A0A0A 16.6:1, secondary #3D3D3D 9.1:1, errors #A30000 6.9:1; the
  // primary button is #0A0A0A with #FFEF00 text (16.6:1); inputs and the
  // Apple / Google buttons are white with a #0A0A0A border and text.
  var INK = "#0A0A0A", CANARY = "#FFEF00", WHITE = "#FFFFFF";
  function panelAppearance() {
    var font = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim();
    var control = { backgroundColor: WHITE, color: INK, border: "1px solid " + INK, boxShadow: "none" };
    return {
      layout: { socialButtonsVariant: "blockButton", socialButtonsPlacement: "top" },
      variables: {
        colorPrimary: INK, colorText: INK, colorTextSecondary: "#3D3D3D",
        colorTextOnPrimaryBackground: CANARY, colorPrimaryForeground: CANARY,
        colorBackground: CANARY, colorInputBackground: WHITE, colorInput: WHITE,
        colorInputText: INK, colorInputForeground: INK, colorForeground: INK, colorMutedForeground: "#3D3D3D",
        colorDanger: "#A30000", colorSuccess: "#0A5C2A", colorWarning: INK, colorNeutral: INK, colorShimmer: WHITE,
        fontFamily: font, borderRadius: "6px", fontSize: "1rem"
      },
      elements: {
        rootBox: { width: "100%" },
        cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "0", borderRadius: "0", background: "transparent" },
        card: { boxShadow: "none", border: "0", padding: "0", background: "transparent", color: INK },
        header: { display: "none" },
        footerAction: { display: "none" },
        // The "Development mode" strip (development instance only) spans the
        // panel instead of breaking out of it.
        footer: { background: "transparent", marginTop: "1rem", "& > div": { background: "transparent" } },
        main: { gap: "1.25rem" },
        formButtonPrimary: {
          backgroundColor: INK, color: CANARY, boxShadow: "none", border: "1px solid " + INK, textTransform: "none", fontSize: "1rem",
          "&:hover, &:focus": { backgroundColor: "#333333", color: CANARY },
          "&:focus-visible": { outline: "2px solid " + INK, outlineOffset: "2px" }
        },
        socialButtonsBlockButton: Object.assign({ "&:hover": { backgroundColor: "#F2F2F2" } }, control),
        socialButtonsBlockButtonText: { color: INK, fontWeight: 500 },
        socialButtonsProviderIcon: { opacity: 1, filter: "none" },
        dividerLine: { backgroundColor: INK, opacity: 1 },
        dividerText: { color: INK },
        formFieldLabel: { color: INK, fontWeight: 500 },
        formFieldInput: Object.assign({ "&:focus": { borderColor: INK, boxShadow: "0 0 0 2px " + INK } }, control),
        formFieldInputShowPasswordButton: { color: INK },
        formFieldAction: { color: INK, textDecoration: "underline" },
        formFieldHintText: { color: "#3D3D3D" },
        formFieldErrorText: { color: "#A30000" },
        formFieldSuccessText: { color: "#0A5C2A" },
        identityPreview: control,
        identityPreviewText: { color: INK },
        identityPreviewEditButton: { color: INK },
        identityPreviewEditButtonIcon: { color: INK },
        otpCodeFieldInput: Object.assign({}, control),
        formResendCodeLink: { color: INK, textDecoration: "underline" },
        alternativeMethodsBlockButton: control,
        backLink: { color: INK, textDecoration: "underline" },
        footerActionLink: { color: INK },
        alert: { backgroundColor: WHITE, color: "#A30000", border: "1px solid #A30000" },
        alertText: { color: "#A30000" }
      }
    };
  }

  // Clerk takes over the class list of the element it is mounted on, so it
  // gets a fresh inner element and the slot keeps its own styles.
  function host() {
    slot.innerHTML = "";
    var el = document.createElement("div");
    slot.appendChild(el);
    return el;
  }

  var FAILED = "Accounts are unavailable right now. Please try again in a few minutes, or email " +
    '<a href="mailto:hello@canaryalpha.co">hello@canaryalpha.co</a>.';

  auth.clerk().then(function (Clerk) {
    if (kind === "profile") {
      Clerk.mountUserProfile(host(), { appearance: appearance(), routing: "hash" });
      return;
    }
    // Already logged in: nothing to do here. If the server sent us straight
    // back (it doesn't accept the session), say so instead of looping.
    if (Clerk.user) {
      var last = 0;
      try { last = +sessionStorage.getItem("ca-login-bounce") || 0; } catch (e) {}
      if (Date.now() - last < 15000) {
        note("You&rsquo;re logged in, but we couldn&rsquo;t open your dashboard. Please reload in a minute, or email " +
          '<a href="mailto:hello@canaryalpha.co">hello@canaryalpha.co</a>.');
        return;
      }
      try { sessionStorage.setItem("ca-login-bounce", String(Date.now())); } catch (e) {}
      location.replace(next());
      return;
    }

    if (kind === "sign-in") {
      Clerk.mountSignIn(host(), {
        appearance: panelAppearance(), routing: "hash",
        forceRedirectUrl: next(), signUpUrl: auth.urls.signup, signUpForceRedirectUrl: next()
      });
      return;
    }

    // Sign up: our own form (signup-form.js, with "Confirm password"),
    // always shown under the consent box on the Canary panel. "Create
    // account" stays disabled until the box is ticked; the time it was
    // ticked goes to Clerk with the new account.
    var form = document.getElementById("consent-form");
    var box = form && form.querySelector('input[type="checkbox"]');
    function agreedAt() { return (box.checked && form.elements.terms_agreed_at && form.elements.terms_agreed_at.value) || ""; }
    var signup = window.CA_SIGNUP.mount(slot, Clerk, {
      agreedAt: agreedAt, next: next,
      consentText: "18+, Terms, Privacy, Disclaimer, not investment advice (signup/ consent box)"
    });
    form.addEventListener("change", function () { signup.consent(!!agreedAt()); });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    signup.consent(!!agreedAt());
  }, function () { note(FAILED); });
})();
