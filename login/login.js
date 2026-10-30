/*
 * Login form (login/). DEMO ONLY: signs in through components/auth.js
 * against the demo accounts. After logging in it goes back to the page
 * that sent you here (?next=, same site only), or to your plan's dashboard.
 */
(function () {
  var form = document.getElementById("login-form");
  var auth = window.CA_AUTH;
  var rules = window.CA_FORM.rules;

  // Only a path on this site: "/..." but not "//host".
  function nextUrl() {
    var next = new URLSearchParams(location.search).get("next") || "";
    return /^\/(?!\/)/.test(next) ? next : "";
  }
  function go(user) { location.replace(nextUrl() || auth.dashboardUrl(user.tier)); }

  // Already logged in: straight on.
  var current = auth.getCurrentUser();
  if (current) { go(current); return; }

  // The demo accounts, each a button that fills in the form.
  var list = document.querySelector("[data-demo-accounts]");
  var labels = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
  ((window.CA_AUTH_DEMO && window.CA_AUTH_DEMO.accounts) || []).forEach(function (a) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = a.email;
    b.setAttribute("aria-label", "Fill in the " + labels[a.tier] + " demo account, " + a.email);
    b.addEventListener("click", function () {
      form.elements.email.value = a.email;
      form.elements.password.value = a.password;
      form.elements.email.dispatchEvent(new Event("input"));
      form.elements.password.dispatchEvent(new Event("input"));
      form.querySelector('[type="submit"]').focus();
    });
    var tier = document.createElement("span");
    tier.textContent = labels[a.tier];
    li.appendChild(b);
    li.appendChild(tier);
    list.appendChild(li);
  });

  window.CA_FORM.attach(form, {
    email: rules.email,
    password: rules.password
  }, function (form, done) {
    auth.signIn(form.elements.email.value, form.elements.password.value).then(function (r) {
      if (!r.ok) { done(r.error); form.elements.password.focus(); return; }
      go(r.user);
    });
  });
})();
