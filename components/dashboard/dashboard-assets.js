/*
 * Dashboard asset list: the control bar (Cards | List, Timeframe, Sort by
 * + direction, Columns, Search) and the two views. Shared by the Free and
 * Pro dashboards:
 *
 *   CA_DASH_ASSETS.mount(container, {
 *     pro: false,               // Pro adds score/verdict, Columns, Search
 *     storageKey: "...",        // where the Cards/List choice is remembered
 *     defaultView: "cards",     // "cards", "carousel" or "list"
 *     href: function (asset),   // the asset's detail page
 *     only: ["btc", "eth"],     // optional: just these assets
 *     redacted: true,           // Free: add a locked row/card for each
 *                               //   researched token the plan hides (the
 *                               //   server sends only how many there are)
 *     customOrder: true         // Pro and Enterprise: the member's own
 *   })                          //   order (below)
 *
 * Bitcoin and Ethereum stay pinned first whatever the sort, except in the
 * member's custom order. A token with no market data shows its score and
 * verdict, and "No market data".
 *
 * Custom order: "Custom order" in the control bar (and in Sort by, kept in
 * step) arranges the list: each card or row gets a drag handle (mouse,
 * touch, pen; arrow keys on the handle) and Move up / Move down buttons,
 * and screen readers hear the new position. It starts from the default
 * order (Bitcoin, Ethereum, then by market cap), any token can move, and
 * every change is saved to the member's account on the server
 * (CA_DASH_API.saveCustomOrder) so it follows them to other devices. Done
 * ends arranging; Reset to default clears the saved order. Another Sort by
 * choice leaves the custom order without deleting it. While arranging, the
 * carousel shows as cards and search is off. Only items of one size move,
 * so nothing shifts while dragging.
 *
 * Stored in this browser (localStorage, per dashboard): the Cards/List
 * choice, and whether the custom order was the last sort used.
 * Cards and table rows have fixed heights, and the list keeps its height
 * while a search filters it, so nothing below jumps around.
 */
window.CA_DASH_ASSETS = (function () {
  var UI = window.CA_DASH_UI;
  var uid = 0;

  var ICONS = {
    cards: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    carousel: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="4" width="10" height="16" rx="1"/><path d="M3 7v10"/><path d="M21 7v10"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
    desc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
    asc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
    columns: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    order: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/></svg>',
    grip: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>'
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
    try { var v = localStorage.getItem(key); return v === "cards" || v === "carousel" || v === "list" ? v : fallback; } catch (e) { return fallback; }
  }
  function saveView(key, view) { try { localStorage.setItem(key, view); } catch (e) {} }
  function readFlag(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function saveFlag(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  function mount(container, opts) {
    var pro = !!opts.pro, id = "dash-assets-" + (++uid);
    var ordering = !!opts.customOrder && !opts.only;
    var state = {
      view: readView(opts.storageKey, opts.defaultView || "cards"),
      tf: "h24",
      sort: "marketCap",
      dir: "desc",
      query: "",
      hidden: {},
      custom: null,     // the member's order (asset ids), or null
      editing: false    // arranging the custom order
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
    ].concat(pro ? [{ key: "score", label: "Canary score" }] : []).concat([{ key: "name", label: "Name" }])
      .concat(ordering ? [{ key: "custom", label: "Custom order" }] : []);

    /* ---- Control bar ---- */
    var bar = UI.el("div", "dash-controls");
    bar.innerHTML =
      '<div class="dash-seg" role="group" aria-label="View">' +
        '<button type="button" class="dash-seg__btn" data-view="cards" aria-pressed="false">' + ICONS.cards + "Cards</button>" +
        '<button type="button" class="dash-seg__btn" data-view="carousel" aria-pressed="false">' + ICONS.carousel + "Carousel</button>" +
        '<button type="button" class="dash-seg__btn" data-view="list" aria-pressed="false">' + ICONS.list + "List</button>" +
      "</div>" +
      (window.CA_LEARN ? '<div class="dash-field dash-field--mode"><span class="dash-field__label">Explanations</span>' + window.CA_LEARN.modeToggle() + "</div>" : "") +
      '<label class="dash-field"><span class="dash-field__label">Timeframe</span><select class="dash-select" data-control="tf">' +
        UI.TIMEFRAMES.map(function (t) { return '<option value="' + t.key + '">' + t.label + "</option>"; }).join("") + "</select></label>" +
      '<div class="dash-field dash-field--sort"><label class="dash-field__label" for="' + id + '-sort">Sort by</label>' +
        '<div class="dash-field__row"><select class="dash-select" id="' + id + '-sort" data-control="sort">' +
          SORTS.map(function (s) { return '<option value="' + s.key + '">' + s.label + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="dash-icon-btn" data-control="dir"></button></div></div>' +
      (ordering ? '<div class="dash-field dash-order"><span class="dash-field__label" id="' + id + '-order-label">Your order</span>' +
        '<div class="dash-field__row">' +
          '<button type="button" class="dash-select dash-order__btn" data-control="custom" aria-pressed="false" aria-describedby="' + id + '-order-label">' + ICONS.order + "Custom order</button>" +
          '<button type="button" class="dash-select dash-order__btn dash-order__done" data-control="done" hidden>Done</button>' +
          '<button type="button" class="dash-select dash-order__btn" data-control="reset" hidden>Reset to default</button>' +
        "</div></div>" : "") +
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
      '<p class="dash-controls__note" aria-live="polite"></p>' +
      (ordering ? '<p class="dash-sr" aria-live="assertive" data-order-announce></p>' : "");
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
    var orderBtn = bar.querySelector('[data-control="custom"]');
    var doneBtn = bar.querySelector('[data-control="done"]');
    var resetBtn = bar.querySelector('[data-control="reset"]');
    var orderSay = bar.querySelector("[data-order-announce]");
    var orderNote = "";

    function syncControls() {
      Array.prototype.forEach.call(bar.querySelectorAll("[data-view]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === state.view));
      });
      tfSelect.value = state.tf;
      sortSelect.value = state.sort;
      dirBtn.innerHTML = ICONS[state.dir];
      dirBtn.setAttribute("aria-label", state.dir === "desc" ? "Sorted high to low; switch to low to high" : "Sorted low to high; switch to high to low");
      dirBtn.title = state.dir === "desc" ? "High to low" : "Low to high";
      note.textContent = orderNote || (state.tf === "h1" ? "1h applies to price only; market cap and volume show 24h." : "");
      var custom = state.sort === "custom";
      dirBtn.disabled = custom;
      if (orderBtn) {
        orderBtn.setAttribute("aria-pressed", String(custom));
        orderBtn.hidden = state.editing;
        doneBtn.hidden = resetBtn.hidden = !state.editing;
        if (search) search.disabled = state.editing;
        bar.classList.toggle("is-ordering", state.editing);
      }
      if (colsBtn) {
        bar.querySelector(".dash-columns").classList.toggle("is-inactive", state.view !== "list");
        colsBtn.disabled = state.view !== "list";
        var shown = COLUMNS.filter(function (c) { return !state.hidden[c.key]; }).length;
        bar.querySelector(".dash-columns__count").textContent = shown + " of " + COLUMNS.length;
      }
    }

    // The default order: Bitcoin and Ethereum, then by market cap.
    function defaultOrder() {
      return assets.slice().sort(function (a, b) { return byPinned(a, b) || bySort(a, b, "marketCap", -1); }).map(function (a) { return a.id; });
    }
    function byPinned(a, b) {
      var pa = PINNED.indexOf(a.id), pb = PINNED.indexOf(b.id);
      return pa !== -1 || pb !== -1 ? (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb) : 0;
    }
    function bySort(a, b, key, sign) {
      if (!a.market !== !b.market) return a.market ? -1 : 1;
      var x = sortValue(a, key, state.tf), y = sortValue(b, key, state.tf);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sign;
    }
    function sorted() {
      var q = state.editing ? "" : state.query.trim().toLowerCase();
      var list = assets.filter(function (a) {
        return !q || a.name.toLowerCase().indexOf(q) !== -1 || a.ticker.toLowerCase().indexOf(q) !== -1;
      });
      if (state.sort === "custom") {
        var order = state.custom || defaultOrder(), at = {};
        order.forEach(function (id, i) { at[id] = i; });
        var dflt = defaultOrder();
        // Tokens covered since the order was saved go last, in the default order.
        return list.sort(function (a, b) {
          var x = a.id in at ? at[a.id] : order.length + dflt.indexOf(a.id), y = b.id in at ? at[b.id] : order.length + dflt.indexOf(b.id);
          return x - y;
        });
      }
      var sign = state.dir === "desc" ? -1 : 1;
      return list.sort(function (a, b) {
        var pa = PINNED.indexOf(a.id), pb = PINNED.indexOf(b.id);
        if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
        if (!a.market !== !b.market) return a.market ? -1 : 1;
        var x = sortValue(a, state.sort, state.tf), y = sortValue(b, state.sort, state.tf);
        if (x == null || y == null) return x == null ? 1 : -1;
        return (x < y ? -1 : x > y ? 1 : 0) * sign;
      });
    }

    /* ---- Cards ---- */
    function card(a) {
      var tf = state.tf, ctf = capTf(tf);
      var href = opts.href(a);
      if (!a.market) return noMarketCard(a, href);
      return '<article class="dash-card' + (pro ? " dash-card--pro" : "") + '" data-id="' + UI.esc(a.id) + '">' + orderBar(a) +
        '<header class="dash-card__head">' + UI.logo(a) +
          '<h3 class="dash-card__name"><a class="dash-card__link" href="' + href + '">' + UI.esc(a.name) + "</a></h3>" +
          '<span class="dash-card__ticker">' + UI.esc(a.ticker) + "</span></header>" +
        '<p class="dash-card__price">' + UI.price(a.price) + "</p>" +
        '<p class="dash-card__change"><span class="dash-label">' + UI.tfLabel(tf) + "</span>" + UI.changeUsd(a.priceChangeUsd[tf], a.priceChange[tf], "price", { big: true }) + "</p>" +
        '<div class="dash-card__spark"><span class="dash-label">7d</span>' + UI.sparkline(a.sparkline7d, 160, 40) + "</div>" +
        '<dl class="dash-card__stats">' +
          "<div><dt>Market cap" + UI.explain("market-cap") + "</dt><dd>" + UI.usd(a.marketCap) + " " + UI.changeUsd(a.marketCapChangeUsd[ctf], a.marketCapChange[ctf], "compact", { stack: true }) + "</dd></div>" +
          "<div><dt>24h volume" + UI.explain("volume") + "</dt><dd>" + UI.usd(a.volume24h) + " " + UI.changeUsd(a.volumeChangeUsd[ctf], a.volumeChange[ctf], "compact", { stack: true }) + "</dd></div>" +
          (pro ? "<div><dt>Canary score" + UI.explain("canary-score") + "</dt><dd>" + score(a) + "</dd></div>" +
            "<div><dt>Verdict" + UI.explain("verdict") + "</dt><dd>" + verdictTag(a.verdict) + "</dd></div>" : "") +
        "</dl>" +
        UI.cta(reportHref(a), "Read report", "dash-card__report") +
        "</article>";
    }
    function noMarketCard(a, href) {
      return '<article class="dash-card' + (pro ? " dash-card--pro" : "") + '" data-id="' + UI.esc(a.id) + '">' + orderBar(a) +
        '<header class="dash-card__head">' + UI.logo(a) +
          '<h3 class="dash-card__name"><a class="dash-card__link" href="' + href + '">' + UI.esc(a.name) + "</a></h3>" +
          '<span class="dash-card__ticker">' + UI.esc(a.ticker) + "</span></header>" +
        '<p class="dash-card__price dash-muted">No market data</p>' +
        '<p class="dash-card__change"><span class="dash-label">Not listed on a tracked market yet</span></p>' +
        '<div class="dash-card__spark"></div>' +
        '<dl class="dash-card__stats">' +
          (pro ? "<div><dt>Canary score</dt><dd>" + score(a) + "</dd></div><div><dt>Verdict</dt><dd>" + verdictTag(a.verdict) + "</dd></div>" : "") +
        "</dl>" + UI.cta(reportHref(a), "Read report", "dash-card__report") + "</article>";
    }
    // A researched token the Free plan doesn't include: no name, no data.
    var LOCK = '<svg class="dash-lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    function lockedCard() {
      return '<article class="dash-card dash-card--locked">' +
        '<header class="dash-card__head"><span class="dash-logo" aria-hidden="true">' + LOCK + "</span>" +
          '<h3 class="dash-card__name">Token hidden</h3><span class="dash-card__ticker">Pro</span></header>' +
        '<p class="dash-card__price dash-muted">Researched token</p>' +
        '<p class="dash-card__change"><span class="dash-label">Included with Pro</span></p>' +
        '<div class="dash-card__spark"></div><dl class="dash-card__stats"></dl></article>';
    }
    function lockedRow(cols) {
      return '<tr class="dash-row dash-row--locked">' + cols.map(function (c, i) {
        var body = c.key === "name" ? '<span class="dash-row__link">' + '<span class="dash-logo dash-logo--sm" aria-hidden="true">' + LOCK + '</span><span class="dash-row__name">Token hidden</span> <span class="dash-muted">Pro</span></span>' : (i === 1 ? '<span class="dash-muted">Included with Pro</span>' : "");
        return (c.key === "name" ? '<th scope="row"' : "<td") + ' class="dash-col--' + c.key + (c.num ? " is-num" : "") + '" data-label="' + c.label + '">' + body + (c.key === "name" ? "</th>" : "</td>");
      }).join("") + "</tr>";
    }
    function locked(n, fn) { var out = ""; for (var i = 0; i < n; i++) out += fn(); return out; }

    /* ---- List ---- */
    function cell(c, a) {
      var tf = state.tf;
      if (!a.market && !/^(name|ticker|score|verdict|reportDate|report)$/.test(c.key)) return c.key === "price" ? '<span class="dash-muted">No market data</span>' : "";
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
        case "score": return score(a);
        case "verdict": return verdictTag(a.verdict);
        case "reportDate": return UI.date(a.reportDate);
        case "report": return UI.cta(reportHref(a), "Read report");
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
      var edit = state.editing;
      return '<div class="dash-table-wrap"><table class="dash-table' + (pro ? " dash-table--pro" : "") + '">' +
        '<caption class="dash-sr">Assets, ' + (state.sort === "custom" ? "in your custom order" : "sorted by " + sortLabel() + ", " + (state.dir === "desc" ? "high to low" : "low to high")) + "</caption>" +
        "<thead><tr>" + (edit ? '<th scope="col" class="dash-col--order"><span class="dash-sr">Order</span></th>' : "") + cols.map(header).join("") + "</tr></thead><tbody>" +
        list.map(function (a) {
          return '<tr class="dash-row" data-id="' + UI.esc(a.id) + '" data-href="' + opts.href(a) + '">' + (edit ? '<td class="dash-col--order">' + orderBar(a) + "</td>" : "") + cols.map(function (c) {
            return (c.key === "name" ? '<th scope="row"' : "<td") + ' class="dash-col--' + c.key + (c.num ? " is-num" : "") + hl(c) + '" data-label="' +
              (c.key === "change" ? "Change (" + UI.tfLabel(state.tf) + ")" : c.label) + '">' + cell(c, a) + (c.key === "name" ? "</th>" : "</td>");
          }).join("") + "</tr>";
        }).join("") + (opts.redacted && !state.query ? locked(redactedCount, function () { return lockedRow(cols); }) : "") +
        "</tbody></table></div>";
    }
    // The column for the chosen timeframe is highlighted.
    function hl(c) { return c.key === state.tf || (c.key === "change" && !pro) ? " is-hl" : ""; }
    function sortLabel() {
      for (var i = 0; i < SORTS.length; i++) if (SORTS[i].key === state.sort) return SORTS[i].label.toLowerCase();
      return "";
    }

    /* ---- Cards: a carousel, one large card at a time ----
       The track scrolls sideways (swipe, trackpad, arrow keys or the
       buttons) and snaps each card to the centre; the cards either side
       turn away and fade, so the row reads as a wheel. No autoplay. */
    function carouselHtml(cards) {
      return '<div class="dash-carousel dash-big" role="region" aria-roledescription="carousel" aria-label="Assets">' +
        '<button type="button" class="dash-carousel__btn dash-carousel__btn--prev" aria-label="Previous asset">‹</button>' +
        '<div class="dash-cards" tabindex="0">' + cards + "</div>" +
        '<button type="button" class="dash-carousel__btn dash-carousel__btn--next" aria-label="Next asset">›</button>' +
        '<p class="dash-carousel__count" aria-live="polite"></p></div>';
    }
    function carousel(root) {
      var track = root.querySelector(".dash-cards");
      var cards = [].slice.call(track.children);
      var count = root.querySelector(".dash-carousel__count");
      var prev = root.querySelector(".dash-carousel__btn--prev"), next = root.querySelector(".dash-carousel__btn--next");
      var current = -1, frame = 0;
      function centreOf(el) { return el.offsetLeft + el.offsetWidth / 2; }
      function update() {
        frame = 0;
        var mid = track.scrollLeft + track.clientWidth / 2, step = cards.length > 1 ? centreOf(cards[1]) - centreOf(cards[0]) : 1;
        var best = 0, bestD = Infinity;
        cards.forEach(function (c, i) {
          var off = (centreOf(c) - mid) / step;
          if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
          off = Math.max(-2, Math.min(2, off));
          c.style.setProperty("--off", off.toFixed(3));
          c.style.setProperty("--abs", Math.abs(off).toFixed(3));
          c.inert = Math.abs(off) > 0.5;
        });
        if (best !== current) {
          current = best;
          count.textContent = (best + 1) + " of " + cards.length;
          prev.disabled = best === 0;
          next.disabled = best === cards.length - 1;
        }
      }
      function go(i) {
        i = Math.max(0, Math.min(cards.length - 1, i));
        track.scrollTo({ left: centreOf(cards[i]) - track.clientWidth / 2, behavior: "smooth" });
      }
      track.addEventListener("scroll", function () { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
      window.addEventListener("resize", function () { if (track.isConnected) update(); });
      prev.addEventListener("click", function () { go(current - 1); });
      next.addEventListener("click", function () { go(current + 1); });
      track.addEventListener("keydown", function (e) {
        if (e.target !== track) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      });
      update();
    }

    /* ---- Custom order: arranging ---- */
    // The handle and Move up / Move down for one card or row (arranging only).
    function orderBar(a) {
      if (!state.editing) return "";
      var name = UI.esc(a.name);
      return '<div class="dash-order__bar">' +
        '<button type="button" class="dash-order__handle" data-order="drag" aria-label="Move ' + name + ': drag, or use the arrow keys">' + ICONS.grip + "</button>" +
        '<span class="dash-order__pos" aria-hidden="true"></span>' +
        '<button type="button" class="dash-order__move" data-order="up" aria-label="Move ' + name + ' up">' + ICONS.up + "</button>" +
        '<button type="button" class="dash-order__move" data-order="down" aria-label="Move ' + name + ' down">' + ICONS.down + "</button>" +
      "</div>";
    }
    function items() { return [].slice.call(region.querySelectorAll("[data-id]")); }
    function nameOf(el) { var id = el.getAttribute("data-id"); for (var i = 0; i < assets.length; i++) if (assets[i].id === id) return assets[i].name; return id; }
    // Position labels and the ends' disabled buttons, after any move.
    function markPositions() {
      var all = items();
      all.forEach(function (el, i) {
        var pos = el.querySelector(".dash-order__pos");
        if (pos) pos.textContent = (i + 1) + " of " + all.length;
        var up = el.querySelector('[data-order="up"]'), down = el.querySelector('[data-order="down"]');
        if (up) up.disabled = i === 0;
        if (down) down.disabled = i === all.length - 1;
      });
    }
    function announceMove(el) {
      var all = items();
      orderSay.textContent = nameOf(el) + " moved to position " + (all.indexOf(el) + 1) + " of " + all.length + ".";
    }
    // The order on screen becomes the member's order, saved shortly after
    // the last change (and at once on Done).
    var saveTimer = 0, saving = null;
    function takeOrder() {
      state.custom = items().map(function (el) { return el.getAttribute("data-id"); });
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 800);
    }
    function setNote(text) { orderNote = text; note.textContent = text; }
    function save(order) {
      clearTimeout(saveTimer);
      var body = order === null ? null : state.custom;
      setNote("Saving your order…");
      saving = window.CA_DASH_API.saveCustomOrder(body).then(function () {
        setNote(body === null ? "Back to the default order." : "Your order is saved to your account.");
        saving = null;
      }, function (e) {
        setNote("Your order couldn’t be saved: " + e.message);
        saving = null;
        throw e;
      });
      return saving;
    }
    function move(el, to) {
      var all = items(), from = all.indexOf(el);
      to = Math.max(0, Math.min(all.length - 1, to));
      if (to === from) return false;
      var ref = to > from ? all[to].nextSibling : all[to];
      el.parentNode.insertBefore(el, ref);
      markPositions();
      takeOrder();
      return true;
    }
    function startEditing() {
      if (!state.custom) state.custom = defaultOrder();
      state.sort = "custom";
      state.editing = true;
      saveFlag(opts.storageKey + ":sort", "custom");
      setNote("Drag the handles, or use Move up and Move down. Changes save to your account.");
      render();
      var first = region.querySelector('[data-order="drag"]');
      if (first) first.focus();
    }
    function stopEditing() {
      if (!state.editing) return;
      state.editing = false;
      if (saveTimer) save().catch(function () {});
      else setNote("");
      render();
    }

    // Keyboard: Move up / Move down, and the arrow keys on a handle. Focus
    // stays on the moved item's control.
    region.addEventListener("click", function (e) {
      var b = e.target.closest('[data-order="up"], [data-order="down"]');
      if (!b || !state.editing) return;
      var el = b.closest("[data-id]"), all = items(), i = all.indexOf(el);
      var dir = b.getAttribute("data-order");
      if (move(el, dir === "up" ? i - 1 : i + 1)) {
        announceMove(el);
        var again = el.querySelector('[data-order="' + dir + '"]');
        (again && !again.disabled ? again : el.querySelector('[data-order="' + (dir === "up" ? "down" : "up") + '"]')).focus();
      }
    });
    region.addEventListener("keydown", function (e) {
      var h = e.target.closest('[data-order="drag"]');
      if (!h || !state.editing) return;
      var step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
      if (e.key === "Home") step = -Infinity;
      if (e.key === "End") step = Infinity;
      if (!step) return;
      e.preventDefault();
      var el = h.closest("[data-id]"), i = items().indexOf(el);
      if (move(el, isFinite(step) ? i + step : step < 0 ? 0 : items().length - 1)) { announceMove(el); h.focus(); }
    });

    // Dragging: pointer events, so mouse, touch and pen work alike. The
    // item follows the pointer; when the pointer is over another item, the
    // dragged one takes that place (all items are the same size, so the
    // others only swap places and nothing else moves). Near the top or
    // bottom of the window the page scrolls.
    var drag = null;
    region.addEventListener("pointerdown", function (e) {
      var h = e.target.closest('[data-order="drag"]');
      if (!h || !state.editing || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      var el = h.closest("[data-id]");
      drag = { el: el, id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, left: el.offsetLeft, top: el.offsetTop,
        sx: window.scrollX, sy: window.scrollY, scrollX: 0, scrollY: 0, from: items().indexOf(el), raf: 0 };
      // Moving the item in the page ends pointer capture, so the drag
      // listens on the whole window until the pointer is released.
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      el.classList.add("is-dragging");
      region.classList.add("is-dragging");
      drag.raf = requestAnimationFrame(autoScroll);
    });
    function follow() {
      var el = drag.el;
      el.style.transform = "translate(" + (drag.px - drag.x - (el.offsetLeft - drag.left) + drag.scrollX) + "px," + (drag.py - drag.y - (el.offsetTop - drag.top) + drag.scrollY) + "px)";
    }
    function autoScroll() {
      if (!drag) return;
      var edge = 72;
      var v = drag.py < edge ? -Math.ceil((edge - drag.py) / 6) : drag.py > innerHeight - edge ? Math.ceil((drag.py - innerHeight + edge) / 6) : 0;
      if (v) { window.scrollBy(0, v); overItem(); }
      drag.raf = requestAnimationFrame(autoScroll);
    }
    // The item under the pointer, if it's another one: take its place.
    function overItem() {
      var el = drag.el;
      drag.scrollX = window.scrollX - drag.sx; drag.scrollY = window.scrollY - drag.sy;
      var all = items();
      for (var i = 0; i < all.length; i++) {
        if (all[i] === el) continue;
        var r = all[i].getBoundingClientRect();
        if (drag.px >= r.left && drag.px <= r.right && drag.py >= r.top && drag.py <= r.bottom) {
          var from = all.indexOf(el);
          el.parentNode.insertBefore(el, i > from ? all[i].nextSibling : all[i]);
          markPositions();
          break;
        }
      }
      follow();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.px = e.clientX; drag.py = e.clientY;
      overItem();
    }
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      cancelAnimationFrame(drag.raf);
      var el = drag.el, moved = items().indexOf(el) !== drag.from;
      el.style.transform = "";
      el.classList.remove("is-dragging");
      region.classList.remove("is-dragging");
      drag = null;
      if (moved) { takeOrder(); announceMove(el); }
    }

    var fullHeight = {};
    function render() {
      syncControls();
      var list = sorted();
      // Arranging shows the carousel as cards, so every card can be moved.
      var view = state.editing && state.view === "carousel" ? "cards" : state.view;
      region.className = "dash-assets dash-assets--" + view + (pro ? " dash-assets--pro" : "") + (state.editing ? " is-ordering" : "");
      var cardsHtml = view === "list" ? "" : list.map(card).join("") + (opts.redacted ? locked(redactedCount, lockedCard) : "");
      region.innerHTML = list.length ? (view === "carousel" ? carouselHtml(cardsHtml)
        : view === "cards" ? '<div class="dash-big"><div class="dash-cards dash-cards--grid">' + cardsHtml + "</div></div>" : table(list))
        : '<p class="dash-empty">No assets match “' + UI.esc(state.query) + "”.</p>";
      if (list.length && view === "carousel") carousel(region.querySelector(".dash-carousel"));
      if (state.editing) markPositions();
      // Keep the unfiltered height while a search narrows the list, so the
      // page below doesn't jump as you type.
      var key = state.view + ":" + window.innerWidth;
      if (!state.query) { region.style.minHeight = ""; fullHeight[key] = region.getBoundingClientRect().height; }
      else if (fullHeight[key]) region.style.minHeight = fullHeight[key] + "px";
    }

    /* ---- Events ---- */
    bar.addEventListener("click", function (e) {
      if (e.target.closest('[data-control="custom"]')) { closeColumns(); startEditing(); return; }
      if (e.target.closest('[data-control="done"]')) { stopEditing(); if (orderBtn) orderBtn.focus(); return; }
      if (e.target.closest('[data-control="reset"]')) {
        state.custom = defaultOrder();
        render();
        save(null).catch(function () {});
        orderSay.textContent = "Back to the default order: Bitcoin, Ethereum, then by market cap.";
        return;
      }
      var v = e.target.closest("[data-view]");
      if (v) { state.view = v.getAttribute("data-view"); saveView(opts.storageKey, state.view); closeColumns(); render(); return; }
      if (e.target.closest('[data-control="dir"]')) { state.dir = state.dir === "desc" ? "asc" : "desc"; render(); return; }
      if (e.target.closest(".dash-columns__btn")) { toggleColumns(colsPanel.hidden); }
    });
    tfSelect.addEventListener("change", function () { state.tf = tfSelect.value; render(); });
    sortSelect.addEventListener("change", function () {
      // Leaving the custom order keeps it: choosing it again brings it back.
      if (state.editing && sortSelect.value !== "custom") { state.editing = false; if (saveTimer) save().catch(function () {}); }
      state.sort = sortSelect.value;
      state.dir = state.sort === "name" ? "asc" : "desc";
      if (ordering) saveFlag(opts.storageKey + ":sort", state.sort === "custom" ? "custom" : "other");
      if (state.sort !== "custom") setNote("");
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
        if (state.editing) { state.editing = false; if (saveTimer) save().catch(function () {}); }
        if (ordering) saveFlag(opts.storageKey + ":sort", "other");
        var key = s.getAttribute("data-sort");
        if (state.sort === key) state.dir = state.dir === "desc" ? "asc" : "desc";
        else { state.sort = key; state.dir = key === "name" ? "asc" : "desc"; }
        render();
        var again = region.querySelector('[data-sort="' + key + '"]');
        if (again) again.focus();
        return;
      }
      // A click anywhere on a row (not on a link or button) opens the asset;
      // not while arranging.
      var row = e.target.closest(".dash-row");
      if (row && !state.editing && !e.target.closest("a, button")) location.href = row.getAttribute("data-href");
    });
    window.addEventListener("resize", function () { if (!state.query) region.style.minHeight = ""; });

    var redactedCount = 0;
    var api = window.CA_DASH_API;
    return Promise.all([api.getAssets(), api.getMeta(), ordering ? api.getCustomOrder() : null]).then(function (r) {
      var list = r[0];
      assets = opts.only ? list.filter(function (a) { return opts.only.indexOf(a.id) !== -1; }) : list;
      redactedCount = opts.redacted ? r[1].hidden || 0 : 0;
      // A saved custom order opens in custom order, unless another sort was
      // the last one used in this browser.
      if (ordering && r[2]) {
        state.custom = r[2];
        if (readFlag(opts.storageKey + ":sort") !== "other") state.sort = "custom";
      }
      render();
    });
  }

  var PINNED = ["btc", "eth"];
  // Our score out of its scale (the research API rates out of 10).
  function score(a) {
    if (a.canaryScore == null) return '<span class="dash-muted">n/a</span>';
    return (Math.round(a.canaryScore * 100) / 100) + ' <span class="dash-muted">/ ' + (a.scoreMax || 10) + "</span>";
  }
  // The full written report (dashboard/report/).
  function reportHref(a) { return "/dashboard/report/?slug=" + encodeURIComponent(a.id); }
  // Verdict colour by family: deploy, hold (incl. staged DCA), watch, avoid.
  function verdictFamily(v) {
    var d = String(v || "").toLowerCase();
    if (/avoid/.test(d)) return "avoid";
    if (/watch/.test(d)) return "watch-list";
    if (/deploy|buy|accumulate/.test(d)) return "deploy-investment";
    if (/hold|dca/.test(d)) return "conditional-hold";
    return "watch-list";
  }
  function verdictTag(v) {
    return '<span class="dash-verdict dash-verdict--' + verdictFamily(v) + '" title="' + UI.esc(v) + '">' + UI.esc(v) + "</span>";
  }

  return { mount: mount, verdictTag: verdictTag, score: score, reportHref: reportHref };
})();
