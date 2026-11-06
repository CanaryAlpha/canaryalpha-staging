/*
 * Research reports for the /reports/ pages (item 407), read from the
 * research API (canaryalpha-api) on the server only.
 *
 * Tiers. Every request goes to the API at the reader's own tier
 * (plans.js apiTier: Free -> free, Pro -> pro, Enterprise -> institutional),
 * with the entitlement token minted in research.js; the API decides what
 * each tier gets. Bitcoin and Ethereum declare free: ["*"], so a Free member
 * gets them in full without any special case here.
 *
 * Free members see Bitcoin and Ethereum ONLY (coins.js FREE_SLUGS, the same
 * list the dashboard uses, dashboard.js allowed()): every other report is
 * a COUNT, never its name, ticker, logo, score or verdict, and its page is
 * refused before the API is asked (canRead), the same answer whether the
 * token exists or not, so a Free member can't probe which tokens we cover.
 *
 * Nothing from here reaches a browser as JSON. The pages render HTML, and a
 * logged-out visitor gets a redirect to /login/ before anything is fetched.
 *
 * Caching: each API answer is kept 10 minutes per tier in this function
 * instance (cache.js; if the API is down, the last good answer is served
 * for up to 20 minutes). A report published to the API shows here within
 * about 10 minutes, with no site deploy.
 */
import { research, SLUG } from "./research.js";
import { cached, MIN } from "./cache.js";
import { apiTier, hasTier } from "./plans.js";
import { FREE_SLUGS } from "./coins.js";

const TTL = 10 * MIN;

async function api(path, siteTier) {
  return cached("reports:" + apiTier(siteTier) + ":" + path, TTL, async () => {
    const r = await research(path, siteTier);
    if (r.status === 404) return { status: 404, body: null };
    if (r.status !== 200 || !r.body) throw new Error("research API " + r.status + " for " + path);
    return { status: 200, body: r.body };
  });
}

export { SLUG };

// May this plan open this report? Free: Bitcoin and Ethereum only.
export function canRead(slug, siteTier) {
  return hasTier(siteTier, "pro") || FREE_SLUGS.includes(slug);
}

/*
 * One report at this reader's tier, or null when the API has no such
 * report. { report, full, degraded }
 *   full      the API served the whole report (not the free-tier slice)
 *   degraded  a paid reader was served less than their plan (the
 *             entitlement secret is missing or doesn't match the API's)
 */
export async function reportFor(slug, siteTier) {
  const r = await api("/api/tokens/" + slug, siteTier);
  if (r.status === 404) return null;
  const report = r.body;
  const t = report._tier || {};
  const served = t.requested || "free";
  return {
    report,
    full: t.filtered === false,
    degraded: apiTier(siteTier) !== "free" && served === "free" && t.filtered !== false
  };
}

/*
 * The reports this plan may see, newest first by publication date, and
 * how many others there are: { items, hidden }. The index's fields are
 * all free-tier fields, so they are read at the free tier. Free: Bitcoin
 * and Ethereum, and the rest only as a number.
 */
export async function catalogue(siteTier) {
  const list = await api("/api/tokens", "free");
  const all = ((list.body && Array.isArray(list.body.tokens)) ? list.body.tokens : []).filter((t) => SLUG.test(t.slug || ""));
  const shown = all.filter((t) => canRead(t.slug, siteTier));
  const views = await Promise.all(shown.map(async (t) => {
    const r = await reportFor(t.slug, "free");
    return r && { slug: t.slug, report: r.report, fullOnFree: r.full };
  }));
  const when = (v) => Date.parse((v.report.web_meta || {}).published_at || "") || 0;
  return {
    items: views.filter(Boolean).sort((a, b) => when(b) - when(a) || a.slug.localeCompare(b.slug)),
    hidden: all.length - shown.length
  };
}

/* ---- The curated identity and market fields ------------------------------ */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v) => (str(v) && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

// Name, ticker, category and chains, from sections.identity (free tier).
export function identityOf(report, slug) {
  const id = (report.sections && report.sections.identity) || {};
  const w = report.web_meta || {};
  const chains = Array.isArray(id.chains) ? id.chains.filter(str) : Array.isArray(w.chains) ? w.chains.filter(str) : [];
  return {
    name: str(id.name) || str((w.seo_title || "").split(" (")[0]) || slug.toUpperCase(),
    ticker: str(id.ticker) || slug.toUpperCase(),
    category: str(id.category) || str(w.category),
    chains
  };
}

// The market snapshot taken for the report (free tier), only the fields
// every report states the same way. Missing or non-numeric values are left
// out rather than shown as zero.
export function marketOf(report) {
  const m = (report.sections && report.sections.market_snapshot) || {};
  const w = report.web_meta || {};
  const atl = num(m.atl_usd) != null ? { usd: num(m.atl_usd), date: day(m.atl_date) }
    : num(m.atl_series_usd) != null ? { usd: num(m.atl_series_usd), date: day(m.atl_series_date) } : null;
  return {
    asOf: day(m.as_of) || day(m.as_of_utc) || day(m.snapshot_utc) || day(m.retrieved_date) || day(w.report_date) || day(w.published_at),
    price: num(m.canonical_price_usd),
    marketCap: num(m.market_cap_usd),
    fdv: num(m.fdv_usd),
    circulatingSupply: num(m.circulating_supply),
    maxSupply: num(m.max_supply),
    ath: num(m.ath_usd) != null ? { usd: num(m.ath_usd), date: day(m.ath_date) } : null,
    atl
  };
}

// Publication dates, from the envelope every tier gets.
export function datesOf(report) {
  const w = report.web_meta || {};
  return {
    published: day(w.published_at) || day(w.first_published_at),
    updated: day(w.last_revised_at),
    reportDate: day(w.report_date),
    nextReview: day(w.revisit_date)
  };
}
