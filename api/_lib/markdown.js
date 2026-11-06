/*
 * A small Markdown reader for the research reports, run on the server
 * (api/_lib/report-html.js renders /reports/<slug>/ with it).
 * Safe by construction: every character of the source is HTML-escaped
 * first, and only these are turned back into markup: headings, rules,
 * lists, tables, paragraphs, **bold**, *italic*, `code` and links to
 * http(s) addresses or paths on this site.
 *
 *   render(text, { shift }) -> HTML string
 *   inline(text)            -> HTML string for one line (no blocks)
 *     shift: how many levels to push headings down (1: "#" becomes <h2>)
 */
const md = (function () {
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function inline(t) {
    return esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)"]+)\)/g, function (m, text, url) {
        var ext = /^https?:/.test(url);
        return '<a href="' + url + '"' + (ext ? ' rel="noopener noreferrer" target="_blank"' : "") + ">" + text + "</a>";
      });
  }

  function cells(row) {
    return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
  }

  function render(src, opts) {
    var shift = (opts && opts.shift) || 0;
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [], para = [], i = 0;
    function flush() {
      if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
    while (i < lines.length) {
      var line = lines[i];
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (!line.trim()) { flush(); i++; continue; }
      if (h) {
        flush();
        var level = Math.min(6, h[1].length + shift);
        out.push("<h" + level + ">" + inline(h[2].replace(/\s+#+\s*$/, "")) + "</h" + level + ">");
        i++; continue;
      }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push("<hr>"); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        flush();
        var head = cells(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        out.push('<div class="md-table"><table><thead><tr>' + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" + rows.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>");
        continue;
      }
      var li = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/.exec(line);
      if (li) {
        flush();
        var ordered = !!li[1];
        var items = [];
        while (i < lines.length) {
          var m = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/.exec(lines[i]);
          if (m && !!m[1] === ordered) { items.push(m[2]); i++; continue; }
          // A wrapped line continues the item above it.
          if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; continue; }
          break;
        }
        var tag = ordered ? "ol" : "ul";
        out.push("<" + tag + ">" + items.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</" + tag + ">");
        continue;
      }
      para.push(line.trim());
      i++;
    }
    flush();
    return out.join("\n");
  }

  return { render: render, inline: inline };
})();

export const render = md.render;
export const inline = md.inline;
