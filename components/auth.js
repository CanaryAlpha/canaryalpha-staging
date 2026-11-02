/*
 * Accounts (Clerk), as the pages see them. Every page asks THIS module who
 * is logged in; nothing else talks to Clerk or reads its cookies.
 *
 * What the browser knows is for display only (the menu, the greeting). What
 * a member may see is decided on the server: middleware.js guards the
 * members' pages and every api/ function checks the session and the plan
 * itself. Editing anything here can change what the menu says, never what
 * the server sends.
 *
 * Load after components/site.config.js, in <head>.
 *
 *   CA_AUTH.getCurrentUser()  -> { name, email, tier } | null   (sync: last
 *                                known, from this tab's sessionStorage)
 *   CA_AUTH.getUserTier()     -> "free" | "pro" | "enterprise" | null
 *   CA_AUTH.hasTier(tier)     -> true for that tier or higher
 *   CA_AUTH.ready             -> Promise of the user as the server sees it
 *                                (or null); refreshes the stored copy
 *   CA_AUTH.clerk()           -> Promise of the loaded Clerk object
 *   CA_AUTH.fetch(path, opts) -> fetch() with the session token attached
 *   CA_AUTH.config()          -> Promise { paidPlans, clerkPublishableKey }
 *   CA_AUTH.remember(user)    -> stores what /api/me returned
 *   CA_AUTH.signOut()         -> Promise; ends the session everywhere
 *   CA_AUTH.dashboardUrl(), CA_AUTH.urls { home, login, signup, account,
 *                                pricing, contact, waitlist }
 *
 * The Clerk paths (log in, sign up, after logging out) are set in code:
 * here in Clerk.load, in clerk-forms.js and in middleware.js, so nothing
 * depends on the paths in Clerk's dashboard.
 *
 * Clerk's own script (clerk-js) is loaded only when needed: on the account
 * pages, and for anyone who is logged in. A logged-out visitor's page loads
 * nothing from Clerk. "Logged in" is first judged from Clerk's __client_uat
 * cookie (a timestamp, 0 when logged out), then confirmed by /api/me.
 */
window.CA_AUTH = (function () {
  var TIERS = ["free", "pro", "enterprise"];
  var KEY = "ca-user";
  var src = document.currentScript && document.currentScript.src;
  var ROOT = src ? new URL("../", src).href : "/";
  var API = new URL("/api/", ROOT).href;
  // clerk-js major version; Clerk serves it from the instance's own domain.
  var CLERK_JS = "@clerk/clerk-js@5/dist/clerk.browser.js";

  function hint() {
    var m = document.cookie.match(/(?:^|;\s*)__client_uat=(\d+)/);
    return !!m && m[1] !== "0";
  }
  function cached() {
    if (!hint()) return null;
    try {
      var u = JSON.parse(sessionStorage.getItem(KEY));
      return u && u.email && TIERS.indexOf(u.tier) !== -1 ? u : null;
    } catch (e) { return null; }
  }
  function remember(me) {
    var u = me ? { name: String(me.user.name || ""), email: String(me.user.email || ""), tier: me.tier } : null;
    try {
      if (u) sessionStorage.setItem(KEY, JSON.stringify(u));
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
    return u;
  }

  var configP = null;
  function config() {
    if (!configP) configP = fetch(API + "config/").then(function (r) {
      if (!r.ok) throw new Error("config " + r.status);
      return r.json();
    }).catch(function () { configP = null; return { paidPlans: false, clerkPublishableKey: "" }; });
    return configP;
  }

  // The Frontend API host is inside the publishable key: pk_(test|live)_
  // then base64 of "<host>$".
  function frontendApi(pk) {
    try { return atob(pk.split("_")[2]).replace(/\$$/, ""); } catch (e) { return ""; }
  }

  var clerkP = null;
  function clerk() {
    if (!clerkP) clerkP = config().then(function (cfg) {
      var host = frontendApi(cfg.clerkPublishableKey || "");
      if (!host) throw new Error("Accounts aren't set up on this address.");
      return new Promise(function (resolve, reject) {
        if (window.Clerk) return resolve(window.Clerk);
        var s = document.createElement("script");
        s.src = "https://" + host + "/npm/" + CLERK_JS;
        s.async = true;
        s.crossOrigin = "anonymous";
        s.setAttribute("data-clerk-publishable-key", cfg.clerkPublishableKey);
        s.onload = function () { resolve(window.Clerk); };
        s.onerror = function () { reject(new Error("Couldn't load the login service.")); };
        document.head.appendChild(s);
      });
    }).then(function (Clerk) {
      return Clerk.load({
        signInUrl: ROOT + "login/",
        signUpUrl: ROOT + "signup/",
        afterSignOutUrl: ROOT
      }).then(function () { return Clerk; });
    });
    clerkP.catch(function () { clerkP = null; });
    return clerkP;
  }

  // fetch() to the site's api/, with the current session token.
  function authFetch(path, opts) {
    opts = opts || {};
    return clerk().then(function (Clerk) {
      return Clerk.session ? Clerk.session.getToken() : null;
    }).then(function (token) {
      var headers = new Headers(opts.headers || {});
      if (token) headers.set("Authorization", "Bearer " + token);
      if (opts.body && !headers.has("content-type")) headers.set("content-type", "application/json");
      // vercel.json has trailingSlash: true, so every api/ address ends in
      // "/" (without it, a redirect first).
      var parts = path.replace(/^\/?(api\/)?/, "").split("?");
      var url = API + parts[0].replace(/\/?$/, "/") + (parts[1] ? "?" + parts[1] : "");
      return fetch(url, {
        method: opts.method || "GET", headers: headers, body: opts.body, credentials: "same-origin"
      });
    });
  }

  function me() {
    return authFetch("me").then(function (r) {
      if (r.status === 401) return null;
      if (!r.ok) throw new Error("me " + r.status);
      return r.json();
    });
  }

  // Logged-in visitors: confirm with the server, and keep the copy fresh.
  // Rejects when the server can't be reached (callers decide what to show).
  var ready = hint()
    ? me().then(function (m) { return remember(m); })
    : Promise.resolve(remember(null));
  ready.catch(function () {});

  function signOut() {
    remember(null);
    return clerk().then(function (Clerk) { return Clerk.signOut(); }, function () {});
  }

  function getCurrentUser() { return cached(); }
  function getUserTier() { var u = cached(); return u ? u.tier : null; }
  function hasTier(tier) {
    var t = getUserTier();
    return !!t && TIERS.indexOf(t) >= TIERS.indexOf(tier || "free");
  }

  return {
    TIERS: TIERS,
    getCurrentUser: getCurrentUser, getUserTier: getUserTier, hasTier: hasTier,
    ready: ready, clerk: clerk, fetch: authFetch, config: config, me: me,
    remember: remember, signOut: signOut, loggedInHint: hint,
    dashboardUrl: function () { return ROOT + "dashboard/"; },
    urls: {
      home: ROOT, login: ROOT + "login/", signup: ROOT + "signup/", account: ROOT + "account/",
      pricing: ROOT + "#pricing", contact: ROOT + "contact/", waitlist: ROOT + "waitlist/"
    }
  };
})();
