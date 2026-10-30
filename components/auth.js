/*
 * DEMO ONLY: replace with a real auth provider (e.g. Supabase Auth or
 * Clerk) and server-side subscription checks before launch. This is not
 * secure.
 *
 * Everything here runs in the browser: anyone can edit the stored session
 * and give themselves any tier. It exists so the demo's login, paywalls
 * and menu can be tried end to end. Every page asks THIS module who is
 * logged in and what they may see, so swapping in a real provider means
 * changing this file (and auth-gate.js's redirect), not the pages.
 *
 * Load after components/auth.config.js (the demo accounts), in <head>.
 *
 *   CA_AUTH.signIn(email, password)       -> Promise {ok, user} | {ok:false, error}
 *   CA_AUTH.signUp(name, email, password) -> Promise {ok, user} | {ok:false, error}
 *                                            (always a demo free-tier session)
 *   CA_AUTH.signOut()
 *   CA_AUTH.getCurrentUser()  -> { name, email, tier } | null
 *   CA_AUTH.getUserTier()     -> "free" | "pro" | "enterprise" | null (logged out)
 *   CA_AUTH.hasTier(tier)     -> true when the user's tier is that tier or higher
 *   CA_AUTH.dashboardUrl(tier), CA_AUTH.urls { home, login, signup, pricing, contact }
 *
 * The session (name, email, tier; never a password) is kept in
 * localStorage "ca-demo-session".
 */
window.CA_AUTH = (function () {
  var KEY = "ca-demo-session";
  var TIERS = ["free", "pro", "enterprise"];
  var src = document.currentScript && document.currentScript.src;
  var ROOT = src ? new URL("../", src).href : "/";
  var DASHBOARDS = { free: "dashboard/", pro: "dashboard/pro/", enterprise: "dashboard/enterprise/" };
  var accounts = (window.CA_AUTH_DEMO && window.CA_AUTH_DEMO.accounts) || [];
  // Production mode (components/site.config.js): no accounts exist yet, so
  // nobody is ever logged in and the demo accounts don't work.
  var OFF = !!(window.CA_SITE && window.CA_SITE.productionMode);
  var CLOSED = { ok: false, error: "Accounts open soon." };

  function read() {
    if (OFF) return null;
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      return s && s.email && TIERS.indexOf(s.tier) !== -1 ? { name: String(s.name || ""), email: String(s.email), tier: s.tier } : null;
    } catch (e) { return null; }
  }
  function write(user) {
    try {
      if (user) localStorage.setItem(KEY, JSON.stringify({ name: user.name, email: user.email, tier: user.tier }));
      else localStorage.removeItem(KEY);
      return true;
    } catch (e) { return false; }
  }
  function norm(email) { return String(email || "").trim().toLowerCase(); }
  function result(user) {
    if (!write(user)) return { ok: false, error: "This browser is blocking storage, so the demo can't keep you logged in." };
    return { ok: true, user: read() };
  }

  function signIn(email, password) {
    if (OFF) return Promise.resolve(CLOSED);
    var e = norm(email);
    var match = accounts.filter(function (a) { return a.email === e && a.password === password; })[0];
    return Promise.resolve(match
      ? result({ name: match.name, email: match.email, tier: match.tier })
      : { ok: false, error: "That email and password don't match. Check them and try again, or use one of the demo accounts below." });
  }

  // The demo can't create real accounts: it starts a free-tier session for
  // the name and email given. The password is checked, never kept.
  function signUp(name, email, password) {
    if (OFF) return Promise.resolve(CLOSED);
    var e = norm(email);
    if (accounts.some(function (a) { return a.email === e; })) {
      return Promise.resolve({ ok: false, error: "That email belongs to a demo account. Log in with it instead." });
    }
    if (!password) return Promise.resolve({ ok: false, error: "Please choose a password." });
    return Promise.resolve(result({ name: String(name || "").trim(), email: e, tier: "free" }));
  }

  function signOut() { write(null); }
  function getCurrentUser() { return read(); }
  function getUserTier() { var u = read(); return u ? u.tier : null; }
  function hasTier(tier) {
    var t = getUserTier();
    return !!t && TIERS.indexOf(t) >= TIERS.indexOf(tier || "free");
  }

  return {
    TIERS: TIERS,
    signIn: signIn, signUp: signUp, signOut: signOut,
    getCurrentUser: getCurrentUser, getUserTier: getUserTier, hasTier: hasTier,
    dashboardUrl: function (tier) { return ROOT + (DASHBOARDS[tier] || DASHBOARDS.free); },
    urls: {
      home: ROOT, login: ROOT + "login/", signup: ROOT + "signup/",
      pricing: ROOT + "#pricing", contact: ROOT + "contact/"
    }
  };
})();
