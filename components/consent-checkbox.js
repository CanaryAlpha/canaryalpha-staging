/*
 * Signup consent checkbox. Put an empty
 *   <div data-consent-checkbox data-legal-base="../"></div>
 * inside the signup <form> and load this script after it (with
 * consent-checkbox.css). data-legal-base is the path to the folder holding
 * terms/, privacy/ and disclaimer/. It renders a required, unchecked
 * checkbox: "I am 18 or older and agree to the Terms of Service, Privacy
 * Policy, and Disclaimer, and I understand this is not investment advice."
 * All three links open in a new tab.
 *
 * - The form can't submit until it's ticked (native `required`, plus a
 *   check on submit in case the form uses novalidate).
 * - Ticking it fills a hidden field, terms_agreed_at, with the date
 *   and time in ISO 8601 UTC (e.g. 2026-10-20T14:03:00.000Z); unticking
 *   clears it. The signup backend must save this field with the new account
 *   (and should set its own server time too, since a browser clock can be
 *   wrong).
 *
 * LEGAL: the wording must be reviewed by an attorney before paid launch.
 */
(function () {
  var uid = 0;
  var slots = document.querySelectorAll("[data-consent-checkbox]");
  Array.prototype.forEach.call(slots, function (slot) {
    var id = "consent-disclaimer-" + (++uid);
    var base = slot.getAttribute("data-legal-base") || "/";
    function link(path, text) {
      return '<a href="' + base + path + '" target="_blank" rel="noopener">' + text + "</a>";
    }
    slot.classList.add("consent");
    slot.innerHTML =
      '<input type="checkbox" class="consent__box" id="' + id + '" name="terms_agreed" ' +
        'value="yes" required aria-describedby="' + id + '-error">' +
      '<label class="consent__label" for="' + id + '">I am 18 or older and agree to the ' +
        link("terms/", "Terms of Service") + ", " + link("privacy/", "Privacy Policy") + ", and " +
        link("disclaimer/", "Disclaimer") + ", and I understand this is not investment advice.</label>" +
      '<input type="hidden" name="terms_agreed_at" value="">' +
      '<p class="consent__error" id="' + id + '-error" hidden>Please tick the box to continue.</p>';

    var box = slot.querySelector(".consent__box");
    var stamp = slot.querySelector('input[name="terms_agreed_at"]');
    var error = slot.querySelector(".consent__error");

    box.addEventListener("change", function () {
      stamp.value = box.checked ? new Date().toISOString() : "";
      if (box.checked) error.hidden = true;
    });
    box.addEventListener("invalid", function () { error.hidden = false; });

    var form = slot.closest("form");
    if (form) form.addEventListener("submit", function (e) {
      if (box.checked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      error.hidden = false;
      box.focus();
    }, true);
  });
})();
