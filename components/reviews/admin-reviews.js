/*
 * Admin: manage member reviews ([data-review-admin], /admin/reviews/).
 *
 * The page holds nothing itself. Every review comes from
 * GET /api/admin/reviews/ and every action goes to
 * POST /api/admin/reviews/action/; both check on the server that the caller
 * is an admin (Clerk publicMetadata.role "admin") with two-step
 * verification on. Anyone else sees "This page isn't available."; an admin
 * without two-step verification sees how to turn it on.
 *
 * Per review: Approve / Decline (waiting), Hide (published), Restore
 * (hidden), Approve (declined), a public reply (add, edit, remove) and
 * Delete, which asks for a reason and a confirmation in the page first.
 * Filters: status and star rating. Email alerts aren't set up on this site,
 * so the count of reviews waiting is shown at the top instead.
 */
(function () {
  var root = document.querySelector("[data-review-admin]");
  if (!root || !window.CA_AUTH || !window.CA_REVIEWS) return;
  var R = window.CA_REVIEWS, el = R.el;
  var q = function (sel) { return root.querySelector(sel); };
  var countEl = q("[data-admin-count]"), listEl = q("[data-admin-list]"), tabsEl = q("[data-admin-tabs]");
  var starsSel = q("[data-admin-stars]"), statsEl = q("[data-admin-stats]"), logBody = q("[data-admin-log-body]");
  var FILTERS = [["pending", "Waiting"], ["approved", "Published"], ["hidden", "Hidden"], ["declined", "Declined"], ["all", "All"]];
  var STATUS_LABEL = { pending: "Waiting", approved: "Published", hidden: "Hidden", declined: "Declined" };
  var BUTTONS = {
    pending: [["approve", "Approve"], ["decline", "Decline"]],
    approved: [["hide", "Hide"]],
    hidden: [["restore", "Restore"]],
    declined: [["approve", "Approve"]]
  };
  var REASONS = [["spam", "Spam"], ["abuse", "Abuse or hate"], ["private_info", "Private information"],
    ["member_request", "Member requested removal"], ["other", "Other"]];
  var MAX_REPLY = 1000;
  var data = { items: [], deletions: [] }, filter = "pending", seq = 0;

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function showOnly(node) {
    var body = q("[data-admin-body]");
    body.textContent = "";
    body.appendChild(node);
  }
  function unavailable(text) { showOnly(el("p", "rv-page__empty", text)); }
  function needs2fa(message) {
    var box = el("div", "rv-admin__2fa");
    box.appendChild(el("h2", "rv-admin__h2", "Turn on two-step verification"));
    box.appendChild(el("p", "", message || "Admin pages need two-step verification on your account."));
    var ol = el("ol", "rv-admin__steps");
    var first = el("li");
    first.appendChild(document.createTextNode("Open "));
    var a = el("a", "", "Settings → Security");
    a.href = window.CA_AUTH.urls.account + "#/security";
    first.appendChild(a);
    first.appendChild(document.createTextNode("."));
    ol.appendChild(first);
    ol.appendChild(el("li", "", "Under “Two-step verification”, choose Add two-step verification, then Authenticator application."));
    ol.appendChild(el("li", "", "Scan the code with an authenticator app (for example 1Password, Google Authenticator or Authy), enter the 6-digit code, and keep the backup codes somewhere safe."));
    ol.appendChild(el("li", "", "Come back and reload this page."));
    box.appendChild(ol);
    box.appendChild(el("p", "rv-page__sub", "Until it's on, every admin action is refused by the server."));
    showOnly(box);
  }

  // ---- Summary of published reviews (the same figures /reviews/ shows) ----
  function renderStats() {
    statsEl.textContent = "";
    var p = data.published || { count: 0 };
    statsEl.appendChild(R.overview(p));
  }
  function published() {
    var a = data.items.filter(function (i) { return i.status === "approved"; });
    var b = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, sum = 0;
    a.forEach(function (i) { b[i.rating] += 1; sum += i.rating; });
    return { count: a.length, average: a.length ? Math.round((sum / a.length) * 10) / 10 : null, breakdown: b };
  }

  function renderCount() {
    var n = data.items.filter(function (i) { return i.status === "pending"; }).length;
    countEl.textContent = n === 0 ? "No reviews are waiting." : n === 1 ? "1 review is waiting for you." : n + " reviews are waiting for you.";
  }
  function renderTabs() {
    tabsEl.textContent = "";
    FILTERS.forEach(function (f) {
      var n = f[0] === "all" ? data.items.length : data.items.filter(function (i) { return i.status === f[0]; }).length;
      var b = el("button", "", f[1] + " (" + n + ")");
      b.type = "button";
      b.setAttribute("aria-pressed", f[0] === filter ? "true" : "false");
      b.addEventListener("click", function () { filter = f[0]; render(); });
      tabsEl.appendChild(b);
    });
  }
  function renderLog() {
    logBody.textContent = "";
    var d = data.deletions || [];
    if (!d.length) { logBody.appendChild(el("p", "rv-page__empty", "No reviews have been deleted.")); return; }
    var wrap = el("div", "rv-admin__table");
    var t = el("table");
    var head = el("tr");
    ["When", "Deleted by", "Review by", "Rating", "Was", "Reason"].forEach(function (h) { head.appendChild(el("th", "", h)); });
    var thead = el("thead"); thead.appendChild(head); t.appendChild(thead);
    var tb = el("tbody");
    d.forEach(function (x) {
      var tr = el("tr");
      [fmtTime(x.at), x.by, "Account " + x.userId, x.rating + "★", STATUS_LABEL[x.status] || x.status, x.reasonLabel || x.reason]
        .forEach(function (c) { tr.appendChild(el("td", "", c)); });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    logBody.appendChild(wrap);
    logBody.appendChild(el("p", "rv-form__hint", "The deleted text is not kept."));
  }

  // ---- One review ----
  function item(it) {
    var li = el("li", "rv-queue__item");
    li.setAttribute("data-user", it.userId);
    var c = R.card({ rating: it.rating, text: it.text, name: it.name, tierLabel: it.tierLabel, updatedAt: it.updatedAt }, "div");
    var meta = el("p", "rv-card__meta");
    meta.appendChild(el("span", "rv-queue__status rv-status--" + it.status, STATUS_LABEL[it.status] || it.status));
    meta.appendChild(el("span", "", "Written " + fmtDate(it.createdAt) + (it.updatedAt !== it.createdAt ? ", edited " + fmtDate(it.updatedAt) : "")));
    meta.appendChild(el("span", "", it.consent ? "Consent given" : "No consent"));
    meta.appendChild(el("span", "", "Account " + it.userId));
    c.insertBefore(meta, c.firstChild);

    if (it.reply) {
      var rb = R.replyBlock({ text: it.reply.text, date: it.reply.updatedAt });
      if (!it.reply.current) rb.appendChild(el("p", "rv-form__hint", "This reply was written for an earlier version of the review. Check it still fits."));
      c.appendChild(rb);
    }
    var msg = el("p", "rv-queue__msg");
    msg.setAttribute("role", "alert");
    var acts = el("div", "rv-actions");
    var panel = el("div", "rv-admin__panel");
    (BUTTONS[it.status] || []).forEach(function (a) {
      var b = el("button", "rv-btn" + (a[0] === "decline" || a[0] === "hide" ? " rv-btn--quiet" : ""), a[1]);
      b.type = "button";
      b.addEventListener("click", function () { send(it, { action: a[0] }, li, msg); });
      acts.appendChild(b);
    });
    var rbtn = el("button", "rv-btn rv-btn--quiet", it.reply ? "Edit reply" : "Reply");
    rbtn.type = "button";
    rbtn.addEventListener("click", function () { replyEditor(it, panel, li, msg); });
    acts.appendChild(rbtn);
    if (it.reply) {
      var un = el("button", "rv-btn rv-btn--quiet", "Remove reply");
      un.type = "button";
      un.addEventListener("click", function () { confirmRemoveReply(it, panel, li, msg); });
      acts.appendChild(un);
    }
    var del = el("button", "rv-btn rv-btn--danger", "Delete");
    del.type = "button";
    del.addEventListener("click", function () { deletePanel(it, panel, li, msg); });
    acts.appendChild(del);
    c.appendChild(acts);
    c.appendChild(panel);
    c.appendChild(msg);
    li.appendChild(c);
    return li;
  }

  function replyEditor(it, panel, li, msg) {
    panel.textContent = "";
    var id = "rv-reply-" + (++seq);
    var lab = el("label", "rv-form__label", "Response from Canary Alpha Research");
    lab.htmlFor = id;
    var ta = el("textarea", "rv-admin__textarea");
    ta.id = id; ta.maxLength = MAX_REPLY; ta.rows = 4;
    ta.value = it.reply ? it.reply.text : "";
    var hint = el("p", "rv-form__hint", "Shown publicly under the review, with today's date. Links and HTML are removed. ");
    var cnt = el("span", "rv-form__count", ta.value.length + " / " + MAX_REPLY);
    hint.appendChild(cnt);
    ta.addEventListener("input", function () { cnt.textContent = ta.value.length + " / " + MAX_REPLY; });
    var row = el("div", "rv-actions");
    var save = el("button", "rv-btn", it.reply ? "Save reply" : "Post reply");
    save.type = "button";
    var cancel = el("button", "rv-btn rv-btn--quiet", "Cancel");
    cancel.type = "button";
    save.addEventListener("click", function () {
      if (ta.value.trim().length < 2) { msg.textContent = "Write a reply first."; ta.focus(); return; }
      send(it, { action: "reply", text: ta.value }, li, msg);
    });
    cancel.addEventListener("click", function () { panel.textContent = ""; msg.textContent = ""; });
    row.appendChild(save); row.appendChild(cancel);
    panel.appendChild(lab); panel.appendChild(ta); panel.appendChild(hint); panel.appendChild(row);
    ta.focus();
  }
  function confirmRemoveReply(it, panel, li, msg) {
    panel.textContent = "";
    var box = el("div", "rv-admin__confirm");
    box.appendChild(el("p", "", "Remove the reply from this review?"));
    var row = el("div", "rv-actions");
    var yes = el("button", "rv-btn rv-btn--danger", "Remove reply");
    yes.type = "button";
    var no = el("button", "rv-btn rv-btn--quiet", "Keep it");
    no.type = "button";
    yes.addEventListener("click", function () { send(it, { action: "unreply" }, li, msg); });
    no.addEventListener("click", function () { panel.textContent = ""; });
    row.appendChild(yes); row.appendChild(no);
    box.appendChild(row);
    panel.appendChild(box);
    yes.focus();
  }
  function deletePanel(it, panel, li, msg) {
    panel.textContent = "";
    var box = el("div", "rv-admin__confirm");
    box.setAttribute("role", "group");
    var title = el("p", "rv-admin__confirm-title", "Delete this review permanently? This can't be undone.");
    title.id = "rv-del-" + (++seq);
    box.setAttribute("aria-labelledby", title.id);
    box.appendChild(title);
    var fs = el("fieldset", "rv-admin__reasons");
    fs.appendChild(el("legend", "", "Reason"));
    var name = "rv-reason-" + seq;
    REASONS.forEach(function (r) {
      var lab = el("label", "rv-choice");
      var input = el("input");
      input.type = "radio"; input.name = name; input.value = r[0];
      lab.appendChild(input);
      lab.appendChild(el("span", "", r[1]));
      fs.appendChild(lab);
    });
    box.appendChild(fs);
    box.appendChild(el("p", "rv-form__hint", "The log keeps who deleted it, when, the reason, the account and the rating, not the text."));
    var row = el("div", "rv-actions");
    var yes = el("button", "rv-btn rv-btn--danger", "Delete permanently");
    yes.type = "button";
    var no = el("button", "rv-btn rv-btn--quiet", "Cancel");
    no.type = "button";
    yes.addEventListener("click", function () {
      var c = fs.querySelector("input:checked");
      if (!c) { msg.textContent = "Choose a reason first."; return; }
      send(it, { action: "delete", reason: c.value }, li, msg);
    });
    no.addEventListener("click", function () { panel.textContent = ""; msg.textContent = ""; });
    row.appendChild(yes); row.appendChild(no);
    box.appendChild(row);
    panel.appendChild(box);
    title.setAttribute("tabindex", "-1");
    title.focus();
  }

  function render() {
    renderCount();
    renderTabs();
    renderStats();
    renderLog();
    listEl.textContent = "";
    var stars = +starsSel.value || 0;
    var shown = data.items.filter(function (i) {
      return (filter === "all" || i.status === filter) && (!stars || i.rating === stars);
    });
    if (!shown.length) { listEl.appendChild(el("li", "rv-page__empty", "Nothing here.")); return; }
    shown.forEach(function (it) { listEl.appendChild(item(it)); });
  }

  function setBusy(li, b) {
    Array.prototype.forEach.call(li.querySelectorAll("button, textarea, input"), function (x) { x.disabled = b; });
  }
  function send(it, extra, li, msg) {
    msg.textContent = "";
    setBusy(li, true);
    var body = { userId: it.userId, version: it.updatedAt };
    for (var k in extra) body[k] = extra[k];
    window.CA_AUTH.fetch("admin/reviews/action", { method: "POST", body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, data: d }; });
    }).then(function (x) {
      if (x.res.status === 403 && x.data && x.data.error === "needs_2fa") { needs2fa(x.data.message); return; }
      if (!x.res.ok) {
        msg.textContent = (x.data && x.data.message) || "That didn't work. Reload and try again.";
        setBusy(li, false);
        return;
      }
      if (x.data.deleted) {
        data.items = data.items.filter(function (i) { return i.userId !== it.userId; });
        load(); // the deletion log is kept on the server
      } else {
        data.items = data.items.map(function (i) { return i.userId === it.userId ? x.data.item : i; });
      }
      data.published = published();
      render();
    }).catch(function () {
      msg.textContent = "That didn't work. Check your connection and try again.";
      setBusy(li, false);
    });
  }

  starsSel.addEventListener("change", render);

  function load() {
    return window.CA_AUTH.fetch("admin/reviews").then(function (res) {
      if (res.status === 401) { location.href = window.CA_AUTH.urls.login + "?next=" + encodeURIComponent(location.pathname); return null; }
      if (res.status === 403) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          if (d && d.error === "needs_2fa") needs2fa(d.message); else unavailable("This page isn't available.");
          return null;
        });
      }
      if (!res.ok) { unavailable("This page isn't available."); return null; }
      return res.json();
    }).then(function (d) {
      if (!d) return;
      data = { items: d.items || [], deletions: d.deletions || [], published: d.published };
      var loading = q("[data-admin-loading]");
      if (loading) loading.remove();
      q("[data-admin-ready]").hidden = false;
      render();
    }).catch(function () { unavailable("The reviews couldn't be loaded. Please reload the page."); });
  }
  load();
})();
