/*
 * Enterprise dashboard: "Your bespoke reports". This month's allowance
 * (3 a billing month, no carry-over) with the request form, then one card
 * per report order with a progress bar, a stage tracker and the stage
 * history. Stages come from report-stages.config.js. A request uses one of
 * the month's reports and its card appears at the top of the list.
 *
 *   CA_DASH_REPORTS.mount(container, { contact: "../../contact/" })
 *
 * Reports change ONLY through CA_DASH_API.subscribeToReportProgress, so
 * connecting the live pipeline means changing that one function. Every
 * update edits the card in place: each card has a fixed height and the
 * bar moves by transform, so the page never shifts. Screen readers hear
 * stage changes (aria-live="polite"), not every small % step.
 */
window.CA_DASH_REPORTS = (function () {
  var UI = window.CA_DASH_UI;
  var esc = UI.esc;
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3.5 8.5 3 3 6-7"/></svg>';
  var DOWNLOAD = '<svg class="button__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';

  // "24 Oct, 14:05" (UTC), for the tracker and history.
  function when(iso) {
    var d = new Date(iso);
    return UI.date(iso).replace(/ \d{4}$/, "") + ", " + String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
  }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + "s ago";
    var m = Math.round(s / 60);
    return m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago";
  }

  function mount(container, opts) {
    var api = window.CA_DASH_API;
    var o = opts || {};
    return Promise.all([api.getReportStages(), api.getReports(), api.getAllowance()]).then(function (res) {
      var stages = res[0], reports = res[1];
      var lastUpdate = 0;

      container.innerHTML =
        '<div class="rep-top">' +
          '<h2 class="dash-section__title" id="reports-title">Your bespoke reports</h2>' +
          '<p class="rep-live" aria-hidden="true"><span class="rep-live__dot"></span>Live<span class="rep-live__ago"></span></p>' +
        "</div>" +
        '<div class="rep-access"></div>' +
        '<p class="rep-empty dash-muted"' + (reports.length ? " hidden" : "") + ">No bespoke reports yet.</p>" +
        '<div class="rep-list"></div>' +
        '<p class="dash-sr" aria-live="polite" data-rep-announce></p>';

      var list = container.querySelector(".rep-list");
      var announce = container.querySelector("[data-rep-announce]");
      var agoEl = container.querySelector(".rep-live__ago");
      var panel = container.querySelector(".rep-access");

      /* ---- This month's allowance and the request form ---- */
      var draft = { reportFor: "", notes: "" };
      function showAllowance(a, focusForm) {
        if (!a) {
          panel.innerHTML = '<p class="rep-access__main"><span class="dash-label">Bespoke reports</span>' +
            '<span class="rep-access__until">Part of Enterprise</span></p>' +
            '<p class="rep-access__note">Enterprise includes 3 bespoke reports every billing month.</p>' +
            UI.cta(o.account || "../../account/", "See your plan", "rep-access__cta");
          return;
        }
        var resets = UI.date(a.resetsAt);
        var when = a.renews ? "Resets " + resets : "Your plan ends " + UI.date(a.periodEnd);
        panel.innerHTML =
          '<p class="rep-access__main"><span class="dash-label">Bespoke reports this month</span>' +
            '<span class="rep-access__until">' + a.left + " of " + a.limit + " reports left this month</span>" +
            '<span class="rep-access__days">' + when + "</span></p>" +
          (a.left > 0
            ? '<form class="rep-request" novalidate>' +
                '<div class="field"><label class="field__label" for="rep-for">Token or project</label>' +
                  '<input class="field__input" id="rep-for" name="reportFor" maxlength="100" autocomplete="off" required aria-describedby="rep-for-error">' +
                  '<p class="field__error" id="rep-for-error" aria-live="polite"></p></div>' +
                '<div class="field"><label class="field__label" for="rep-notes">Notes (optional)</label>' +
                  '<textarea class="field__input rep-request__notes" id="rep-notes" name="notes" maxlength="500" rows="3" placeholder="What should the report focus on?"></textarea></div>' +
                '<div class="form__actions"><button type="submit" class="form__submit" data-busy="Sending&hellip;">Request report</button>' +
                  '<p class="form__status" role="status" aria-live="polite"></p></div>' +
                '<p class="rep-access__note">Each request uses one of this month&rsquo;s reports. Unused reports don&rsquo;t carry over.</p>' +
              "</form>"
            : '<p class="rep-access__note">You&rsquo;ve used all ' + a.limit + " of this month&rsquo;s reports. " +
              (a.renews ? "Your allowance resets on " + resets + "." : "Your plan ends on " + UI.date(a.periodEnd) + ", so there are no more reports this period.") + "</p>");
        var form = panel.querySelector(".rep-request");
        if (!form) return;
        form.elements.reportFor.value = draft.reportFor;
        form.elements.notes.value = draft.notes;
        form.addEventListener("input", function () { draft.reportFor = form.elements.reportFor.value; draft.notes = form.elements.notes.value; });
        if (focusForm) form.elements.reportFor.focus();
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var btn = form.querySelector("[type=submit]"), status = form.querySelector(".form__status"), err = form.querySelector("#rep-for-error");
          var forWhat = form.elements.reportFor.value.trim();
          err.textContent = ""; status.textContent = ""; status.classList.remove("is-error");
          if (forWhat.length < 2) {
            err.textContent = "Name the token or project the report is for.";
            form.elements.reportFor.setAttribute("aria-invalid", "true");
            form.elements.reportFor.closest(".field").classList.add("is-invalid");
            form.elements.reportFor.focus();
            return;
          }
          form.elements.reportFor.removeAttribute("aria-invalid");
          form.elements.reportFor.closest(".field").classList.remove("is-invalid");
          var label = btn.textContent;
          btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending…";
          api.requestReport(forWhat, form.elements.notes.value.trim()).then(function (res) {
            draft = { reportFor: "", notes: "" };
            container.querySelector(".rep-empty").hidden = true;
            addReport(res.order, true);
            showAllowance(res.allowance);
            announce.textContent = "Report requested: " + res.order.token.name + ", order " + res.order.id + ". " +
              (res.allowance ? res.allowance.left + " of " + res.allowance.limit + " reports left this month." : "");
          }, function (e2) {
            btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = label;
            status.classList.add("is-error");
            status.textContent = e2.message;
            // The month's reports ran out meanwhile (another tab): show it.
            if (e2.code === "allowance_used") api.getAllowance().then(function () {}, function () {});
          });
        });
      }
      showAllowance(res[2]);

      function addReport(r, first) {
        var card = build(r);
        if (first) list.insertBefore(card.el, list.firstChild); else list.appendChild(card.el);
        var prev = null;
        api.subscribeToReportProgress(r.id, function (next) {
          if (next.updatedAt) lastUpdate = Math.max(lastUpdate, Date.parse(next.updatedAt));
          card.update(next, prev);
          if (prev && prev.stage !== next.stage) {
            announce.textContent = next.status === "delivered"
              ? next.token.name + " report delivered. Downloads are ready."
              : next.token.name + " report: " + label(prev.stage) + " complete. Now " + label(next.stage) + ".";
          }
          prev = next;
        });
        if (first) card.update(r, null);
      }
      reports.forEach(function (r) { addReport(r, false); });

      // "Updated 4s ago": the time of the newest update, ticking each second.
      function showAgo() {
        agoEl.textContent = lastUpdate ? " · Updated " + ago(Date.now() - lastUpdate) : "";
      }
      setInterval(function () { if (!document.hidden) showAgo(); }, 1000);
      showAgo();

      function label(key) {
        for (var i = 0; i < stages.length; i++) if (stages[i].key === key) return stages[i].label;
        return key;
      }

      /* ---- One report card ---- */
      function build(r) {
        var el = UI.el("article", "rep");
        var titleId = "rep-" + r.id;
        el.setAttribute("aria-labelledby", titleId);
        el.innerHTML =
          '<header class="rep__head">' +
            '<div class="rep__who"><h3 class="rep__name" id="' + titleId + '">' + esc(r.token.name) +
              ' <span class="dash-muted">' + esc(r.token.ticker) + "</span></h3>" +
              '<p class="rep__meta">Report ' + esc(r.id) + " · Ordered " + UI.date(r.orderedAt) + "</p></div>" +
            '<span class="rep__status"></span>' +
          "</header>" +
          '<div class="rep__progress">' +
            '<p class="rep__nums"><span class="rep__summary"></span><span class="rep__pct"></span></p>' +
            '<div class="rep__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(r.token.name) + ' report progress">' +
              '<div class="rep__fill"></div></div>' +
            '<p class="rep__eta"></p>' +
          "</div>" +
          '<ol class="rep__stages">' + stages.map(function (s, i) {
            return '<li class="rep__stage" data-i="' + i + '"><span class="rep__mark" aria-hidden="true">' + CHECK + "</span>" +
              '<span class="rep__stage-text"><span class="rep__name"><span class="rep__label">' + esc(s.label) + "</span>" + UI.explain("stage-" + s.key, s.label) +
              '</span><span class="rep__when"></span></span></li>';
          }).join("") + "</ol>" +
          '<div class="rep__foot">' +
            '<div class="rep__actions"></div>' +
            '<button type="button" class="rep__toggle" aria-expanded="false" aria-controls="' + titleId + '-history">Stage history</button>' +
          "</div>" +
          '<div class="rep__history" id="' + titleId + '-history" hidden></div>';

        var q = function (sel) { return el.querySelector(sel); };
        var fill = q(".rep__fill"), track = q(".rep__track"), items = el.querySelectorAll(".rep__stage");
        var toggle = q(".rep__toggle"), history = q(".rep__history"), actions = q(".rep__actions");
        var actionsState = "";

        toggle.addEventListener("click", function () {
          var open = toggle.getAttribute("aria-expanded") !== "true";
          toggle.setAttribute("aria-expanded", String(open));
          history.hidden = !open;
        });

        function setActions(rep, justDelivered) {
          var state = rep.status === "delivered" ? "done" : "wait";
          if (state === actionsState) return;
          actionsState = state;
          if (state === "wait") {
            actions.innerHTML = '<p class="rep__wait">Downloads appear here when the report is delivered.</p>';
            return;
          }
          var f = rep.files || {};
          // Only the links the pipeline recorded (report_url); otherwise the
          // report is emailed.
          actions.innerHTML =
            (f.pdf ? '<a class="button button--ghost dash-cta" href="' + esc(f.pdf) + '"><span>Download PDF<span class="dash-sr"> for ' + esc(rep.token.name) + "</span></span>" + DOWNLOAD + "</a>" : "") +
            (f.docx ? '<a class="button button--ghost dash-cta" href="' + esc(f.docx) + '"><span>Download DOCX<span class="dash-sr"> for ' + esc(rep.token.name) + "</span></span>" + DOWNLOAD + "</a>" : "") +
            (f.view ? UI.cta(f.view, "View report<span class=\"dash-sr\"> for " + esc(rep.token.name) + "</span>") : '<p class="rep__wait">Delivered by email.</p>') +
            (justDelivered ? '<span class="rep__flash" aria-hidden="true">Report delivered</span>' : "");
        }

        function update(rep, prev) {
          var delivered = rep.status === "delivered";
          el.classList.toggle("is-delivered", delivered);
          q(".rep__status").textContent = delivered ? "Delivered" : "In progress";
          q(".rep__summary").textContent = rep.completedStages + " of " + rep.totalStages + " stages complete";
          q(".rep__pct").textContent = Math.floor(rep.percent) + "%";
          fill.style.transform = "scaleX(" + (rep.percent / 100).toFixed(4) + ")";
          if (!prev) requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-live"); }); });
          track.setAttribute("aria-valuenow", String(Math.floor(rep.percent)));
          var last = rep.history[rep.history.length - 1];
          q(".rep__eta").textContent = delivered
            ? "Delivered " + UI.date(last.completedAt)
            : "Estimated delivery: " + UI.date(rep.estimatedDelivery);

          var done = {};
          rep.history.forEach(function (h) { if (h.completedAt) done[h.stage] = h.completedAt; });
          Array.prototype.forEach.call(items, function (li, i) {
            var key = stages[i].key, w = li.querySelector(".rep__when");
            var state = done[key] ? "done" : i === rep.stageIndex && !delivered ? "current" : "todo";
            li.className = "rep__stage is-" + state;
            if (state === "current") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
            w.textContent = state === "done" ? when(done[key]) : state === "current" ? "In progress" : "";
          });

          history.innerHTML = '<table class="dash-table dash-table--simple rep__table"><caption class="dash-sr">' + esc(rep.token.name) +
            ' report stage history (UTC)</caption><thead><tr><th scope="col">Stage</th><th scope="col">Started</th><th scope="col">Completed</th></tr></thead><tbody>' +
            // Every stage has a row from the start, so the open history
            // keeps its height as stages finish.
            stages.map(function (s) {
              var h = rep.history.filter(function (x) { return x.stage === s.key; })[0];
              var none = '<span class="dash-muted">–</span>';
              return '<tr><th scope="row">' + esc(s.label) + "</th><td>" + (h ? UI.dateTime(h.startedAt) : none) + "</td><td>" +
                (h && h.completedAt ? UI.dateTime(h.completedAt) : h ? '<span class="dash-muted">In progress</span>' : none) + "</td></tr>";
            }).join("") + "</tbody></table>";

          setActions(rep, delivered && prev && prev.status !== "delivered");
        }

        return { el: el, update: update };
      }
    });
  }

  return { mount: mount };
})();
