/*
 * Applies components/site.config.js. Load it in <head>, right after that
 * file and before everything else.
 *
 * In production mode:
 *   - <html data-production> is set, so CSS can hide [data-demo-only] and
 *     show [data-production-only] (styles.css, "Production mode").
 *   - A page marked <html data-page="dev"> (design and test pages) sends the
 *     visitor to the home page; <html data-page="account"> (Log in and the
 *     dashboards) sends them to signup/, which shows "Accounts open soon".
 *
 * CA_SITE.root is the site root, worked out from this file's address, so the
 * same code works at canaryalpha.co/ and on a GitHub Pages project address.
 */
(function () {
  var site = window.CA_SITE = window.CA_SITE || {};
  var src = document.currentScript && document.currentScript.src;
  site.root = src ? new URL("../", src).href : "/";
  if (!site.productionMode) return;

  var html = document.documentElement;
  html.setAttribute("data-production", "");
  var page = html.getAttribute("data-page");
  var to = page === "dev" ? site.root : page === "account" ? site.root + "signup/" : null;
  if (to) location.replace(to);
})();
