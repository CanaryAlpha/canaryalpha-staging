/*
 * Glossary page: builds the term list from glossary.json, then wires the
 * search box, category chips, A-Z index, expand/collapse and anchor links.
 *
 * Every term gets its own anchor (#whale-wallet). Its alternate names get
 * hidden anchors too (#tvl opens Total Value Locked), unless the name is
 * another term's slug (a real term always keeps its anchor) or two terms
 * claim it; then the term whose own name contains it wins, and if that
 * doesn't settle it, the alternate name gets no anchor.
 */
(function () {
  var CATEGORIES = ["tokenomics", "on-chain", "market structure", "security", "governance",
                    "technical", "general finance", "regulatory"];
  var LETTERS = ["#"].concat("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));

  var root = document.querySelector(".glossary");
  if (!root) return;
  var search = root.querySelector(".glossary__search");
  var chipsEl = root.querySelector(".glossary__chips");
  var countEl = root.querySelector(".glossary__count");
  var indexEl = root.querySelector(".glossary__index");
  var listEl = root.querySelector(".glossary__list");
  var emptyEl = root.querySelector(".glossary__empty");

  var terms = [];         // { data, el, letter, haystack }
  var category = null;    // selected category, or null for all

  // The menu bar's Glossary link marks this page.
  var self = document.querySelector('.site-header__links a[href="./"]');
  if (self) self.setAttribute("aria-current", "page");

  function slugify(text) {
    return String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function fold(text) {
    return String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  }
  function letterOf(term) {
    var c = fold(term).replace(/[^a-z0-9]/g, "").charAt(0);
    return /[a-z]/.test(c) ? c.toUpperCase() : "#";
  }
  function letterId(l) { return "letter-" + (l === "#" ? "symbol" : l); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Plus / minus icon, as in the homepage FAQ.
  var ICON = '<svg class="glossary__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false">' +
    '<path d="M5 12h14"/><path class="glossary__icon-v" d="M12 5v14"/></svg>';

  function buildTerm(t) {
    var art = el("article", "glossary__term");
    art.id = t.slug;
    var head = el("div", "glossary__head");
    var h3 = el("h3", "glossary__name");
    var btn = el("button", "glossary__toggle");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", t.slug + "__body");
    btn.appendChild(el("span", "glossary__toggle-text", t.term));
    btn.insertAdjacentHTML("beforeend", ICON);
    h3.appendChild(btn);
    var link = el("a", "glossary__permalink", "#");
    link.href = "#" + t.slug;
    link.setAttribute("aria-label", "Link to " + t.term);
    head.appendChild(h3);
    head.appendChild(link);
    art.appendChild(head);

    var body = el("div", "glossary__body");
    body.id = t.slug + "__body";
    body.hidden = true;
    body.appendChild(el("p", "glossary__def", t.definition));
    if (t.example) {
      var ex = el("p", "glossary__example");
      ex.appendChild(el("span", "glossary__label", "Example"));
      ex.appendChild(document.createTextNode(" " + t.example));
      body.appendChild(ex);
    }
    if (t.also && t.also.length) {
      var also = el("p", "glossary__also");
      also.appendChild(el("span", "glossary__label", "Also called"));
      also.appendChild(document.createTextNode(" " + t.also.join(", ")));
      body.appendChild(also);
    }
    var tags = el("p", "glossary__tags");
    if (t.category) tags.appendChild(el("span", "glossary__tag", t.category));
    if (t.firstUsedIn) tags.appendChild(el("span", "glossary__tag", "First used in " + t.firstUsedIn));
    if (tags.childNodes.length) body.appendChild(tags);
    art.appendChild(body);

    btn.addEventListener("click", function () { setOpen(art, !isOpen(art)); });
    link.addEventListener("click", function () { setOpen(art, true); });
    return art;
  }

  function isOpen(art) { return art.querySelector(".glossary__toggle").getAttribute("aria-expanded") === "true"; }
  function setOpen(art, open) {
    art.querySelector(".glossary__toggle").setAttribute("aria-expanded", String(open));
    art.querySelector(".glossary__body").hidden = !open;
  }

  // Hidden anchors for alternate names (rules in the header comment).
  function addAliasAnchors() {
    var ids = {};
    terms.forEach(function (t) { ids[t.data.slug] = true; });
    var claims = {};
    terms.forEach(function (t) {
      (t.data.also || []).forEach(function (name) {
        var s = slugify(name);
        if (!s || ids[s]) return;
        var c = claims[s] || (claims[s] = { names: [], owners: [] });
        c.names.push(name);
        if (c.owners.indexOf(t) < 0) c.owners.push(t);
      });
    });
    Object.keys(claims).forEach(function (s) {
      var c = claims[s], owner = c.owners[0];
      if (c.owners.length > 1) {
        var wins = c.owners.filter(function (t) {
          return c.names.some(function (n) { return fold(t.data.term).indexOf(fold(n)) >= 0; });
        });
        owner = wins.length === 1 ? wins[0] : null;
      }
      if (!owner || document.getElementById(s)) return;
      var a = el("span", "glossary__alias");
      a.id = s;
      owner.el.insertBefore(a, owner.el.firstChild);
    });
  }

  function render(data) {
    var seen = {};
    terms = (data.terms || []).filter(function (t) { return t && t.term && t.definition; }).map(function (t) {
      t = Object.assign({}, t);
      t.slug = slugify(t.slug || t.term);
      if (seen[t.slug]) {
        console.warn("glossary.json: duplicate slug \"" + t.slug + "\" (" + t.term + ")");
        t.slug += "-" + (++seen[t.slug]);
      } else seen[t.slug] = 1;
      t.category = t.category ? fold(t.category).trim() : "";
      return {
        data: t,
        letter: letterOf(t.term),
        haystack: fold([t.term].concat(t.also || [], [t.definition]).join("\n"))
      };
    });
    terms.sort(function (a, b) {
      return a.data.term.localeCompare(b.data.term, "en", { sensitivity: "base", numeric: true });
    });

    LETTERS.forEach(function (l) {
      var group = terms.filter(function (t) { return t.letter === l; });
      if (!group.length) return;
      var sec = el("section", "glossary__group");
      sec.setAttribute("aria-labelledby", letterId(l));
      sec.dataset.letter = l;
      var h2 = el("h2", "glossary__letter", l);
      h2.id = letterId(l);
      sec.appendChild(h2);
      group.forEach(function (t) { t.el = buildTerm(t.data); sec.appendChild(t.el); });
      listEl.appendChild(sec);
    });
    addAliasAnchors();

    // Chips: the eight known categories first, then any new ones in the data.
    var cats = CATEGORIES.slice();
    terms.forEach(function (t) { if (t.data.category && cats.indexOf(t.data.category) < 0) cats.push(t.data.category); });
    cats.filter(function (c) { return terms.some(function (t) { return t.data.category === c; }); })
      .forEach(function (c) {
        var chip = el("button", "glossary__chip", c);
        chip.type = "button";
        chip.setAttribute("aria-pressed", "false");
        chip.addEventListener("click", function () {
          category = category === c ? null : c;
          applyFilters();
        });
        chipsEl.appendChild(chip);
      });

    applyFilters();
    openFromHash(false);
  }

  function applyFilters() {
    var words = fold(search.value).trim().split(/\s+/).filter(Boolean);
    var shown = 0, perLetter = {};
    terms.forEach(function (t) {
      var ok = (!category || t.data.category === category) &&
        words.every(function (w) { return t.haystack.indexOf(w) >= 0; });
      t.el.hidden = !ok;
      if (ok) { shown++; perLetter[t.letter] = true; }
    });
    [].forEach.call(listEl.querySelectorAll(".glossary__group"), function (g) {
      g.hidden = !perLetter[g.dataset.letter];
    });
    [].forEach.call(chipsEl.children, function (chip) {
      chip.setAttribute("aria-pressed", String(chip.textContent === category));
    });
    countEl.textContent = shown + " of " + terms.length + " terms";
    emptyEl.hidden = shown > 0;

    // A-Z index: letters with nothing to show are greyed out, not links.
    indexEl.textContent = "";
    var ul = el("ul", "glossary__letters");
    LETTERS.forEach(function (l) {
      var li = el("li");
      if (perLetter[l]) {
        var a = el("a", null, l);
        a.href = "#" + letterId(l);
        if (l === "#") a.setAttribute("aria-label", "Numbers and symbols");
        li.appendChild(a);
      } else {
        var s = el("span", "is-empty", l);
        s.setAttribute("aria-disabled", "true");
        if (l === "#") s.setAttribute("aria-label", "Numbers and symbols, no terms");
        li.appendChild(s);
      }
      ul.appendChild(li);
    });
    indexEl.appendChild(ul);
  }

  // Opens and scrolls to the term named in the URL (#slug or an alternate
  // name), clearing the search and filter first if they hide it. On page
  // load it also scrolls to a letter (#letter-S).
  function openFromHash(smooth) {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    if (!id) return;
    var target = document.getElementById(id);
    if (!target || !listEl.contains(target)) return;
    var art = target.closest(".glossary__term");
    if (art) {
      if (art.hidden) { search.value = ""; category = null; applyFilters(); }
      setOpen(art, true);
      target = art;
    }
    // A letter's own link is handled by the browser; this covers page loads,
    // which arrive before the list exists.
    if (!art && smooth) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: smooth && !reduce ? "smooth" : "instant" });
  }

  search.addEventListener("input", applyFilters);
  root.querySelectorAll(".glossary__all").forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.dataset.expand === "true";
      terms.forEach(function (t) { if (!t.el.hidden) setOpen(t.el, open); });
    });
  });
  window.addEventListener("hashchange", function () { openFromHash(true); });

  fetch("glossary.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { countEl.textContent = "The glossary couldn't be loaded. Please refresh the page."; });
})();
