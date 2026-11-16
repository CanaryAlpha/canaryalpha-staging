/*
 * The dashboard's "Leave a review" card ([data-review-form]), on the Free,
 * Pro and Enterprise dashboards. One review per account: the member can
 * write it, edit it (it goes back for approval) or delete it. Everything is
 * checked again on the server (api/reviews/mine.js); this only helps the
 * member get it right first time.
 *
 * Needs components/auth.js (CA_AUTH.fetch) and reviews-list.js (stars).
 */
(function () {
  var root = document.querySelector("[data-review-form]");
  if (!root || !window.CA_AUTH || !window.CA_REVIEWS) return;
  var R = window.CA_REVIEWS, el = R.el;
  var MIN = 20, MAX = 600;
  var STATUS = {
    pending: "Thanks. Your review is waiting for approval. We check every review before it appears on the site.",
    approved: "Your review is published on the site.",
    declined: "Your review wasn't published. You can edit it and send it again.",
    hidden: "Your review isn't shown on the site at the moment."
  };
  var DISPLAYS = [
    ["name", "First name + last initial", "e.g. Alex M."],
    ["initials", "Initials only", "e.g. A.M."],
    ["anonymous", "Anonymous member", ""]
  ];

  var current = null, profile = { hasFirstName: true, hasName: true };
  var form = el("form", "rv-form");
  form.noValidate = true;
  form.setAttribute("aria-busy", "true");

  var status = el("p", "rv-form__status");
  status.setAttribute("role", "status");
  status.hidden = true;
  form.appendChild(status);

  // Rating
  var fsRating = el("fieldset");
  fsRating.appendChild(el("legend", "", "Your rating"));
  var pick = el("div", "rv-pick");
  var labels = [];
  for (var i = 1; i <= 5; i++) {
    var id = "rv-star-" + i;
    var input = el("input");
    input.type = "radio"; input.name = "rating"; input.value = String(i); input.id = id;
    var lab = el("label");
    lab.htmlFor = id;
    lab.title = i + (i === 1 ? " star" : " stars");
    lab.appendChild(R.starSvg());
    lab.appendChild(el("span", "rv-sr", i + (i === 1 ? " star" : " stars")));
    pick.appendChild(input);
    pick.appendChild(lab);
    labels.push(lab);
  }
  function paint(n) { labels.forEach(function (l, k) { l.classList.toggle("is-on", k < n); }); }
  function chosen() { var c = form.querySelector('input[name="rating"]:checked'); return c ? +c.value : 0; }
  pick.addEventListener("change", function () { paint(chosen()); });
  labels.forEach(function (l, k) {
    l.addEventListener("mouseenter", function () { paint(k + 1); });
  });
  pick.addEventListener("mouseleave", function () { paint(chosen()); });
  fsRating.appendChild(pick);
  form.appendChild(fsRating);

  // Comment
  var wrapText = el("div");
  var tl = el("label", "rv-form__label", "Your review");
  tl.htmlFor = "rv-text";
  var ta = el("textarea");
  ta.id = "rv-text"; ta.name = "text"; ta.maxLength = MAX; ta.rows = 5;
  ta.setAttribute("aria-describedby", "rv-text-hint");
  var hint = el("p", "rv-form__hint");
  hint.id = "rv-text-hint";
  var count = el("span", "rv-form__count", "0 / " + MAX);
  hint.appendChild(count);
  hint.appendChild(document.createTextNode(" characters. At least " + MIN + ". Links and HTML are removed."));
  ta.addEventListener("input", function () {
    var n = ta.value.trim().length;
    count.textContent = n + " / " + MAX;
    count.classList.toggle("is-bad", n > 0 && n < MIN);
  });
  wrapText.appendChild(tl);
  wrapText.appendChild(ta);
  wrapText.appendChild(hint);
  form.appendChild(wrapText);

  // Display name
  var fsName = el("fieldset");
  fsName.appendChild(el("legend", "", "Show my name as"));
  var choices = {};
  DISPLAYS.forEach(function (d) {
    var lab = el("label", "rv-choice");
    var r = el("input");
    r.type = "radio"; r.name = "display"; r.value = d[0];
    lab.appendChild(r);
    lab.appendChild(el("span", "", d[1]));
    if (d[2]) lab.appendChild(el("span", "rv-choice__eg", d[2]));
    choices[d[0]] = { label: lab, input: r };
    fsName.appendChild(lab);
  });
  var nameNote = el("p", "rv-form__hint");
  nameNote.hidden = true;
  fsName.appendChild(nameNote);
  form.appendChild(fsName);

  // Consent
  var cons = el("label", "rv-consent");
  var cb = el("input");
  cb.type = "checkbox"; cb.name = "consent"; cb.required = true;
  cons.appendChild(cb);
  cons.appendChild(el("span", "", "I agree that Canary Alpha Research may publish my review on its website."));
  form.appendChild(cons);

  var err = el("p", "rv-form__error");
  err.setAttribute("role", "alert");
  var ok = el("p", "rv-form__ok");
  ok.setAttribute("aria-live", "polite");
  form.appendChild(err);
  form.appendChild(ok);

  var actions = el("div", "rv-actions");
  var submit = el("button", "rv-btn", "Submit review");
  submit.type = "submit";
  var del = el("button", "rv-btn rv-btn--danger", "Delete review");
  del.type = "button";
  del.hidden = true;
  var cancelDel = el("button", "rv-btn rv-btn--quiet", "Keep it");
  cancelDel.type = "button";
  cancelDel.hidden = true;
  actions.appendChild(submit);
  actions.appendChild(del);
  actions.appendChild(cancelDel);
  form.appendChild(actions);

  root.textContent = "";
  root.appendChild(form);
  setBusy(true);

  function setBusy(b) {
    form.setAttribute("aria-busy", b ? "true" : "false");
    Array.prototype.forEach.call(form.querySelectorAll("input, textarea, button"), function (x) {
      if (x.dataset.off === "1") return;
      x.disabled = b;
    });
  }
  function applyProfile(p) {
    profile = p || profile;
    var offName = !profile.hasFirstName, offInit = !profile.hasName;
    [["name", offName], ["initials", offInit]].forEach(function (pair) {
      var c = choices[pair[0]];
      c.input.disabled = pair[1];
      c.input.dataset.off = pair[1] ? "1" : "";
      c.label.classList.toggle("is-off", pair[1]);
      if (pair[1] && c.input.checked) { c.input.checked = false; }
    });
    nameNote.hidden = !offName;
    if (offName) {
      nameNote.textContent = "";
      nameNote.appendChild(document.createTextNode("Your account has no " + (offInit ? "name" : "first name") + ". "));
      var a = el("a", "", "Add it in Settings");
      a.href = window.CA_AUTH.urls.account;
      nameNote.appendChild(a);
      nameNote.appendChild(document.createTextNode(" to show it."));
    }
  }
  function show(review) {
    current = review;
    if (review) {
      var r = form.querySelector('input[name="rating"][value="' + review.rating + '"]');
      if (r) r.checked = true;
      paint(review.rating);
      ta.value = review.text;
      ta.dispatchEvent(new Event("input"));
      if (choices[review.display] && !choices[review.display].input.disabled) choices[review.display].input.checked = true;
      cb.checked = true;
      status.textContent = STATUS[review.status] || "";
      status.hidden = !STATUS[review.status];
      submit.textContent = "Save changes";
      del.hidden = false;
    } else {
      form.reset();
      paint(0);
      ta.dispatchEvent(new Event("input"));
      status.hidden = true;
      submit.textContent = "Submit review";
      del.hidden = true;
    }
    cancelDel.hidden = true;
    del.textContent = "Delete review";
  }
  function message(res, data) {
    if (data && data.message) return data.message;
    if (res.status === 401) return "Your session has ended. Log in again to continue.";
    return "Something went wrong. Please try again.";
  }

  window.CA_AUTH.fetch("reviews/mine").then(function (res) {
    return res.json().then(function (data) { return { res: res, data: data }; });
  }).then(function (x) {
    setBusy(false);
    if (!x.res.ok) { err.textContent = message(x.res, x.data); return; }
    applyProfile(x.data.profile);
    show(x.data.review);
  }).catch(function () {
    setBusy(false);
    err.textContent = "Your review couldn't be loaded. Please reload the page.";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.textContent = ""; ok.textContent = "";
    var rating = chosen();
    var text = ta.value.trim();
    var display = (form.querySelector('input[name="display"]:checked') || {}).value;
    if (!rating) { err.textContent = "Choose a rating from 1 to 5 stars."; return; }
    if (text.length < MIN) { err.textContent = "Write at least " + MIN + " characters."; ta.focus(); return; }
    if (!display) { err.textContent = "Choose how your name is shown."; return; }
    if (!cb.checked) { err.textContent = "Tick the box to agree that we may publish your review."; cb.focus(); return; }
    setBusy(true);
    window.CA_AUTH.fetch("reviews/mine", {
      method: "POST",
      body: JSON.stringify({ rating: rating, text: text, display: display, consent: true })
    }).then(function (res) {
      return res.json().then(function (data) { return { res: res, data: data }; });
    }).then(function (x) {
      setBusy(false);
      if (!x.res.ok) { err.textContent = message(x.res, x.data); return; }
      var edited = !!current;
      applyProfile(x.data.profile);
      show(x.data.review);
      ok.textContent = edited ? "Saved. Your changes are waiting for approval." : "Thanks for your review. It's waiting for approval.";
    }).catch(function () {
      setBusy(false);
      err.textContent = "Your review couldn't be saved. Please try again.";
    });
  });

  del.addEventListener("click", function () {
    err.textContent = ""; ok.textContent = "";
    if (cancelDel.hidden) {
      del.textContent = "Yes, delete my review";
      cancelDel.hidden = false;
      return;
    }
    setBusy(true);
    window.CA_AUTH.fetch("reviews/mine", { method: "DELETE" }).then(function (res) {
      return res.json().then(function (data) { return { res: res, data: data }; });
    }).then(function (x) {
      setBusy(false);
      if (!x.res.ok) { err.textContent = message(x.res, x.data); return; }
      show(null);
      ok.textContent = "Your review is deleted.";
    }).catch(function () {
      setBusy(false);
      err.textContent = "Your review couldn't be deleted. Please try again.";
    });
  });
  cancelDel.addEventListener("click", function () {
    del.textContent = "Delete review";
    cancelDel.hidden = true;
  });
})();
