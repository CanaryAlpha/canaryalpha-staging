/*
 * Site footer component. Fills any <footer data-site-footer> with the brand,
 * the link columns and the copyright line, all from window.CA_SITE_LINKS
 * (site-links.js). Load it right after the footer, after site-header.js
 * (which provides the logo):
 *
 *   <footer class="site-footer" data-site-footer data-root="../">
 *     <p class="site-footer__disclaimer">...</p>
 *   </footer>
 *   <script src="../../components/site-footer.js"></script>
 *
 * data-root is the way back to the site root ("" on the home page, "../" one
 * folder down); it goes in front of every href. The page's own content (the
 * disclaimer paragraph) stays, below the columns. Columns with no links are
 * left out.
 */
(function () {
  var site = window.CA_SITE_LINKS;
  if (!site || !site.footer) return;

  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var footers = document.querySelectorAll("footer[data-site-footer]");
  Array.prototype.forEach.call(footers, function (footer, n) {
    var root = footer.getAttribute("data-root") || "";
    var data = site.footer;

    var columns = data.columns.filter(function (col) { return col.links && col.links.length; })
      .map(function (col, i) {
        var id = "site-footer-" + n + "-" + i;
        return '<div class="site-footer__col">' +
          '<h2 class="site-footer__heading" id="' + id + '">' + esc(col.title) + "</h2>" +
          '<ul class="site-footer__list" aria-labelledby="' + id + '">' +
            col.links.map(function (link) {
              return '<li><a href="' + esc(root + link.href) + '">' + esc(link.label) + "</a></li>";
            }).join("") +
          "</ul>" +
          (col.note ? '<p class="site-footer__note">' + esc(col.note) + "</p>" : "") +
        "</div>";
      }).join("");

    // The logo comes from site-header.js; without it the brand is plain text.
    var logo = window.CA_SITE_LOGO
      ? window.CA_SITE_LOGO.replace(/site-header__logo/g, "site-footer__logo")
      : "Canary Alpha Research";

    var top = document.createElement("div");
    top.className = "site-footer__top";
    top.innerHTML =
      '<div class="site-footer__brand">' +
        '<a class="site-footer__home" href="' + esc(root || "./") + '" aria-label="Canary Alpha Research home">' + logo + "</a>" +
        '<p class="site-footer__tagline">' + esc(data.tagline) + "</p>" +
      "</div>" +
      (columns ? '<nav class="site-footer__nav" aria-label="Footer">' + columns + "</nav>" : "");

    var copy = document.createElement("p");
    copy.className = "site-footer__copy";
    copy.textContent = data.copyright;

    footer.insertBefore(top, footer.firstChild);
    footer.appendChild(copy);
  });
})();
