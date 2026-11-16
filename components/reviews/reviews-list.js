/*
 * Published member reviews (GET /api/reviews/), and the pieces the review
 * form and the owner's queue share: stars and a review card.
 *
 *   [data-reviews-home]  the homepage's "What members say" section. It
 *                        stays hidden until there are 5 approved reviews,
 *                        then shows the average, the count and the newest 6.
 *   [data-reviews-page]  /reviews/: every approved review; the average and
 *                        count appear from 5 reviews.
 *
 * Text goes in with textContent, never as HTML. No account ID or email is
 * ever in the data. No star markup for search engines (no aggregateRating):
 * reviews a business hosts about itself aren't eligible for review stars.
 */
window.CA_REVIEWS = (function () {
  var NS = "http://www.w3.org/2000/svg";
  var STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function starSvg() {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", STAR);
    p.setAttribute("fill", "currentColor");
    s.appendChild(p);
    return s;
  }
  // Five stars, the first `n` filled (n may be a decimal: rounded to the
  // nearest whole star), with a text label for screen readers.
  function stars(n, label) {
    var wrap = el("span", "rv-stars");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", label || (n + " out of 5 stars"));
    var full = Math.round(n);
    for (var i = 1; i <= 5; i++) {
      var s = starSvg();
      if (i > full) s.setAttribute("class", "rv-star--off");
      wrap.appendChild(s);
    }
    return wrap;
  }
  function monthYear(ym) {
    var m = /^(\d{4})-(\d{2})/.exec(ym || "");
    return m ? MONTHS[+m[2] - 1] + " " + m[1] : "";
  }
  // One review: stars, text, name, tier badge, month and year.
  function card(r, tag) {
    var c = el(tag || "article", "rv-card");
    c.appendChild(stars(r.rating));
    c.appendChild(el("p", "rv-card__text", r.text));
    var meta = el("p", "rv-card__meta");
    meta.appendChild(el("span", "rv-card__name", r.name));
    meta.appendChild(el("span", "rv-badge", r.tierLabel));
    var when = monthYear(r.month || (r.updatedAt || "").slice(0, 7));
    if (when) {
      var t = el("time", "", when);
      t.setAttribute("datetime", (r.month || (r.updatedAt || "").slice(0, 7)));
      meta.appendChild(t);
    }
    c.appendChild(meta);
    return c;
  }
  function grid(list) {
    var ul = el("ul", "rv-grid");
    list.forEach(function (r) {
      var li = el("li");
      li.appendChild(card(r));
      ul.appendChild(li);
    });
    return ul;
  }
  function summary(data) {
    var p = el("p", "rv-summary");
    p.appendChild(stars(data.average, "Average rating " + data.average + " out of 5"));
    p.appendChild(el("span", "rv-summary__avg", data.average.toFixed(1) + " out of 5"));
    p.appendChild(el("span", "rv-summary__count", "from " + data.count + " member reviews"));
    return p;
  }

  // The API's address from this script's own location, so it works at
  // any depth and on staging's sub-path.
  var src = document.currentScript && document.currentScript.src;
  var ROOT = src ? new URL("../../", src).href : "/";
  function load() {
    return fetch(new URL("api/reviews/", ROOT).href, { credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("reviews " + res.status);
      return res.json();
    });
  }

  function home(section) {
    load().then(function (data) {
      if (!data || !data.showOnHome || !data.reviews || data.reviews.length < 5) return;
      var slot = section.querySelector("[data-reviews-summary]");
      if (slot) slot.appendChild(summary(data));
      section.querySelector("[data-reviews-list]").appendChild(grid(data.reviews.slice(0, 6)));
      section.hidden = false;
    }).catch(function () { /* stays hidden */ });
  }

  function page(root) {
    var body = root.querySelector("[data-reviews-list]");
    load().then(function (data) {
      body.textContent = "";
      if (data.count && data.average != null) root.querySelector("[data-reviews-summary]").appendChild(summary(data));
      if (!data.reviews || !data.reviews.length) {
        body.appendChild(el("p", "rv-page__empty", "No member reviews have been published yet."));
        return;
      }
      body.appendChild(grid(data.reviews));
    }).catch(function () {
      body.textContent = "";
      body.appendChild(el("p", "rv-page__empty", "Reviews can't be shown right now. Please try again later."));
    });
  }

  function init() {
    var h = document.querySelector("[data-reviews-home]");
    if (h) home(h);
    var p = document.querySelector("[data-reviews-page]");
    if (p) page(p);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { el: el, stars: stars, starSvg: starSvg, card: card, monthYear: monthYear };
})();
