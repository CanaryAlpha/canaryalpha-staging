/*
 * Hero option 2, "Report verdict": a minimal report card fills in for a
 * fictional token. Six category scores tick in, then the total out of 80,
 * then the verdict. Categories, scoring and verdict bands come from
 * feature-visuals.config.js (scoring), so results match the scoring visual
 * further down the page. Settings in hero-visuals.config.js ("verdict");
 * run by hero-visuals.js.
 */
(function () {
  // When each part appears, in ms from the start of a run.
  var HEAD = 0, FIRST_ROW = 350, ROW_GAP = 330, BAR = 900, TOTAL = 2600, VERDICT = 3200, IN = 600;

  function build(stage, cfg, u) {
    var S = u.scoring;
    var card = u.el("div", "hv-card");
    card.setAttribute("aria-hidden", "true");
    var head = u.el("div", "hv-card__head");
    head.appendChild(u.el("span", "hv-eyebrow", cfg.caption));
    var token = head.appendChild(u.el("span", "hv-card__token"));
    card.appendChild(head);

    var list = u.el("ol", "hv-card__list");
    var rows = S.categories.map(function (c) {
      var row = u.el("li", "hv-card__row");
      row.appendChild(u.el("span", "hv-card__name", c.name));
      var track = u.el("span", "hv-card__track");
      var fillBar = track.appendChild(u.el("span", "hv-card__fill"));
      row.appendChild(track);
      var value = u.el("span", "hv-card__value");
      var got = value.appendChild(u.el("span", "hv-card__got"));
      value.appendChild(document.createTextNode(" / " + c.weight));
      row.appendChild(value);
      list.appendChild(row);
      return { row: row, fill: fillBar, got: got, value: value, weight: c.weight };
    });
    card.appendChild(list);

    var foot = u.el("div", "hv-card__foot");
    var totalBox = u.el("div", "hv-card__total");
    totalBox.appendChild(u.el("span", "hv-eyebrow", cfg.totalLabel));
    var totalNum = u.el("span", "hv-card__num");
    var num = totalNum.appendChild(u.el("span", "hv-card__got"));
    totalNum.appendChild(u.el("span", "hv-card__max", " / " + u.maxScore));
    totalBox.appendChild(totalNum);
    foot.appendChild(totalBox);
    var verdict = u.el("div", "hv-card__verdict");
    verdict.appendChild(u.el("span", "hv-eyebrow", cfg.verdictLabel));
    // Every verdict sits in the badge, stacked; only the current one shows,
    // so the badge is always as wide as the longest (like the scoring visual).
    var badge = u.el("span", "hv-badge");
    var labels = u.bands.map(function (b) { return badge.appendChild(u.el("span", null, b.label)); });
    verdict.appendChild(badge);
    foot.appendChild(verdict);
    card.appendChild(foot);
    stage.appendChild(card);

    var data = null;

    return {
      duration: VERDICT + IN + 200,

      generate: function (rng, last) {
        var tokens = cfg.tokens.filter(function (t) { return !last || t !== last.token; });
        var result = u.score(rng);
        result.token = u.pick(rng, tokens);
        return result;
      },

      apply: function (d) {
        data = d;
        token.textContent = d.token;
        rows.forEach(function (r, i) { r.got.textContent = d.scores[i]; });
        num.textContent = d.total;
        labels.forEach(function (l, i) { l.classList.toggle("is-shown", i === d.band); });
        badge.setAttribute("data-rank", d.band === 0 ? "best" : d.band === u.bands.length - 1 ? "worst" : "mid");
        return "Illustration: an example report for a fictional token, " + d.token + ", scored " + d.total +
          " out of " + u.maxScore + " across six categories: " +
          S.categories.map(function (c, i) { return c.name + " " + d.scores[i] + " of " + c.weight; }).join(", ") +
          ". " + cfg.verdictLabel + ": " + u.bands[d.band].label + ".";
      },

      // The card's size comes from CSS (font scales with the box).
      layout: function () {},

      frame: function (t) {
        if (!data) return;
        head.style.opacity = u.progress(t, HEAD, IN);
        rows.forEach(function (r, i) {
          var at = FIRST_ROW + i * ROW_GAP;
          var shown = u.easeOut(u.progress(t, at, IN));
          r.row.style.opacity = shown;
          r.fill.style.transform = "scaleX(" + (u.easeOut(u.progress(t, at + 100, BAR)) * data.scores[i] / r.weight).toFixed(4) + ")";
          r.value.style.opacity = u.progress(t, at + BAR * 0.6, 300);
        });
        var total = u.easeOut(u.progress(t, TOTAL, IN));
        totalBox.style.opacity = total;
        totalBox.style.transform = "translateY(" + (0.4 * (1 - total)).toFixed(3) + "em)";
        var v = u.easeOut(u.progress(t, VERDICT, IN));
        verdict.style.opacity = v;
        verdict.style.transform = "translateY(" + (0.4 * (1 - v)).toFixed(3) + "em)";
      }
    };
  }

  (window.CA_HERO_KINDS = window.CA_HERO_KINDS || {}).verdict = { build: build };
})();
