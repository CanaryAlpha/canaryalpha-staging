/*
 * Dashboard asset list: the control bar (Cards | List, Timeframe, Sort by
 * + direction, Columns, Search) and the two views. Shared by the Free and
 * Pro dashboards:
 *
 *   CA_DASH_ASSETS.mount(container, {
 *     pro: false,               // Pro adds score/verdict, Columns, Search
 *     storageKey: "...",        // where the Cards/List choice is remembered
 *     defaultView: "cards",     // "cards" or "list"
 *     href: function (asset),   // the asset's detail page
 *     only: ["btc", "eth"]      // optional: just these assets
 *   })
 *
 * Only the Cards/List choice is stored (localStorage, per dashboard).
 * Cards and table rows have fixed heights, and the list keeps its height
 * while a search filters it, so nothing below jumps around.
 */
window.CA_DASH_ASSETS = (function () {
  var UI = window.CA_DASH_UI;
  var uid = 0;

  var ICONS = {
    cards: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
    desc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
    asc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
    columns: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  // Sort keys: label, value getter, and whether larger-first is the natural order.
  function sortValue(a, key, tf) {
    switch (key) {
      case "marketCap": return a.marketCap;
      case "price": return a.price;
      case "volume": return a.volume24h;
      case "change": return a.priceChange[tf];
      case "changeUsd": return a.priceChangeUsd[tf];
      case "score": return a.canaryScore;
      case "name": return a.name.toLowerCase();
    }
    return 0;
  }

  // Market cap and volume have no 1h change: 1h falls back to 24h.
  function capTf(tf) { return tf === "h1" ? "h24" : tf; }

  function readView(key, fallback) {
    try { var v = localStorage.getItem(key); return v === "cards" || v === "list" ? v : fallback; } catch (e) { return fallback; }
  }
  function saveView(key, view) { try { localStorage.setItem(key, view); } catch (e) {} }

  function mount(container, opts) {
    var pro = !!opts.pro, id = "dash-assets-" + (++uid);
    var state = {
      view: readView(opts.storageKey, opts.defaultView || "cards"),
      tf: "h24",
      sort: "marketCap",
      dir: "desc",
      query: "",
      hidden: {}
    };

    // List columns. `always` columns can't be hidden.
    var COLUMNS = pro ? [
      { key: "name", label: "Name", sort: "name", always: true },
      { key: "ticker", label: "Ticker" },
      { key: "price", label: "Price", sort: "price", num: true, always: true },
      // Pro shows 1h, 24h and 7d always; "Change" adds the 30d, 90d or 1y
      // column when one of those timeframes is picked.
      { key: "change", label: "Change", sort: "change", num: true },
      { key: "h1", label: "1h", num: true },
      { key: "h24", label: "24h", num: true },
      { key: "d7", label: "7d", num: true },
      { key: "marketCap", label: "Market cap", sort: "marketCap", num: true },
      { key: "volume", label: "24h volume", sort: "volume", num: true },
      { key: "spark", label: "7d chart" },
      { key: "score", label: "Canary score", sort: "score", num: true },
      { key: "verdict", label: "Verdict" },
      { key: "reportDate", label: "Report date" }
    ] : [
      { key: "name", label: "Name", sort: "name", always: true },
      { key: "price", label: "Price", sort: "price", num: true, always: true },
      { key: "change", label: "Change", sort: "change", num: true },
      { key: "marketCap", label: "Market cap", sort: "marketCap", num: true },
      { key: "volume", label: "24h volume", sort: "volume", num: true },
      { key: "spark", label: "7d chart" },
      { key: "report", label: "Report" }
    ];
    var SORTS = [
      { key: "marketCap", label: "Market cap" }, { key: "price", label: "Price" }, { key: "volume", label: "Volume" },
      { key: "change", label: "% change" }, { key: "changeUsd", label: "$ change" }
    ].concat(pro ? [{ key: "score", label: "Canary score" }] : []).concat([{ key: "name", label: "Name" }]);

    /* ---- Control bar ---- */
    var bar = UI.el("div", "dash-controls");
    bar.innerHTML =
      '<div class="dash-seg" role="group" aria-label="View">' +
        '<button type="button" class="dash-seg__btn" data-view="cards" aria-pressed="false">' + ICONS.cards + "Cards</button>" +
        '<button type="button" class="dash-seg__btn" data-view="list" aria-pressed="false">' + ICONS.list + "List</button>" +
      "</div>" +
      (window.CA_LEARN ? '<div class="dash-field dash-field--mode"><span class="dash-field__label">Explanations</span>' + window.CA_LEARN.modeToggle() + "</div>" : "") +
      '<label class="dash-field"><span class="dash-field__label">Timeframe</span><select class="dash-select" data-control="tf">' +
        UI.TIMEFRAMES.map(function (t) { return '<option value="' + t.key + '">' + t.label + "</option>"; }).join("") + "</select></label>" +
      '<div class="dash-field dash-field--sort"><label class="dash-field__label" for="' + id + '-sort">Sort by</label>' +
        '<div class="dash-field__row"><select class="dash-select" id="' + id + '-sort" data-control="sort">' +
          SORTS.map(function (s) { return '<option value="' + s.key + '">' + s.label + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="dash-icon-btn" data-control="dir"></button></div></div>' +
      (pro ? '<div class="dash-field dash-columns"><span class="dash-field__label" id="' + id + '-cols-label">Columns</span>' +
        '<button type="button" class="dash-select dash-columns__btn" aria-expanded="false" aria-controls="' + id + '-cols" aria-labelledby="' + id + '-cols-label ' + id + '-cols-btn" id="' + id + '-cols-btn">' +
          ICONS.columns + '<span class="dash-columns__count"></span></button>' +
        '<div class="dash-columns__panel" id="' + id + '-cols" role="group" aria-label="Columns to show" hidden>' +
          COLUMNS.map(function (c) {
            return '<label class="dash-check"><input type="checkbox" value="' + c.key + '" checked' + (c.always ? " disabled" : "") + "> " +
              c.label + (c.always ? ' <span class="dash-check__note">(always shown)</span>' : "") + "</label>";
          }).join("") +
        "</div></div>" : "") +
      (pro ? '<label class="dash-field dash-search"><span class="dash-field__label">Search</span>' +
        '<span class="dash-search__box">' + ICONS.search + '<input type="search" class="dash-input" placeholder="Name or ticker" autocomplete="off" data-control="search"></span></label>' : "") +
      '<p class="dash-controls__note" aria-live="polite"></p>';
    container.insertAdjacentHTML("beforeend", UI.summary("assets"));
    container.appendChild(bar);

    var region = UI.el("div", "dash-assets");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-busy", "false");
    container.appendChild(region);

    var assets = [];
    var tfSelect = bar.querySelector('[data-control="tf"]');
    var sortSelect = bar.querySelector('[data-control="sort"]');
    var dirBtn = bar.querySelector('[data-control="dir"]');
    var note = bar.querySelector(".dash-controls__note");
    var colsBtn = bar.querySelector(".dash-columns__btn");
    var colsPanel = bar.querySelector(".dash-columns__panel");
    var search = bar.querySelector('[data-control="search"]');

    function syncControls() {
      Array.prototype.forEach.call(bar.querySelectorAll("[data-view]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === state.view));
      });
      tfSelect.value = state.tf;
      sortSelect.value = state.sort;
      dirBtn.innerHTML = ICONS[state.dir];
      dirBtn.setAttribute("aria-label", state.dir === "desc" ? "Sorted high to low; switch to low to high" : "Sorted low to high; switch to high to low");
      dirBtn.title = state.dir === "desc" ? "High to low" : "Low to high";
      note.textContent = state.tf === "h1" ? "1h applies to price only; market cap and volume show 24h." : "";
      if (colsBtn) {
        bar.querySelector(".dash-columns").classList.toggle("is-inactive", state.view !== "list");
        colsBtn.disabled = state.view !== "list";
        var shown = COLUMNS.filter(function (c) { return !state.hidden[c.key]; }).length;
        bar.querySelector(".dash-columns__count").textContent = shown + " of " + COLUMNS.length;
      }
    }

    function sorted() {
      var q = state.query.trim().toLowerCase();
      var list = assets.filter(function (a) {
        return !q || a.name.toLowerCase().indexOf(q) !== -1 || a.ticker.toLowerCase().indexOf(q) !== -1;
      });
      var sign = state.dir === "desc" ? -1 : 1;
      return list.sort(function (a, b) {
        var x = sortValue(a, state.sort, state.tf), y = sortValue(b, state.sort, state.tf);
        return (x < y ? -1 : x > y ? 1 : 0) * sign;
      });
    }

    /* ---- Cards ---- */
    function card(a) {
      var tf = state.tf, ctf = capTf(tf);
      var href = opts.href(a);
      return '<article class="dash-card' + (pro ? " dash-card--pro" : "") + '">' +
        '<header class="dash-card__head">' + UI.logo(a) +
          '<h3 class="dash-card__name"><a class="dash-card__link" href="' + href + '">' + UI.esc(a.name) + "</a></h3>" +
          '<span class="dash-card__ticker">' + UI.esc(a.ticker) + "</span></header>" +
        '<p class="dash-card__price">' + UI.price(a.price) + "</p>" +
        '<p class="dash-card__change"><span class="dash-label">' + UI.tfLabel(tf) + "</span>" + UI.changeUsd(a.priceChangeUsd[tf], a.priceChange[tf], "price", { big: true }) + "</p>" +
        '<div class="dash-card__spark"><span class="dash-label">7d</span>' + UI.sparkline(a.sparkline7d, 160, 40) + "</div>" +
        '<dl class="dash-card__stats">' +
          "<div><dt>Market cap" + UI.explain("market-cap") + "</dt><dd>" + UI.usd(a.marketCap) + " " + UI.changeUsd(a.marketCapChangeUsd[ctf], a.marketCapChange[ctf], "compact", { stack: true }) + "</dd></div>" +
          "<div><dt>24h volume" + UI.explain("volume") + "</dt><dd>" + UI.usd(a.volume24h) + " " + UI.changeUsd(a.volumeChangeUsd[ctf], a.volumeChange[ctf], "compact", { stack: true }) + "</dd></div>" +
          (pro ? "<div><dt>Canary score" + UI.explain("canary-score") + "</dt><dd>" + a.canaryScore + ' <span class="dash-muted">/ 80</span></dd></div>' +
            "<div><dt>Verdict" + UI.explain("verdict") + "</dt><dd>" + verdictTag(a.verdict) + "</dd></div>" : "") +
        "</dl>" +
        UI.cta("#", "Read report", "dash-card__report") +
        "</article>";
    }

    /* ---- List ---- */
    function cell(c, a) {
      var tf = state.tf;
      switch (c.key) {
        case "name": return '<a class="dash-row__link" href="' + opts.href(a) + '">' + UI.logo(a, "sm") + '<span class="dash-row__name">' + UI.esc(a.name) +
          "</span>" + (pro ? "" : ' <span class="dash-muted">' + UI.esc(a.ticker) + "</span>") + "</a>";
        case "ticker": return UI.esc(a.ticker);
        case "price": return UI.price(a.price);
        case "change": return UI.changeUsd(a.priceChangeUsd[tf], a.priceChange[tf], "price", { stack: true });
        case "h1": case "h24": case "d7": return UI.changeUsd(a.priceChangeUsd[c.key], a.priceChange[c.key], "price", { stack: true });
        case "marketCap": return UI.usd(a.marketCap);
        case "volume": return UI.usd(a.volume24h);
        case "spark": return UI.sparkline(a.sparkline7d, 96, 28);
        case "score": return a.canaryScore + ' <span class="dash-muted">/ 80</span>';
        case "verdict": return verdictTag(a.verdict);
        case "reportDate": return UI.date(a.reportDate);
        case "report": return UI.cta("#", "Read report");
      }
      return "";
    }
    // Column headers with an "Explain this" icon (outside the sort button).
    var EXPLAIN = { change: "price-change", marketCap: "market-cap", volume: "volume", score: "canary-score", verdict: "verdict" };
    function header(c) {
      var label = c.key === "change" ? "Change (" + UI.tfLabel(state.tf) + ")" : c.label;
      var info = EXPLAIN[c.key] ? UI.explain(EXPLAIN[c.key], label) : "";
      if (!c.sort) return '<th scope="col" class="dash-col--' + c.key + (c.num ? " is-num" : "") + hl(c) + '">' + label + info + "</th>";
      var active = state.sort === c.sort;
      return '<th scope="col" class="dash-col--' + c.key + (c.num ? " is-num" : "") + hl(c) + '"' +
        (active ? ' aria-sort="' + (state.dir === "desc" ? "descending" : "ascending") + '"' : "") + ">" +
        '<button type="button" class="dash-sort" data-sort="' + c.sort + '">' + label +
        '<span class="dash-sort__icon" aria-hidden="true">' + (active ? (state.dir === "desc" ? "▼" : "▲") : "↕") + "</span></button>" + info + "</th>";
    }
    function table(list) {
      var cols = COLUMNS.filter(function (c) {
        if (pro && c.key === "change" && /^(h1|h24|d7)$/.test(state.tf)) return false;
        return !state.hidden[c.key];
      });
      return '<div class="dash-table-wrap"><table class="dash-table' + (pro ? " dash-table--pro" : "") + '">' +
        '<caption class="dash-sr">Assets, sorted by ' + sortLabel() + ", " + (state.dir === "desc" ? "high to low" : "low to high") + "</caption>" +
        "<thead><tr>" + cols.map(header).join("") + "</tr></thead><tbody>" +
        list.map(function (a) {
          return '<tr class="dash-row" data-href="' + opts.href(a) + '">' + cols.map(function (c) {
            return (c.key === "name" ? '<th scope="row"' : "<td") + ' class="dash-col--' + c.key + (c.num ? " is-num" : "") + hl(c) + '" data-label="' +
              (c.key === "change" ? "Change (" + UI.tfLabel(state.tf) + ")" : c.label) + '">' + cell(c, a) + (c.key === "name" ? "</th>" : "</td>");
          }).join("") + "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }
    // The column for the chosen timeframe is highlighted.
    function hl(c) { return c.key === state.tf || (c.key === "change" && !pro) ? " is-hl" : ""; }
    function sortLabel() {
      for (var i = 0; i < SORTS.length; i++) if (SORTS[i].key === state.sort) return SORTS[i].label.toLowerCase();
      return "";
    }

    var fullHeight = {};
    function render() {
      syncControls();
      var list = sorted();
      region.className = "dash-assets dash-assets--" + state.view + (pro ? " dash-assets--pro" : "");
      region.innerHTML = list.length ? (state.view === "cards" ? '<div class="dash-cards">' + list.map(card).join("") + "</div>" : table(list))
        : '<p class="dash-empty">No assets match “' + UI.esc(state.query) + "”.</p>";
      // Keep the unfiltered height while a search narrows the list, so the
      // page below doesn't jump as you type.
      var key = state.view + ":" + window.innerWidth;
      if (!state.query) { region.style.minHeight = ""; fullHeight[key] = region.getBoundingClientRect().height; }
      else if (fullHeight[key]) region.style.minHeight = fullHeight[key] + "px";
    }

    /* ---- Events ---- */
    bar.addEventListener("click", function (e) {
      var v = e.target.closest("[data-view]");
      if (v) { state.view = v.getAttribute("data-view"); saveView(opts.storageKey, state.view); closeColumns(); render(); return; }
      if (e.target.closest('[data-control="dir"]')) { state.dir = state.dir === "desc" ? "asc" : "desc"; render(); return; }
      if (e.target.closest(".dash-columns__btn")) { toggleColumns(colsPanel.hidden); }
    });
    tfSelect.addEventListener("change", function () { state.tf = tfSelect.value; render(); });
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.dir = state.sort === "name" ? "asc" : "desc";
      render();
    });
    if (search) search.addEventListener("input", function () { state.query = search.value; render(); });
    if (colsPanel) colsPanel.addEventListener("change", function (e) {
      if (e.target.type !== "checkbox") return;
      state.hidden[e.target.value] = !e.target.checked;
      render();
    });

    // Columns drop-down: closes on outside click or Escape.
    function toggleColumns(open) {
      if (!colsPanel) return;
      colsPanel.hidden = !open;
      colsBtn.setAttribute("aria-expanded", String(open));
      if (open) { var first = colsPanel.querySelector("input:not([disabled])"); if (first) first.focus(); }
    }
    function closeColumns() { if (colsPanel && !colsPanel.hidden) toggleColumns(false); }
    document.addEventListener("click", function (e) {
      if (colsPanel && !colsPanel.hidden && !e.target.closest(".dash-columns")) toggleColumns(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && colsPanel && !colsPanel.hidden) { toggleColumns(false); colsBtn.focus(); }
    });

    // Column headers sort too, and keep the Sort by drop-down in step.
    region.addEventListener("click", function (e) {
      var s = e.target.closest("[data-sort]");
      if (s) {
        var key = s.getAttribute("data-sort");
        if (state.sort === key) state.dir = state.dir === "desc" ? "asc" : "desc";
        else { state.sort = key; state.dir = key === "name" ? "asc" : "desc"; }
        render();
        var again = region.querySelector('[data-sort="' + key + '"]');
        if (again) again.focus();
        return;
      }
      // A click anywhere on a row (not on a link or button) opens the asset.
      var row = e.target.closest(".dash-row");
      if (row && !e.target.closest("a, button")) location.href = row.getAttribute("data-href");
    });
    window.addEventListener("resize", function () { if (!state.query) region.style.minHeight = ""; });

    return window.CA_DASH_API.getAssets().then(function (list) {
      assets = opts.only ? list.filter(function (a) { return opts.only.indexOf(a.id) !== -1; }) : list;
      render();
    });
  }

  function verdictTag(v) {
    return '<span class="dash-verdict dash-verdict--' + v.toLowerCase().replace(/[^a-z]+/g, "-") + '" title="' + UI.esc(v) + '">' + UI.esc(v) + "</span>";
  }

  return { mount: mount, verdictTag: verdictTag };
})();
