/*
 * The owner's review queue ([data-review-queue], /reviews/queue/). The page
 * itself holds nothing: every review comes from GET /api/reviews/queue/,
 * which answers only the owner (checked on the server), and every action
 * goes to POST /api/reviews/moderate/, which checks again. Anyone else
 * sees "This page isn't available."
 *
 * Email alerts aren't set up on this site, so the count of reviews waiting
 * is shown at the top instead.
 */
(function () {
  var root = document.querySelector("[data-review-queue]");
  if (!root || !window.CA_AUTH || !window.CA_REVIEWS) return;
  var R = window.CA_REVIEWS, el = R.el;
  var countEl = root.querySelector("[data-queue-count]");
  var listEl = root.querySelector("[data-queue-list]");
  var tabsEl = root.querySelector("[data-queue-tabs]");
  var FILTERS = [["pending", "Waiting"], ["approved", "Published"], ["hidden", "Hidden"], ["declined", "Declined"], ["all", "All"]];
  var BUTTONS = {
    pending: [["approve", "Approve"], ["decline", "Decline"]],
    approved: [["hide", "Hide from the site"]],
    hidden: [["approve", "Show again"], ["decline", "Decline"]],
    declined: [["approve", "Approve"]]
  };
  var items = [], filter = "pending";

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  function unavailable(text) {
    root.querySelector("[data-queue-body]").textContent = "";
    root.querySelector("[data-queue-body]").appendChild(el("p", "rv-page__empty", text));
  }
  function renderCount() {
    var n = items.filter(function (i) { return i.status === "pending"; }).length;
    countEl.textContent = n === 0 ? "No reviews are waiting." : n === 1 ? "1 review is waiting for you." : n + " reviews are waiting for you.";
  }
  function renderTabs() {
    tabsEl.textContent = "";
    FILTERS.forEach(function (f) {
      var n = f[0] === "all" ? items.length : items.filter(function (i) { return i.status === f[0]; }).length;
      var b = el("button", "", f[1] + " (" + n + ")");
      b.type = "button";
      b.setAttribute("aria-pressed", f[0] === filter ? "true" : "false");
      b.addEventListener("click", function () { filter = f[0]; render(); });
      tabsEl.appendChild(b);
    });
  }
  function item(it) {
    var li = el("li", "rv-queue__item");
    var c = R.card({ rating: it.rating, text: it.text, name: it.name, tierLabel: it.tierLabel, updatedAt: it.updatedAt }, "div");
    var meta = el("p", "rv-card__meta");
    meta.appendChild(el("span", "rv-queue__status", it.status === "pending" ? "Waiting" : it.status));
    meta.appendChild(el("span", "", "Written " + fmtDate(it.createdAt) + (it.updatedAt !== it.createdAt ? ", edited " + fmtDate(it.updatedAt) : "")));
    meta.appendChild(el("span", "", it.consent ? "Consent given" : "No consent"));
    meta.appendChild(el("span", "", "Account " + it.userId));
    c.insertBefore(meta, c.firstChild);
    var msg = el("p", "rv-queue__msg");
    msg.setAttribute("role", "alert");
    var acts = el("div", "rv-actions");
    (BUTTONS[it.status] || []).forEach(function (a) {
      var b = el("button", "rv-btn" + (a[0] === "approve" ? "" : a[0] === "decline" ? " rv-btn--danger" : " rv-btn--quiet"), a[1]);
      b.type = "button";
      b.addEventListener("click", function () { act(it, a[0], acts, msg); });
      acts.appendChild(b);
    });
    c.appendChild(acts);
    c.appendChild(msg);
    li.appendChild(c);
    return li;
  }
  function render() {
    renderCount();
    renderTabs();
    listEl.textContent = "";
    var shown = items.filter(function (i) { return filter === "all" || i.status === filter; });
    if (!shown.length) { listEl.appendChild(el("li", "rv-page__empty", "Nothing here.")); return; }
    shown.forEach(function (it) { listEl.appendChild(item(it)); });
  }
  function act(it, action, acts, msg) {
    msg.textContent = "";
    Array.prototype.forEach.call(acts.querySelectorAll("button"), function (b) { b.disabled = true; });
    window.CA_AUTH.fetch("reviews/moderate", {
      method: "POST",
      body: JSON.stringify({ userId: it.userId, action: action, version: it.updatedAt })
    }).then(function (res) {
      return res.json().then(function (data) { return { res: res, data: data }; });
    }).then(function (x) {
      if (!x.res.ok) {
        msg.textContent = (x.data && x.data.message) || "That didn't work. Reload and try again.";
        Array.prototype.forEach.call(acts.querySelectorAll("button"), function (b) { b.disabled = false; });
        return;
      }
      items = items.map(function (i) { return i.userId === it.userId ? x.data.item : i; });
      render();
    }).catch(function () {
      msg.textContent = "That didn't work. Check your connection and try again.";
      Array.prototype.forEach.call(acts.querySelectorAll("button"), function (b) { b.disabled = false; });
    });
  }

  window.CA_AUTH.fetch("reviews/queue").then(function (res) {
    if (res.status === 401) { location.href = window.CA_AUTH.urls.login + "?next=" + encodeURIComponent(location.pathname); return null; }
    if (!res.ok) { unavailable("This page isn't available."); return null; }
    return res.json();
  }).then(function (data) {
    if (!data) return;
    items = data.items || [];
    root.querySelector("[data-queue-ready]").hidden = false;
    render();
  }).catch(function () { unavailable("The queue couldn't be loaded. Please reload the page."); });
})();
