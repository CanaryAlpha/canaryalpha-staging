/*
 * Published member reviews (GET /api/reviews/), and the pieces the review
 * form and the admin page share: stars, a review card and its reply.
 *
 *   [data-reviews-home]  the homepage's "What members say" section. It
 *                        stays hidden until there are 5 approved reviews,
 *                        then shows the average, the count and the newest 6.
 *   [data-reviews-page]  /reviews/: the average, the count and the 5-to-1
 *                        star breakdown at the top ("No reviews yet" with
 *                        none), then every approved review.
 *
 * The figures come from the server, worked out from approved reviews only,
 * and the list isn't cached, so they change on the next page load after
 * an admin approves, hides or deletes a review.
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
    if (r.reply && r.reply.text) c.appendChild(replyBlock(r.reply));
    return c;
  }
  // "Response from Canary Alpha Research", under the review it answers.
  function replyBlock(rep) {
    var b = el("div", "rv-reply");
    var h = el("p", "rv-reply__head");
    h.appendChild(el("span", "rv-reply__from", "Response from Canary Alpha Research"));
    var d = fullDate(rep.date || rep.updatedAt);
    if (d) {
      var t = el("time", "", d);
      t.setAttribute("datetime", String(rep.date || rep.updatedAt).slice(0, 10));
      h.appendChild(t);
    }
    b.appendChild(h);
    b.appendChild(el("p", "rv-reply__text", rep.text));
    return b;
  }
  function fullDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? +m[3] + " " + MONTHS[+m[2] - 1] + " " + m[1] : "";
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
  // Stars filled to the exact average (4.6 fills four and three fifths),
  // a filled row clipped over an empty one.
  function partStars(avg, label) {
    var wrap = el("span", "rv-stars rv-stars--part");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", label);
    var off = el("span", "rv-stars__row rv-stars__row--off"), on = el("span", "rv-stars__row rv-stars__row--on");
    for (var i = 0; i < 5; i++) { off.appendChild(starSvg()); on.appendChild(starSvg()); }
    on.style.width = Math.max(0, Math.min(100, (avg / 5) * 100)) + "%";
    wrap.appendChild(off);
    wrap.appendChild(on);
    return wrap;
  }
  function basedOn(n) { return "Based on " + n + (n === 1 ? " review" : " reviews"); }
  // The homepage's line: stars, "4.6 out of 5", "Based on 23 reviews".
  function summary(data) {
    var p = el("p", "rv-summary");
    p.appendChild(partStars(data.average, "Average rating " + data.average.toFixed(1) + " out of 5"));
    p.appendChild(el("span", "rv-summary__avg", data.average.toFixed(1) + " out of 5"));
    p.appendChild(el("span", "rv-summary__count", basedOn(data.count)));
    return p;
  }
  // The top of /reviews/: large stars, the average, the count and a bar for
  // each star rating, 5 to 1.
  function overview(data) {
    var box = el("section", "rv-overview");
    box.setAttribute("aria-label", "Average rating");
    if (!data.count) {
      box.appendChild(el("p", "rv-overview__none", "No reviews yet"));
      return box;
    }
    var left = el("div", "rv-overview__score");
    left.appendChild(el("p", "rv-overview__avg", data.average.toFixed(1)));
    left.appendChild(partStars(data.average, "Average rating " + data.average.toFixed(1) + " out of 5"));
    left.appendChild(el("p", "rv-overview__out", data.average.toFixed(1) + " out of 5"));
    left.appendChild(el("p", "rv-overview__count", basedOn(data.count)));
    box.appendChild(left);
    var bars = el("ul", "rv-bars");
    bars.setAttribute("aria-label", "Reviews by star rating");
    for (var s = 5; s >= 1; s--) {
      var n = (data.breakdown && data.breakdown[s]) || 0;
      var li = el("li", "rv-bars__row");
      li.appendChild(el("span", "rv-bars__label", s + "\u2605"));
      var track = el("span", "rv-bars__track");
      track.setAttribute("aria-hidden", "true");
      var fill = el("span", "rv-bars__fill");
      fill.style.width = (data.count ? Math.round((n / data.count) * 1000) / 10 : 0) + "%";
      track.appendChild(fill);
      li.appendChild(track);
      li.appendChild(el("span", "rv-bars__n", String(n)));
      li.appendChild(el("span", "rv-sr", s + (s === 1 ? " star: " : " stars: ") + n + (n === 1 ? " review" : " reviews")));
      bars.appendChild(li);
    }
    box.appendChild(bars);
    return box;
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
    var top = root.querySelector("[data-reviews-summary]");
    load().then(function (data) {
      body.textContent = "";
      top.textContent = "";
      top.appendChild(overview(data));
      if (!data.reviews || !data.reviews.length) {
        // "No reviews yet" is already shown at the top.
        return;
      }
      body.appendChild(grid(data.reviews));
    }).catch(function () {
      body.textContent = "";
      top.textContent = "";
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

  return { el: el, stars: stars, starSvg: starSvg, card: card, monthYear: monthYear, fullDate: fullDate,
    replyBlock: replyBlock, overview: overview };
})();
