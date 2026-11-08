/*
 * HTML for the report pages (item 407): /reports/ and /reports/<slug>/,
 * rendered on the server from what reports.js fetched at the reader's tier.
 * Only what this tier was served is ever written into the page; the page
 * carries no report JSON and no token.
 *
 * Reports from the research API do not share one shape (agents wrote them
 * over several months), so a report body is drawn by one general renderer:
 * text is Markdown (markdown.js), a list of like records is a table, any
 * other object is a list of labelled fields. Keys starting with "_" are
 * the pipeline's own notes and are never shown, and neither are the
 * sections that only describe how a report was produced (HIDDEN_SECTIONS).
 *
 * The page frame (head, header, footer) matches the site's other pages;
 * the ?v= numbers below are kept equal to theirs (tests/reports.test.js).
 */
import { render as md, inline as mdInline } from "./markdown.js";
import { LOGOS } from "./logos.js";
import { isHeld } from "./holdings.js";
import { identityOf, marketOf, datesOf } from "./reports.js";

export const ASSET_VERSIONS = {
  "styles.css": 84,
  "components/site-header.css": 45,
  "components/dashboard/dashboard.css": 21,
  "components/members/members.css": 8,
  "components/site.config.js": 3,
  "components/site-mode.js": 2,
  "components/auth.js": 4,
  "components/site-links.js": 13,
  "components/site-header.js": 45,
  "components/site-footer.js": 1,
  "script.js": 41
};
const v = (f) => "/" + f + "?v=" + ASSET_VERSIONS[f];
const SITE = "https://canaryalpha.co";

export function esc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---- Formatting ---------------------------------------------------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function date(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? MONTHS[+m[2] - 1] + " " + (+m[3]) + ", " + m[1] : "";
}
function big(n) {
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + " trillion";
  if (a >= 1e9) return (n / 1e9).toFixed(2) + " billion";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + " million";
  return Math.round(n).toLocaleString("en-US");
}
export function usd(n) {
  if (n == null) return "";
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + big(n);
  if (a >= 1) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "$" + Number(n.toPrecision(4)).toString();
}
export function amount(n) { return n == null ? "" : big(n); }

/* ---- Page frame ---------------------------------------------------------- */

export function page({ title, description, canonical, body, back }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <!-- Members only: never indexed (item 407). -->
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Canary Alpha Research">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${SITE}/brand/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Canary Alpha Research: institutional-grade crypto research.">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg">
  <link rel="icon" type="image/png" sizes="512x512" href="/brand/favicon-512.png">
  <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
  <!-- Site fonts: Satoshi (headings and logo), Work Sans (body). -->
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&amp;display=swap">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&amp;display=swap">
  <link rel="stylesheet" href="${v("styles.css")}">
  <link rel="stylesheet" href="${v("components/site-header.css")}">
  <link rel="stylesheet" href="${v("components/dashboard/dashboard.css")}">
  <link rel="stylesheet" href="${v("components/members/members.css")}">
  <script src="${v("components/site.config.js")}"></script>
  <script src="${v("components/site-mode.js")}"></script>
  <script>
    (function () {
      try {
        var r = document.documentElement;
        var t = localStorage.getItem("ca-demo-theme");
        if (t === "night") { t = "dark"; localStorage.setItem("ca-demo-theme", t); }
        if (t === "light" || t === "dark") r.setAttribute("data-theme", t);
      } catch (e) {}
    })();
  </script>
  <script src="${v("components/auth.js")}"></script>
</head>
<body>
  <header class="site-header" data-site-header data-home="/" data-root="/"></header>
  <script src="${v("components/site-links.js")}"></script>
  <script src="${v("components/site-header.js")}"></script>
  <main class="members members--report">
    ${back ? `<p class="members__back"><a href="${esc(back.href)}">&larr; ${esc(back.label)}</a></p>` : ""}
${body}
  </main>
  <footer class="site-footer" data-site-footer data-root="/">
    <p class="site-footer__disclaimer">Canary Alpha Research LLC provides research for informational purposes only, not investment advice. Crypto assets are high risk. <a href="/disclaimer/">Read our disclaimer.</a></p>
  </footer>
  <script src="${v("components/site-footer.js")}"></script>
  <script src="${v("script.js")}"></script>
</body>
</html>
`;
}

/* ---- Pieces shared by the index and the report --------------------------- */

const LOGO_PX = { md: 40, lg: 56 };
export function logo(slug, ticker, size) {
  const cls = "dash-logo dash-logo--" + size;
  const base = LOGOS[slug];
  if (!base) return `<span class="${cls}" aria-hidden="true">${esc(String(ticker).slice(0, 2))}</span>`;
  const px = LOGO_PX[size] || 40, b = "/" + base;
  const set = (ext) => `${b}-64.${ext} 64w, ${b}-128.${ext} 128w`;
  return `<picture class="${cls} dash-logo--img report-logo"><source type="image/webp" srcset="${set("webp")}" sizes="${px}px">` +
    `<img src="${b}-128.png" srcset="${set("png")}" sizes="${px}px" width="${px}" height="${px}" alt="" decoding="async"></picture>`;
}

export function verdictClass(decision) {
  const d = String(decision || "").toLowerCase();
  if (/avoid/.test(d)) return "avoid";
  if (/watch/.test(d)) return "watch";
  if (/hold|dca/.test(d)) return "hold";
  if (/deploy|buy|accumulate/.test(d)) return "deploy";
  return "watch";
}

function ratingLine(h) {
  const score = typeof h.rating === "number" ? h.rating : null;
  return `<p class="reports__rating">` +
    (h.decision ? `<span class="verdict verdict--${verdictClass(h.decision)}">${esc(h.decision)}</span>` : "") +
    (score != null ? ` <span class="reports__score">${esc(score)}/10</span>` : "") +
    (h.risk_tier ? ` <span class="reports__risk">Risk: ${esc(h.risk_tier)}</span>` : "") + `</p>`;
}

// The rating's qualifiers. canaryalpha-api binds them to the verdict
// (JC-12: a label close to a band boundary is never shown without its
// margin), so they appear wherever the verdict does: the statement's
// opening sentences (which state the margin) in plain view under the
// verdict, the rest and the facts one click away.
export function lead(text) {
  const parts = String(text).trim().split(/(?<=[.!?])\s+(?=[A-Z])/);
  let out = "";
  for (const p of parts) {
    out += (out ? " " : "") + p;
    if (out.length >= 160 || out.split(/(?<=[.!?])\s+(?=[A-Z])/).length >= 3) break;
  }
  return out;
}
function stability(h) {
  const s = h.decision_stability_statement;
  if (typeof s !== "string" || !s.trim()) return "";
  const facts = h.decision_stability_jc15_facts;
  return `<p class="report__margin">${mdInline(lead(s))}</p>` +
    `<details class="report__why"><summary>Why this rating is close to the line</summary>` +
    `<div class="report__doc">${md(s)}${facts ? value(facts, 2) : ""}</div></details>`;
}

function disclosure(name, ticker) {
  const link = '<a href="/holdings/">Company Holdings</a>';
  const held = isHeld(ticker);
  const token = name && name.toUpperCase() !== ticker ? esc(name) + " (" + esc(ticker) + ")" : esc(ticker);
  if (held == null) return `<p class="disclosure"><strong>Disclosure:</strong> see our ${link} page for the tokens we hold.</p>`;
  return `<p class="disclosure"><strong>Disclosure:</strong> Canary Alpha Research ${held ? "holds" : "does not hold"} ${token}. See our ${link} page.</p>`;
}

const ADVICE = '<p class="report__disclaimer">Research for information only, not investment advice. <a href="/disclaimer/">Read our disclaimer.</a></p>';

function proPanel(paidPlans, heading = "The full report is part of Pro") {
  return `<section class="members__section report__locked" aria-labelledby="locked-title">
      <h2 class="members__h2" id="locked-title">${heading}</h2>
      <p>Pro includes every report we publish, with the full analysis behind each rating: tokenomics, team, on-chain data, whale-wallet forensics, the trading plan and what we&rsquo;re watching next.</p>
      <p>${paidPlans
        ? '<a class="members__button" href="/account/">Upgrade to Pro</a>'
        : '<a class="members__button" href="/waitlist/?plan=pro">Coming soon. Join the list</a>'}</p>
    </section>`;
}

/* ---- /reports/ ----------------------------------------------------------- */

// A report the Free plan doesn't include: no name, no ticker, no logo, no
// score (the dashboard's locked row, components/dashboard/dashboard-assets.js).
const LOCK = '<svg class="dash-lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function lockedItem() {
  return `<li class="reports__item report-card report-card--locked">
        <div class="report-card__id"><span class="dash-logo dash-logo--md" aria-hidden="true">${LOCK}</span>
          <div><h2 class="reports__name">Token hidden <span class="reports__ticker">Pro</span></h2>
          <p class="reports__meta report-card__cat">Researched token &middot; included with Pro</p></div>
        </div>
      </li>`;
}

export function indexPage({ items, hidden = 0, tier, paidPlans }) {
  const paid = tier === "pro" || tier === "enterprise";
  const rows = items.map(({ slug, report, fullOnFree }) => {
    const id = identityOf(report, slug), h = report.headline || {}, d = datesOf(report), m = marketOf(report);
    const open = paid || fullOnFree;
    const href = "/reports/" + encodeURIComponent(slug) + "/";
    const market = [m.price != null ? "price " + usd(m.price) : "", m.marketCap != null ? "market cap " + usd(m.marketCap) : ""].filter(Boolean);
    return `<li class="reports__item report-card${open ? "" : " is-locked"}">
        <div class="report-card__id">${logo(slug, id.ticker, "md")}
          <div><h2 class="reports__name"><a href="${href}">${esc(id.name)}</a> <span class="reports__ticker">${esc(id.ticker)}</span></h2>
          ${id.category ? `<p class="reports__meta report-card__cat">${esc(id.category)}</p>` : ""}</div>
        </div>
        ${ratingLine(h)}
        ${h.one_line_thesis ? `<p class="reports__thesis">${esc(h.one_line_thesis)}</p>` : ""}
        <p class="reports__meta">${d.published ? "Report date " + esc(date(d.published)) : ""}${d.updated && d.updated !== d.published ? " &middot; Updated " + esc(date(d.updated)) : ""}${market.length ? (d.published ? " &middot; " : "") + "At the report date: " + esc(market.join(", ")) : ""}</p>
        ${stability(h)}
        <p class="${open ? "reports__open" : "reports__lock"}">${open
          ? `<a href="${href}">Read the report &rarr;</a>`
          : `<a href="${href}">Summary</a> &middot; the full report is part of Pro`}</p>
      </li>`;
  }).join("\n");
  const locked = paid ? "" : Array.from({ length: hidden }, lockedItem).join("\n");
  const body = `    <header class="members__head">
      <h1 class="members__title">Reports</h1>
      <p class="members__sub">${paid
        ? "Every token we research, newest first. Your plan includes every full report."
        : `Bitcoin and Ethereum are free in full.${hidden ? ` ${hidden === 1 ? "One more report is" : hidden + " more reports are"} part of Pro.` : ""}`}</p>
    </header>
    ${items.length || locked ? `<ol class="reports report-list">\n${rows}${locked ? "\n" + locked : ""}\n    </ol>` : '<p class="members__muted">No reports are available right now. Please try again shortly.</p>'}
    ${!paid && hidden ? proPanel(paidPlans, "Every other report is part of Pro") : ""}
    ${ADVICE}`;
  return page({
    title: "Reports — Canary Alpha Research",
    description: "Canary Alpha Research reports: every token we research, newest first.",
    canonical: SITE + "/reports/",
    body,
    back: { href: "/dashboard/", label: "Dashboard" }
  });
}

/* ---- /reports/<slug>/ ---------------------------------------------------- */

const HIDDEN_SECTIONS = new Set([
  // shown in the header, curated
  "identity", "market_snapshot",
  // drawn separately below
  "executive_summary", "summary_document", "narrative_sections", "narrative_long_form",
  // how the report was produced, not research
  "design_system", "report_meta"
]);
const SECTION_ORDER = [
  "ratings_breakdown", "thesis", "trading_strategy", "revisit_scorecard", "tokenomics_summary", "team", "audits",
  "product", "revenue", "competitors", "ecosystem", "on_chain_metrics", "whale_forensics_summary", "whale_forensics_full",
  "follow_up_actions", "executive_summary_note", "research_sources", "research_gaps"
];
const TITLES = {
  executive_summary: "Executive summary", summary_document: "Summary document", ratings_breakdown: "Ratings breakdown",
  thesis: "Investment thesis", trading_strategy: "Trading strategy", revisit_scorecard: "Revisit scorecard",
  tokenomics_summary: "Tokenomics", team: "Team", audits: "Audits", ecosystem: "Ecosystem", product: "Product",
  revenue: "Revenue", competitors: "Competitors", on_chain_metrics: "On-chain metrics",
  whale_forensics_summary: "Whale-wallet forensics: summary", whale_forensics_full: "Whale-wallet forensics: full analysis",
  follow_up_actions: "What we're watching next", executive_summary_note: "A note on the rating",
  research_sources: "Sources", research_gaps: "Open questions and data gaps", ten_questions: "Ten questions",
  whitepaper_technical_documentation_summary: "Whitepaper and technical documentation",
  whitepaper_technical_summary: "Whitepaper and technical documentation",
  whitepaper_and_technical_summary: "Whitepaper and technical documentation",
  blog_post_summaries: "What the team has published", blog_summary: "What the team has published",
  follow_up_monitoring: "What we're watching next", monitoring_actions: "What we're monitoring",
  summary_and_key_notes: "Summary and key notes", revision_history: "Revision history"
};
const WORDS = {
  usd: "USD", ath: "ATH", atl: "ATL", fdv: "FDV", tvl: "TVL", dao: "DAO", api: "API", utc: "UTC", id: "ID", url: "URL",
  evm: "EVM", cex: "CEX", dex: "DEX", apy: "APY", apr: "APR", eth: "ETH", btc: "BTC", l1: "L1", l2: "L2", tge: "TGE",
  oft: "OFT", rpc: "RPC", ico: "ICO", kyc: "KYC", nft: "NFT", pct: "%", cmc: "CMC", pdf: "PDF", csv: "CSV", jc15: "JC-15"
};
export function label(key) {
  if (TITLES[key]) return TITLES[key];
  const words = String(key).replace(/^\d+[_\s-]*/, "").split(/[_\s]+/).filter(Boolean)
    .map((w) => WORDS[w.toLowerCase()] || w.toLowerCase());
  const s = words.join(" ");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(key);
}

const isEmpty = (x) => x == null || x === "" || (Array.isArray(x) && !x.length) ||
  (typeof x === "object" && !Array.isArray(x) && !Object.keys(x).some((k) => !k.startsWith("_")));
const isScalar = (x) => x == null || ["string", "number", "boolean"].includes(typeof x);
const shown = (o) => Object.keys(o).filter((k) => !k.startsWith("_") && !isEmpty(o[k]));

function scalar(x) {
  if (typeof x === "number") return esc(Number.isInteger(x) ? x.toLocaleString("en-US") : String(x));
  if (typeof x === "boolean") return x ? "Yes" : "No";
  return mdInline(String(x));
}

// Any value from a report, as HTML. depth: how deep in the report this is
// (headings are pushed down to match; very deep structure is cut off).
export function value(x, depth) {
  if (isEmpty(x) || depth > 7) return "";
  if (typeof x === "string") return x.includes("\n") || x.length > 160 ? md(x, { shift: Math.min(depth + 2, 4) }) : `<p>${mdInline(x)}</p>`;
  if (isScalar(x)) return `<p>${scalar(x)}</p>`;
  if (Array.isArray(x)) return list(x, depth);
  return object(x, depth);
}

function object(o, depth) {
  const keys = shown(o);
  if (!keys.length) return "";
  if (depth === 0) {
    return keys.map((k) => `<section class="rv-part"><h3>${esc(label(k))}</h3>${value(o[k], depth + 1)}</section>`).join("");
  }
  return `<dl class="rv">${keys.map((k) => `<dt>${esc(label(k))}</dt><dd>${value(o[k], depth + 1)}</dd>`).join("")}</dl>`;
}

function list(a, depth) {
  const items = a.filter((x) => !isEmpty(x));
  if (!items.length) return "";
  if (items.every(isScalar)) return `<ul>${items.map((x) => `<li>${scalar(x)}</li>`).join("")}</ul>`;
  const records = items.every((x) => x && typeof x === "object" && !Array.isArray(x));
  if (records) {
    const cols = [];
    for (const r of items) for (const k of shown(r)) if (!cols.includes(k)) cols.push(k);
    const flat = items.every((r) => shown(r).every((k) => isScalar(r[k])));
    const short = items.every((r) => shown(r).every((k) => typeof r[k] !== "string" || r[k].length <= 400));
    if (flat && short && cols.length && cols.length <= 7) {
      return `<div class="md-table"><table><thead><tr>${cols.map((c) => `<th>${esc(label(c))}</th>`).join("")}</tr></thead><tbody>` +
        items.map((r) => `<tr>${cols.map((c) => `<td>${isEmpty(r[c]) ? "" : scalar(r[c])}</td>`).join("")}</tr>`).join("") +
        "</tbody></table></div>";
    }
  }
  return `<ol class="rv-list">${items.map((x) => `<li>${value(x, depth + 1)}</li>`).join("")}</ol>`;
}

function fold(key, title, inner, open) {
  if (!inner) return "";
  return `<details class="report__more" id="${esc(key)}"${open ? " open" : ""}><summary>${esc(title)}</summary><div class="report__doc rv-section">${inner}</div></details>`;
}

function marketBlock(m) {
  const rows = [
    ["Price", m.price != null && usd(m.price)],
    ["Market cap", m.marketCap != null && usd(m.marketCap)],
    ["Fully diluted value", m.fdv != null && usd(m.fdv)],
    ["Circulating supply", m.circulatingSupply != null && amount(m.circulatingSupply)],
    ["Maximum supply", m.maxSupply != null && amount(m.maxSupply)],
    ["All-time high", m.ath && usd(m.ath.usd) + (m.ath.date ? " (" + date(m.ath.date) + ")" : "")],
    ["All-time low", m.atl && usd(m.atl.usd) + (m.atl.date ? " (" + date(m.atl.date) + ")" : "")]
  ].filter((r) => r[1]);
  if (!rows.length) return "";
  return `<section class="report-market" aria-labelledby="market-title">
      <h2 class="report-market__title" id="market-title">At the report date${m.asOf ? ", " + esc(date(m.asOf)) : ""}</h2>
      <dl class="report-market__grid">${rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>
    </section>`;
}

function body(report, slug) {
  const s = report.sections || {};
  let html = "";
  if (typeof s.executive_summary === "string" && s.executive_summary.trim()) {
    html += `<section class="members__section" aria-labelledby="summary-title"><h2 class="members__h2" id="summary-title">Executive summary</h2><div class="report__doc">${md(s.executive_summary, { shift: 2 })}</div></section>`;
  }
  const parts = [];
  const doc = s.summary_document;
  if (doc) parts.push(fold("summary_document", TITLES.summary_document,
    typeof doc === "string" ? md(doc, { shift: 2 }) : (typeof doc.document === "string" ? md(doc.document, { shift: 2 }) : value(doc, 0))));
  const narrative = s.narrative_sections || s.narrative_long_form;
  if (narrative && typeof narrative === "object") {
    for (const k of shown(narrative)) {
      if (k === "executive_summary" && narrative[k] === s.executive_summary) continue;
      parts.push(fold("n-" + k, label(k), typeof narrative[k] === "string" ? md(narrative[k], { shift: 2 }) : value(narrative[k], 0)));
    }
  }
  const rest = Object.keys(s).filter((k) => !k.startsWith("_") && !HIDDEN_SECTIONS.has(k));
  rest.sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a), ib = SECTION_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  for (const k of rest) parts.push(fold(k, label(k), value(s[k], 0)));
  if (Array.isArray(report.revision_history) && report.revision_history.length) {
    parts.push(fold("revision_history", TITLES.revision_history, value(report.revision_history, 1)));
  }
  const folded = parts.filter(Boolean).join("\n");
  if (folded) html += `<section class="members__section" aria-labelledby="full-title"><h2 class="members__h2" id="full-title">The full report</h2>${folded}</section>`;
  return html;
}

export function reportPage({ slug, view, tier, paidPlans, downloads }) {
  const { report, full, degraded } = view;
  const id = identityOf(report, slug), h = report.headline || {}, d = datesOf(report), m = marketOf(report);
  const w = report.web_meta || {};
  const dates = [
    d.published && "Published " + date(d.published),
    d.updated && d.updated !== d.published && "Last updated " + date(d.updated),
    d.reportDate && d.reportDate !== d.published && "Report date " + date(d.reportDate),
    d.nextReview && "Next review " + date(d.nextReview)
  ].filter(Boolean);
  const basis = h.risk_tier_basis;
  const head = `    <header class="members__head report__head">
      <div class="report-head__id">${logo(slug, id.ticker, "lg")}
        <div><h1 class="members__title">${esc(id.name)} <span class="reports__ticker">${esc(id.ticker)}</span></h1>
        ${id.category || id.chains.length ? `<p class="reports__meta">${esc([id.category, id.chains.join(", ")].filter(Boolean).join(" · "))}</p>` : ""}</div>
      </div>
      ${ratingLine(h)}
      ${h.one_line_thesis ? `<p class="report__thesis">${esc(h.one_line_thesis)}</p>` : ""}
      ${dates.length ? `<p class="reports__meta">${esc(dates.join(" · "))}</p>` : ""}
      ${disclosure(id.name, id.ticker)}
      ${stability(h)}
      ${typeof basis === "string" && basis.trim() ? `<details class="report__why"><summary>Why this risk tier</summary><div class="report__doc">${md(basis)}</div></details>` : ""}
    </header>
    ${marketBlock(m)}`;
  const notice = degraded ? '<p class="members__notice">Part of this report couldn&rsquo;t be loaded just now. Please try again later.</p>' : "";
  const files = full && downloads ? downloadsBlock(slug, tier, downloads) : "";
  const html = head + "\n" + notice + (full ? body(report, slug) + files : proPanel(paidPlans)) + "\n    " + ADVICE;
  return page({
    title: (str(w.seo_title) || id.name + " (" + id.ticker + ") research report") + " — Canary Alpha Research",
    description: str(w.seo_description) || str(h.one_line_thesis) || "A Canary Alpha Research report.",
    canonical: SITE + "/reports/" + slug + "/",
    body: html,
    back: { href: "/reports/", label: "All reports" }
  });
}
const str = (x) => (typeof x === "string" && x.trim() ? x.trim() : "");

// The download links the API signs for this tier (unchanged from the old
// members' report page; item 128 owns what a plan may download).
function downloadsBlock(slug, tier, d) {
  const items = (d.documents || []).map((doc) => `<li><a href="${esc(doc.url)}" rel="noopener">${esc(doc.label || doc.role || "Document")}` +
    `${doc.format ? " (" + esc(String(doc.format).toUpperCase()) + ")" : ""}</a></li>`);
  if (tier === "enterprise") items.push(`<li><a href="/api/research/report/?slug=${encodeURIComponent(slug)}" download="${esc(slug)}-canary-alpha-research.json">Full research data (JSON)</a></li>`);
  if (!items.length) return "";
  return `<section class="members__section" aria-labelledby="files-title"><h2 class="members__h2" id="files-title">Downloads</h2><ul class="report__files">${items.join("")}</ul>` +
    ((d.documents || []).length ? '<p class="members__muted">Download links expire after a few minutes; reload the page for new ones.</p>' : "") + "</section>";
}

/* ---- A report this plan doesn't include ---------------------------------- */

// Free members asking for any report but Bitcoin's or Ethereum's: the same
// page whether the report exists or not, naming nothing.
export function lockedPage({ paidPlans }) {
  return page({
    title: "Pro report — Canary Alpha Research",
    description: "This report is part of Pro.",
    canonical: SITE + "/reports/",
    body: `    <header class="members__head"><h1 class="members__title">This report is part of Pro</h1>
      <p class="members__sub">Your Free plan includes the full Bitcoin and Ethereum reports.</p></header>
    ${proPanel(paidPlans)}
    ${ADVICE}`,
    back: { href: "/reports/", label: "All reports" }
  });
}

/* ---- Errors -------------------------------------------------------------- */

export function messagePage({ title, text }) {
  return page({
    title: title + " — Canary Alpha Research",
    description: text,
    canonical: SITE + "/reports/",
    body: `    <header class="members__head"><h1 class="members__title">${esc(title)}</h1><p class="members__sub">${esc(text)}</p></header>
    <p><a class="members__button" href="/reports/">All reports</a></p>`,
    back: { href: "/dashboard/", label: "Dashboard" }
  });
}
