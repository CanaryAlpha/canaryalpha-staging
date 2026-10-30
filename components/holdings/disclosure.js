/*
 * Disclosure line for report pages (not used anywhere yet). Reads
 * data/holdings.json through holdings-data.js; load that file first, plus
 * holdings.css for the style.
 *
 *   <p data-disclosure="BTC" data-name="Bitcoin"></p>
 *
 * becomes "Disclosure: Canary Alpha Research holds Bitcoin (BTC)." or
 * "... does not hold Bitcoin (BTC).", linking to the Company Holdings page.
 * A token missing from the file, or marked "not-held", reads "does not hold".
 * data-name is used when the token isn't in the file. If the file can't be
 * loaded, the line points to the Holdings page instead of guessing.
 *
 * CA_DISCLOSURE.render(element) fills one; every [data-disclosure] on the page
 * is filled automatically.
 */
window.CA_DISCLOSURE = (function () {
  var H = window.CA_HOLDINGS;

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render(el) {
    if (!H || !el) return;
    var ticker = String(el.getAttribute("data-disclosure") || "").trim().toUpperCase();
    var link = '<a href="' + esc(H.root + "holdings/") + '">Company Holdings</a>';
    el.classList.add("disclosure");
    H.load().then(function (d) {
      var h = d.byTicker[ticker];
      var name = (h && h.name) || el.getAttribute("data-name") || ticker;
      var token = name && name.toUpperCase() !== ticker ? esc(name) + " (" + esc(ticker) + ")" : esc(ticker);
      var held = h && h.status === "held";
      el.innerHTML = "<strong>Disclosure:</strong> Canary Alpha Research " + (held ? "holds " : "does not hold ") + token +
        ". See our " + link + " page.";
    }).catch(function () {
      el.innerHTML = "<strong>Disclosure:</strong> see our " + link + " page for the tokens we hold.";
    });
  }

  function all() { Array.prototype.forEach.call(document.querySelectorAll("[data-disclosure]"), render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all);
  else all();

  return { render: render };
})();
