/*
 * Clerk's own forms, in our pages: sign in (login/, on the Canary panel)
 * and the profile panel (account/). Sign up (signup/) is our own form,
 * signup-form.js, on the same panel. Put the slot in the page:
 *
 *   <div class="clerk-slot" data-clerk="sign-in|sign-up|profile"></div>
 *
 * Clerk runs the whole flow: passwords, email verification codes, "Forgot
 * password?" and account deletion. After logging in or signing up it always
 * goes to the dashboard (next() below).
 *
 * Sign up shows under the consent box (components/consent-checkbox.js);
 * it can't be sent until the box is ticked, and the time it was ticked is
 * saved with the new account
 * (Clerk unsafeMetadata.termsAgreedAt; Clerk keeps its own server time,
 * createdAt, alongside).
 *
 * The profile panel follows the site theme (styles.css tokens), and is
 * drawn again when the theme changes; sign in uses fixed colours for the
 * Canary panel (panelAppearance).
 */
(function () {
  var auth = window.CA_AUTH;
  var slot = document.querySelector("[data-clerk]");
  if (!slot) return;
  var kind = slot.getAttribute("data-clerk");

  // After logging in or signing up, always the member's dashboard (item
  // 407): /dashboard/ sends Pro and Enterprise members on to theirs. A
  // ?next= on the address (members' pages still add one) is ignored, so a
  // report link never lands a new login on the report.
  function next() { return "/dashboard/"; }
  function note(html) { slot.innerHTML = '<p class="clerk-slot__note">' + html + "</p>"; }

  // The profile panel (account/) in the site's own colours, read from the
  // theme tokens (styles.css) at the moment it is drawn, so it matches
  // Light and Dark. Both of Clerk's variable sets are given (the current
  // names and the older ones it still reads), and the parts Clerk paints
  // itself (the side menu, the "Secured by Clerk" footer, inputs, buttons,
  // badges, pop-up menus) are set explicitly: left to Clerk's defaults they
  // stayed dark on a light page. When the theme changes, the panel is
  // drawn again (watchTheme below).
  function hexToRgb(h) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h).trim());
    if (!m) return null;
    var x = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
    return [0, 2, 4].map(function (i) { return parseInt(x.slice(i, i + 2), 16); });
  }
  // a mixed into b by t (0-1), as #rrggbb; Clerk derives its shades from
  // plain colours, so no color-mix() here.
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    if (!x || !y) return b;
    return "#" + x.map(function (v, i) {
      return ("0" + Math.round(y[i] + (v - y[i]) * t).toString(16)).slice(-2);
    }).join("");
  }
  // Every Clerk password field (log in, password reset, sign-up's Clerk
  // steps, Settings > Security) is sized here, once, for both appearance
  // objects below. The input is `h` tall with its text and placeholder
  // centred (no vertical padding, normal line height). The show-password
  // button fills the input's full height, so the eye is centred with equal
  // space above and below; it is at least 44px square (tap target), and its
  // 20px icon sits 12px from the right edge, matching the text's 12px left
  // padding. Password inputs get 52px of right padding so typed text never
  // runs under the icon. Clerk's own button was 44px tall pinned 3px from
  // the top of a 36px input, which is why the eye hung low.
  function fieldSizing(ink, h) {
    return {
      input: { height: h, minHeight: h, paddingTop: "0", paddingBottom: "0", paddingLeft: "12px", lineHeight: "normal" },
      group: { position: "relative", "& input": { paddingRight: "52px" } },
      button: {
        position: "absolute", top: "0", bottom: "0", right: "0", left: "auto",
        width: "44px", minWidth: "44px", height: "100%", minHeight: "44px", margin: "0", padding: "0 12px 0 0",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        color: ink, background: "transparent", border: "0", boxShadow: "none", borderRadius: "6px",
        "&:hover": { background: "transparent", color: ink },
        "&:focus": { boxShadow: "none" },
        "&:focus-visible": { outline: "2px solid " + ink, outlineOffset: "-4px", boxShadow: "none" }
      },
      icon: { width: "20px", height: "20px", flexShrink: "0" }
    };
  }

  function appearance() {
    var cs = getComputedStyle(document.documentElement);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    var INK = v("--ink"), GROUND = v("--ground"), MUTED = v("--muted"), RULE = v("--rule");
    var DANGER = v("--danger"), SUCCESS = v("--success");
    var SOFT = mix(INK, GROUND, 0.06);   // hover and selected backgrounds
    var line = "1px solid " + RULE;
    var input = { backgroundColor: GROUND, color: INK, border: "1px solid " + MUTED, boxShadow: "none",
      "&[data-variant]": { borderWidth: "1px", borderStyle: "solid", borderColor: MUTED, boxShadow: "none" },
      "&:focus, &&[data-variant]:focus, &&[data-variant]:focus-within": { borderColor: INK, boxShadow: "0 0 0 1px " + INK } };
    var quiet = { color: INK, "&:hover, &:focus": { backgroundColor: SOFT, color: INK } };
    var size = fieldSizing(INK, "44px");
    return {
      variables: {
        colorPrimary: INK, colorPrimaryForeground: GROUND, colorTextOnPrimaryBackground: GROUND,
        colorForeground: INK, colorText: INK, colorMutedForeground: MUTED, colorTextSecondary: MUTED,
        colorBackground: GROUND, colorMuted: SOFT, colorNeutral: INK, colorBorder: RULE, colorShimmer: SOFT,
        colorInput: GROUND, colorInputBackground: GROUND, colorInputForeground: INK, colorInputText: INK,
        colorRing: INK, colorDanger: DANGER, colorSuccess: SUCCESS, colorWarning: INK,
        fontFamily: v("--font-body"), borderRadius: "6px", fontSize: "1rem"
      },
      elements: {
        rootBox: { width: "100%" },
        cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: line, borderRadius: "8px", backgroundColor: GROUND },
        card: { boxShadow: "none", border: "0", backgroundColor: GROUND, color: INK },
        scrollBox: { backgroundColor: GROUND, boxShadow: "none" },
        pageScrollBox: { backgroundColor: GROUND },
        page: { color: INK },
        navbar: { backgroundColor: GROUND, background: GROUND, borderRight: line, boxShadow: "none" },
        navbarMobileMenuRow: { backgroundColor: GROUND, borderBottom: line },
        navbarMobileMenuButton: { color: INK },
        navbarButton: Object.assign({ "&[data-active=\"true\"], &.cl-active": { backgroundColor: SOFT, color: INK } }, quiet),
        navbarButtonIcon: { color: INK, opacity: 1 },
        headerTitle: { color: INK },
        headerSubtitle: { color: MUTED },
        profileSectionTitleText: { color: INK },
        profileSection: { borderTop: line },
        profileSectionPrimaryButton: quiet,
        profileSectionItem: { color: INK },
        // "Secured by Clerk" and, on the test instance, "Development mode".
        footer: { backgroundColor: GROUND, background: GROUND, color: MUTED, borderTop: line, "& > div": { background: "transparent" } },
        footerItem: { color: MUTED },
        formFieldLabel: { color: INK, fontWeight: 500 },
        formFieldInput: Object.assign({}, input, size.input),
        formFieldInputGroup: size.group,
        formFieldInputShowPasswordButton: size.button,
        formFieldInputShowPasswordIcon: size.icon,
        formFieldHintText: { color: MUTED },
        formFieldErrorText: { color: DANGER },
        formFieldSuccessText: { color: SUCCESS },
        otpCodeFieldInput: input,
        formButtonPrimary: { backgroundColor: INK, color: GROUND, border: "1px solid " + INK, boxShadow: "none", textTransform: "none",
          "&:hover, &:focus": { backgroundColor: MUTED, color: GROUND, borderColor: MUTED } },
        formButtonReset: quiet,
        button: { color: INK },
        badge: { color: INK, backgroundColor: SOFT, border: line, boxShadow: "none" },
        avatarImageActionsUpload: { color: INK, border: line, boxShadow: "none", backgroundColor: GROUND },
        menuButton: { color: INK },
        menuList: { backgroundColor: GROUND, border: line, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" },
        menuItem: Object.assign({}, quiet),
        actionCard: { backgroundColor: GROUND, border: line, boxShadow: "none", color: INK },
        modalContent: { backgroundColor: GROUND, color: INK },
        alert: { backgroundColor: GROUND, color: INK, border: line },
        alertText: { color: INK },
        tableHead: { color: MUTED },
        dividerLine: { backgroundColor: RULE },
        dividerText: { color: MUTED },
        identityPreview: { backgroundColor: GROUND, border: line, color: INK },
        accordionTriggerButton: quiet
      }
    };
  }

  // Log in sits on the Canary panel (styles.css .auth-panel), which is
  // the same in both themes, so every Clerk colour is fixed for yellow
  // rather than read from the site theme. Contrast on #FFEF00: text
  // #0A0A0A 16.6:1, secondary #3D3D3D 9.1:1, errors #A30000 6.9:1; the
  // primary button is #0A0A0A with #FFEF00 text (16.6:1); inputs and the
  // Apple / Google buttons are white with a #0A0A0A border and text.
  var INK = "#0A0A0A", CANARY = "#FFEF00", WHITE = "#FFFFFF";
  function panelAppearance() {
    var font = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim();
    // Clerk's own [data-variant] rule outranks a plain element style: it set
    // the border to 0 and drew an 11% black ring instead, which looked faint
    // and olive on the yellow. Repeating the border under "&[data-variant]"
    // keeps a solid #0A0A0A border on every control.
    var edge = { borderWidth: "1px", borderStyle: "solid", borderColor: INK, boxShadow: "none" };
    var control = { backgroundColor: WHITE, color: INK, border: "1px solid " + INK, boxShadow: "none", "&[data-variant]": edge };
    // Focus: a solid 2px #0A0A0A ring. "&&" doubles the class so it beats
    // Clerk's own [data-variant="default"]:focus-within ring (28% black);
    // the code boxes mark the active box with data-focus-within="true".
    var ring = { borderColor: INK, boxShadow: "0 0 0 2px " + INK };
    var focus = { "&:focus": ring, "&&[data-variant]:focus, &&[data-variant]:focus-within, &&[data-variant][data-focus-within=\"true\"]": ring };
    // 48px: the same height as the sign-up form's own inputs on this panel.
    var size = fieldSizing(INK, "48px");
    return {
      options: { socialButtonsVariant: "blockButton", socialButtonsPlacement: "top" },
      variables: {
        colorPrimary: INK, colorText: INK, colorTextSecondary: "#3D3D3D",
        colorTextOnPrimaryBackground: CANARY, colorPrimaryForeground: CANARY,
        colorBackground: CANARY, colorInputBackground: WHITE, colorInput: WHITE,
        colorInputText: INK, colorInputForeground: INK, colorForeground: INK, colorMutedForeground: "#3D3D3D",
        colorDanger: "#A30000", colorSuccess: "#0A5C2A", colorWarning: INK, colorNeutral: INK, colorShimmer: WHITE,
        fontFamily: font, borderRadius: "6px", fontSize: "1rem"
      },
      elements: {
        // Clerk's cardBox clips its contents (overflow: hidden) and pulls the
        // card 1px past it on the left, right and top (margin -1px) to tuck
        // the card under the box's own 1px border. With that border and the
        // card's padding removed here, the inputs and button touched the
        // card's edges and lost 1px of border, plus their focus ring, to the
        // clip. So: nothing clips, the card has no negative margins, and
        // every control is the card's full width; the panel's own padding
        // (.auth-panel) is the only inset, equal on both sides.
        rootBox: { width: "100%" },
        cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "0", borderRadius: "0", background: "transparent", overflow: "visible" },
        card: { boxShadow: "none", border: "0", padding: "0", margin: "0", width: "100%", background: "transparent", color: INK, overflow: "visible" },
        form: { width: "100%" },
        formField: { width: "100%" },
        header: { display: "none" },
        footerAction: { display: "none" },
        // The "Development mode" strip (development instance only) spans the
        // panel instead of breaking out of it.
        footer: { background: "transparent", marginTop: "1rem", "& > div": { background: "transparent" } },
        main: { gap: "1.25rem" },
        formButtonPrimary: {
          width: "100%", boxSizing: "border-box", margin: "0",
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
        formFieldInput: Object.assign({}, control, focus, { width: "100%", boxSizing: "border-box", margin: "0" }, size.input),
        formFieldInputGroup: size.group,
        formFieldInputShowPasswordButton: size.button,
        formFieldInputShowPasswordIcon: size.icon,
        formFieldAction: { color: INK, textDecoration: "underline" },
        formFieldHintText: { color: "#3D3D3D" },
        formFieldErrorText: { color: "#A30000" },
        formFieldSuccessText: { color: "#0A5C2A" },
        identityPreview: control,
        identityPreviewText: { color: INK },
        identityPreviewEditButton: { color: INK },
        identityPreviewEditButtonIcon: { color: INK },
        otpCodeFieldInput: Object.assign({}, control, focus),
        // While the resend countdown runs, Clerk fades it to 50%: too faint
        // on yellow. Shown solid in the muted ink instead (9.1:1).
        formResendCodeLink: { color: INK, textDecoration: "underline", "&&:disabled, &&[data-disabled]": { opacity: 1, color: "#3D3D3D" } },
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
      var el = host();
      Clerk.mountUserProfile(el, { appearance: appearance(), routing: "hash" });
      // Light / Dark changed (the toggle, or the system setting while the
      // reader hasn't picked one): draw the panel again in the new colours.
      // Its tab is in the address (#/security), so it comes back on the same
      // tab.
      var redraw = function () {
        try { Clerk.unmountUserProfile(el); } catch (e) {}
        el = host();
        Clerk.mountUserProfile(el, { appearance: appearance(), routing: "hash" });
      };
      new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (!document.documentElement.hasAttribute("data-theme")) redraw();
      });
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
