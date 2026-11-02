/*
 * Market data, fetched on the server only and cached (cache.js).
 *
 * Sources (free; no source is relied on alone where a second one exists):
 *   CoinMarketCap API (CMC_API_KEY)  prices, market cap, volume, % changes,
 *     12 months of daily history, about/website/whitepaper, Fear & Greed
 *   CoinGecko public API             all-time high/low with dates, markets
 *   CoinPaprika public API           all-time high (cross-check), markets
 *   alternative.me                   Fear & Greed (with history)
 *   Bitbo + CoinMarketCap ETF data   spot ETF net flows (median per day)
 *   Bitstamp + Kraken public OHLC    long BTC price history (Rainbow, Puell)
 *   mempool.space                    block heights (Puell: coins mined/day)
 *   Cointelegraph, Decrypt, The Block RSS  news headlines and links only
 *
 * Every function returns plain data or null (a source that fails is left
 * out, never replaced with made-up numbers). Dollar changes come from
 * usdChanges(), one function, so $ and % always agree.
 */
import { cached, quiet, MIN, HOUR } from "./cache.js";
import { COINS } from "./coins.js";

const UA = "CanaryAlphaResearch/1.0 (+https://canaryalpha.co)";
const DAY = 24 * HOUR;

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA, ...headers } });
  if (!r.ok) throw new Error(new URL(url).host + " " + r.status);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(new URL(url).host + " " + r.status);
  return r.text();
}
function cmc(path) {
  return getJson("https://pro-api.coinmarketcap.com" + path, { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY || "" });
}
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
function median(xs) {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ---- Dollar change from % change ------------------------------------------ */
// The value then was now / (1 + pct/100); the change is the difference.
export function usdChanges(now, pcts) {
  const out = {};
  for (const k of Object.keys(pcts || {})) {
    const p = pcts[k];
    out[k] = Number.isFinite(now) && Number.isFinite(p) && p > -100 ? now - now / (1 + p / 100) : null;
  }
  return out;
}
const pct = (now, then) => (Number.isFinite(now) && Number.isFinite(then) && then > 0 ? (now / then - 1) * 100 : null);

/* ---- CoinMarketCap: latest quotes for every mapped coin -------------------- */
export function quotes() {
  const ids = Object.values(COINS).map((c) => c.cmc).filter(Boolean);
  return cached("cmc:quotes", 5 * MIN, async () => {
    const d = await cmc("/v2/cryptocurrency/quotes/latest?id=" + ids.join(","));
    const out = {};
    for (const [slug, c] of Object.entries(COINS)) {
      const row = c.cmc && d.data[String(c.cmc)];
      if (!row) continue;
      const q = row.quote.USD;
      out[slug] = {
        price: q.price, marketCap: q.market_cap, volume24h: q.volume_24h,
        circulatingSupply: row.circulating_supply,
        priceChange: { h1: q.percent_change_1h, h24: q.percent_change_24h, d7: q.percent_change_7d, d30: q.percent_change_30d, d90: q.percent_change_90d },
        volumeChange24h: q.volume_change_24h,
        updated: q.last_updated
      };
    }
    return { at: new Date().toISOString(), coins: out };
  });
}

/* ---- CoinMarketCap: 12 months of daily history (1y and market cap/volume
   changes), and 7 days at 4-hour steps (sparkline) ------------------------- */
function history(slug) {
  const id = COINS[slug] && COINS[slug].cmc;
  if (!id) return Promise.resolve(null);
  return cached("cmc:hist:" + slug, 12 * HOUR, async () => {
    // The free plan reaches back 12 months; start a day inside that.
    const start = new Date(Date.now() - 364 * DAY).toISOString().slice(0, 10);
    const d = await cmc("/v1/cryptocurrency/quotes/historical?id=" + id + "&interval=daily&count=400&time_start=" + start);
    return (d.data.quotes || []).map((x) => ({ t: x.timestamp, price: x.quote.USD.price, marketCap: x.quote.USD.market_cap, volume: x.quote.USD.volume_24h }));
  });
}
function spark(slug) {
  const id = COINS[slug] && COINS[slug].cmc;
  if (!id) return Promise.resolve(null);
  return cached("cmc:spark:" + slug, 2 * HOUR, async () => {
    const start = new Date(Date.now() - 7 * DAY).toISOString();
    const d = await cmc("/v1/cryptocurrency/quotes/historical?id=" + id + "&interval=4h&count=42&time_start=" + start);
    return (d.data.quotes || []).map((x) => x.quote.USD.price);
  });
}
// Value of a series n days before its last point (nearest point at or before).
function ago(series, key, days) {
  if (!series || !series.length) return null;
  const target = Date.parse(series[series.length - 1].t) - days * DAY;
  let best = null;
  for (const p of series) if (Date.parse(p.t) <= target + 12 * HOUR) best = p;
  // The free plan's history starts just under a year back: for 1y, accept
  // the first point if it is within 3 days of the target.
  if (!best && Date.parse(series[0].t) - target <= 3 * DAY) best = series[0];
  return best ? best[key] : null;
}

/* ---- Info: about, website, whitepaper -------------------------------------- */
function info() {
  const ids = Object.values(COINS).map((c) => c.cmc).filter(Boolean);
  return cached("cmc:info", 24 * HOUR, async () => {
    const d = await cmc("/v2/cryptocurrency/info?id=" + ids.join(","));
    const out = {};
    for (const [slug, c] of Object.entries(COINS)) {
      const row = c.cmc && d.data[String(c.cmc)];
      if (!row) continue;
      out[slug] = {
        about: row.description || "",
        website: (row.urls.website || [])[0] || null,
        whitepaper: (row.urls.technical_doc || [])[0] || null
      };
    }
    return out;
  });
}

/* ---- All-time high/low: CoinGecko, checked against CoinPaprika ------------- */
function geckoCoin(slug) {
  const id = COINS[slug] && COINS[slug].gecko;
  if (!id) return Promise.resolve(null);
  return cached("gecko:coin:" + slug, 6 * HOUR, () =>
    getJson("https://api.coingecko.com/api/v3/coins/" + id + "?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false"));
}
function paprikaTicker(slug) {
  const id = COINS[slug] && COINS[slug].paprika;
  if (!id) return Promise.resolve(null);
  return cached("paprika:ticker:" + slug, 6 * HOUR, () => getJson("https://api.coinpaprika.com/v1/tickers/" + id));
}
async function extremes(slug) {
  const [g, p] = await Promise.all([quiet(() => geckoCoin(slug)), quiet(() => paprikaTicker(slug))]);
  const gm = g && g.market_data;
  const gAth = gm && gm.ath && gm.ath.usd, gAthDate = gm && gm.ath_date && gm.ath_date.usd;
  const pAth = p && p.quotes && p.quotes.USD && p.quotes.USD.ath_price, pAthDate = p && p.quotes && p.quotes.USD.ath_date;
  let ath = null;
  if (Number.isFinite(gAth) || Number.isFinite(pAth)) {
    // Both agree within 1%: use CoinGecko's figure (it also has the low);
    // otherwise the higher of the two, since an all-time high only grows.
    const agree = Number.isFinite(gAth) && Number.isFinite(pAth) && Math.abs(gAth / pAth - 1) < 0.01;
    const useG = Number.isFinite(gAth) && (!Number.isFinite(pAth) || agree || gAth >= pAth);
    ath = { price: useG ? gAth : pAth, date: isoDay(useG ? gAthDate : pAthDate), sources: [gAth && "CoinGecko", pAth && "CoinPaprika"].filter(Boolean), agree };
  }
  const atl = gm && Number.isFinite(gm.atl && gm.atl.usd) ? { price: gm.atl.usd, date: isoDay(gm.atl_date.usd), sources: ["CoinGecko"] } : null;
  return { ath, atl };
}

/* ---- Top 10 exchanges: CoinGecko and CoinPaprika markets, merged ----------- */
function geckoTickers(slug) {
  const id = COINS[slug] && COINS[slug].gecko;
  if (!id) return Promise.resolve(null);
  return cached("gecko:tickers:" + slug, 6 * HOUR, () =>
    getJson("https://api.coingecko.com/api/v3/coins/" + id + "/tickers?order=trust_score_desc&include_exchange_logo=false"));
}
function paprikaMarkets(slug) {
  const id = COINS[slug] && COINS[slug].paprika;
  if (!id) return Promise.resolve(null);
  return cached("paprika:markets:" + slug, 6 * HOUR, () => getJson("https://api.coinpaprika.com/v1/coins/" + id + "/markets?quotes=USD"));
}
const exKey = (name) => String(name || "").toLowerCase().replace(/\.(com|io|us)$/, "").replace(/[^a-z0-9]/g, "").replace(/(exchange|global|pro)$/, "");
async function exchanges(slug) {
  const [g, p] = await Promise.all([quiet(() => geckoTickers(slug)), quiet(() => paprikaMarkets(slug))]);
  const byEx = new Map();
  function add(name, pair, url, vol, source) {
    if (!name || !Number.isFinite(vol) || vol <= 0) return;
    const k = exKey(name);
    const e = byEx.get(k) || { exchange: name, pair, url, volume: 0, best: 0, sources: new Set() };
    if (vol > e.best) { e.best = vol; e.pair = pair; if (url) e.url = url; }
    e.volume = Math.max(e.volume, vol);
    e.sources.add(source);
    byEx.set(k, e);
  }
  // Only spot markets that a source rates as trustworthy (CoinGecko
  // "green", CoinPaprika "high"), so exchanges with inflated volume don't
  // top the list. Either source alone is enough, so one being rate-limited
  // still leaves a list.
  for (const t of (g && g.tickers) || []) {
    if (t.is_anomaly || t.is_stale || t.trust_score !== "green") continue;
    add(t.market && t.market.name, t.base + "/" + t.target, t.trade_url, t.converted_volume && t.converted_volume.usd, "CoinGecko");
  }
  for (const m of p || []) {
    if (m.outlier || m.category !== "Spot" || m.trust_score !== "high") continue;
    add(m.exchange_name, m.pair, m.market_url, m.quotes && m.quotes.USD && m.quotes.USD.volume_24h, "CoinPaprika");
  }
  return [...byEx.values()]
    .sort((a, b) => b.sources.size - a.sources.size || b.volume - a.volume)
    .slice(0, 10)
    .sort((a, b) => b.volume - a.volume)
    .map((e, i) => ({ rank: i + 1, exchange: e.exchange, pair: e.pair, url: /^https:\/\//.test(e.url || "") ? e.url : null, volume24h: e.volume, sources: [...e.sources] }));
}

/* ---- News: headlines and links from public publisher feeds ----------------- */
const FEEDS = [
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" }
];
function decode(s) {
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}
function feed(f) {
  return cached("rss:" + f.source, 20 * MIN, async () => {
    const xml = await getText(f.url);
    return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map((m) => {
      const it = m[0];
      const tag = (t) => { const x = it.match(new RegExp("<" + t + "[^>]*>([\\s\\S]*?)</" + t + ">")); return x ? decode(x[1]) : ""; };
      return { headline: tag("title"), url: tag("link"), date: new Date(tag("pubDate") || Date.now()).toISOString(), source: f.source };
    }).filter((n) => n.headline && /^https:\/\//.test(n.url));
  });
}
async function news(name, ticker) {
  const all = (await Promise.all(FEEDS.map((f) => quiet(() => feed(f))))).flat().filter(Boolean);
  const words = [name, ticker].filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp("\\b(" + words.join("|") + ")\\b", ticker && ticker.length <= 3 ? "" : "i");
  const seen = new Set();
  return all.filter((n) => re.test(n.headline))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((n) => { const k = n.headline.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6);
}

/* ---- Fear & Greed: alternative.me (history), CoinMarketCap (cross-check) --- */
export const FEAR_GREED_BANDS = [
  { max: 24, label: "Extreme Fear" }, { max: 44, label: "Fear" }, { max: 55, label: "Neutral" },
  { max: 75, label: "Greed" }, { max: null, label: "Extreme Greed" }
];
const bandOf = (bands, v) => (bands.find((b) => b.max == null || v <= b.max) || bands[bands.length - 1]).label;
export function fearGreed() {
  return cached("fng", 30 * MIN, async () => {
    const [alt, cmcF] = await Promise.all([
      quiet(() => getJson("https://api.alternative.me/fng/?limit=31")),
      quiet(() => cmc("/v3/fear-and-greed/latest"))
    ]);
    const days = alt && alt.data ? alt.data.map((d) => +d.value) : null;
    if (!days || !days.length) return null;
    const point = (v) => (Number.isFinite(v) ? { value: v, label: bandOf(FEAR_GREED_BANDS, v) } : null);
    return {
      value: days[0], label: bandOf(FEAR_GREED_BANDS, days[0]),
      yesterday: point(days[1]), lastWeek: point(days[7]), lastMonth: point(days[30]),
      bands: FEAR_GREED_BANDS,
      crossCheck: cmcF && cmcF.data ? { source: "CoinMarketCap", value: Math.round(cmcF.data.value) } : null,
      source: "alternative.me"
    };
  });
}

/* ---- Spot ETF flows: median of the sources for each day -------------------- */
async function bitboBtc() {
  const html = await getText("https://bitbo.io/treasuries/etf-flows/");
  const t = html.slice(html.indexOf("stats-table"));
  const out = {};
  for (const r of t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => decode(c[1]));
    if (cells.length < 3) continue;
    const when = Date.parse(cells[0] + " UTC"), total = parseFloat(cells[cells.length - 1].replace(/,/g, ""));
    if (Number.isFinite(when) && Number.isFinite(total)) out[isoDay(when)] = total * 1e6;   // table is in $ millions
  }
  return out;
}
async function cmcEtf(category) {
  const d = await getJson("https://api.coinmarketcap.com/data-api/v3/etf/overview/netflow/chart?category=" + category + "&range=30d");
  const out = {};
  for (const p of d.data.points || []) out[isoDay(+p.timestamp)] = p.value;
  return out;
}
export function etfFlows() {
  return cached("etf", 2 * HOUR, async () => {
    const [bb, cb, ce] = await Promise.all([quiet(bitboBtc), quiet(() => cmcEtf("btc")), quiet(() => cmcEtf("eth"))]);
    function merge(label, named) {
      const srcs = named.filter((s) => s.data && Object.keys(s.data).length);
      if (!srcs.length) return null;
      const dates = [...new Set(srcs.flatMap((s) => Object.keys(s.data)))].sort().slice(-30);
      const days = dates.map((date) => {
        const vals = srcs.map((s) => s.data[date]).filter((v) => Number.isFinite(v));
        const spread = vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : 0;
        return { date, netFlow: median(vals), sources: vals.length, disagree: spread > 50e6 && spread > Math.abs(median(vals)) * 0.25 };
      }).filter((d) => d.netFlow != null);
      const sum = (xs) => xs.reduce((s, d) => s + d.netFlow, 0);
      return {
        label, days, latest: days[days.length - 1] || null,
        total7d: sum(days.slice(-7)), total30d: sum(days),
        sources: srcs.map((s) => s.name)
      };
    }
    const btc = merge("Spot Bitcoin ETFs", [{ name: "Bitbo", data: bb }, { name: "CoinMarketCap", data: cb }]);
    const eth = merge("Spot Ether ETFs", [{ name: "CoinMarketCap", data: ce }]);
    return btc || eth ? { btc, eth } : null;
  });
}

/* ---- Long BTC daily closes: Bitstamp from 2011, cross-checked with Kraken -- */
function btcDaily() {
  return cached("btc:daily", 12 * HOUR, async () => {
    const closes = {};
    let start = Math.floor(Date.parse("2011-09-01") / 1000);
    const now = Date.now() / 1000;
    for (let i = 0; i < 8 && start < now; i++) {
      const d = await getJson("https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=" + start);
      const rows = (d.data && d.data.ohlc) || [];
      if (!rows.length) break;
      for (const r of rows) closes[isoDay(+r.timestamp * 1000)] = +r.close;
      start = +rows[rows.length - 1].timestamp + 86400;
    }
    // Kraken (last ~720 days): if the two disagree by more than 2% on a
    // day, use the average for that day.
    const k = await quiet(() => getJson("https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440"));
    const kr = k && k.result && (k.result.XXBTZUSD || Object.values(k.result).find(Array.isArray));
    for (const r of kr || []) {
      const day = isoDay(+r[0] * 1000), kc = +r[4], bc = closes[day];
      if (!Number.isFinite(bc)) closes[day] = kc;
      else if (Math.abs(kc / bc - 1) > 0.02) closes[day] = (kc + bc) / 2;
    }
    return Object.entries(closes).sort(([a], [b]) => (a < b ? -1 : 1));
  });
}

/* ---- Rainbow chart: our own log-regression bands ---------------------------- */
// log10(price) = slope × ln(days since 2009-01-09) + intercept, fitted by
// least squares to monthly closes; the bands are fixed steps in log10
// around the line. Our own fit and our own band names.
const GENESIS = Date.parse("2009-01-09T00:00:00Z");
export const RAINBOW_BANDS = [
  { label: "Deep value", from: -0.75, to: -0.5 },
  { label: "Undervalued", from: -0.5, to: -0.25 },
  { label: "Below trend", from: -0.25, to: 0 },
  { label: "On trend", from: 0, to: 0.25 },
  { label: "Above trend", from: 0.25, to: 0.5 },
  { label: "Overheated", from: 0.5, to: 0.75 },
  { label: "Extreme", from: 0.75, to: 1 }
];
async function rainbow() {
  const daily = await btcDaily();
  const monthly = new Map();
  for (const [day, close] of daily) monthly.set(day.slice(0, 7), close);   // last close of each month
  const months = [...monthly.entries()].map(([month, close]) => ({ month, close }));
  const pts = months.map((m) => [Math.log(Math.max(1, (Date.parse(m.month + "-15") - GENESIS) / DAY)), Math.log10(m.close)]);
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), intercept = (sy - slope * sx) / n;
  // Centre the bands on the fit's spread so history fills the rainbow.
  const resid = pts.map((p) => p[1] - (slope * p[0] + intercept)).sort((a, b) => a - b);
  const lo = resid[Math.floor(resid.length * 0.02)];
  const offset = Math.round((lo + 0.75) * 1000) / 1000;
  return {
    genesis: "2009-01-09",
    fit: { slope: +slope.toFixed(5), intercept: +(intercept + offset).toFixed(5), note: "log10(price) = slope × ln(days since genesis) + intercept (our least-squares fit to monthly closes)" },
    bands: RAINBOW_BANDS, monthly: months, sources: ["Bitstamp", "Kraken"]
  };
}

/* ---- Puell Multiple: daily issuance (USD) ÷ its 365-day average ------------ */
// Issuance = blocks mined that day × the block subsidy then. Blocks per day
// come from block heights over time (mempool.space); the subsidy halves
// every 210,000 blocks. Rewards only (fees left out).
const subsidy = (h) => 50 / 2 ** Math.floor(h / 210000);
async function puell() {
  const [daily, pts] = await Promise.all([
    btcDaily(),
    cached("mempool:heights", 12 * HOUR, () => getJson("https://mempool.space/api/v1/mining/blocks/fee-rates/3y"))
  ]);
  const price = new Map(daily);
  const hs = (pts || []).map((p) => ({ t: p.timestamp * 1000, h: p.avgHeight })).sort((a, b) => a.t - b.t);
  if (hs.length < 30) return null;
  // Height at the end of each day, by interpolation, then coins mined that day.
  const heightAt = (t) => {
    let i = hs.findIndex((p) => p.t >= t);
    if (i <= 0) return i === 0 ? hs[0].h : hs[hs.length - 1].h;
    const a = hs[i - 1], b = hs[i];
    return a.h + (b.h - a.h) * (t - a.t) / (b.t - a.t);
  };
  const first = hs[0].t + DAY, last = hs[hs.length - 1].t;
  const issuance = [];
  for (let t = first; t <= last; t += DAY) {
    const h0 = heightAt(t - DAY), h1 = heightAt(t), p = price.get(isoDay(t));
    if (Number.isFinite(p)) issuance.push({ date: isoDay(t), usd: (h1 - h0) * subsidy(h1) * p });
  }
  if (issuance.length < 400) return null;
  const weekly = [];
  for (let i = 365; i < issuance.length; i++) {
    const avg = issuance.slice(i - 365, i).reduce((s, d) => s + d.usd, 0) / 365;
    if (new Date(issuance[i].date).getUTCDay() === 1 || i === issuance.length - 1) weekly.push({ date: issuance[i].date, value: +(issuance[i].usd / avg).toFixed(2) });
  }
  const bands = [{ max: 0.6, label: "Low" }, { max: 2, label: "Neutral" }, { max: null, label: "High" }];
  const latest = weekly[weekly.length - 1];
  return { value: latest.value, date: latest.date, status: bandOf(bands, latest.value), bands, weekly: weekly.slice(-104), sources: ["mempool.space", "Bitstamp", "Kraken"], note: "Block rewards only (fees left out)" };
}
export function indicators() {
  return cached("btc:indicators", 6 * HOUR, async () => {
    const [p, r] = await Promise.all([quiet(puell), quiet(rainbow)]);
    return p || r ? { puell: p, rainbow: r } : null;
  });
}

const LOGOS = { btc: "assets/logos/bitcoin", eth: "assets/logos/ethereum" };

/* ---- One asset, assembled ---------------------------------------------------- */
// market: the quotes() entry; t: the research API's token entry.
export async function assetSummary(slug, market, t) {
  const [hist, sp, inf] = await Promise.all([quiet(() => history(slug)), quiet(() => spark(slug)), quiet(info)]);
  const m = market || null, i = inf && inf[slug];
  const out = {
    id: slug, name: t.name, ticker: t.symbol,
    canaryScore: t.rating, scoreMax: 10, verdict: t.decision, risk: t.risk_tier || null,
    category: t.category || null, thesis: t.one_line_thesis || null, reportDate: t.last_updated || null,
    // Our own logo files only (assets/logos/); others show their ticker.
    logo: LOGOS[slug] || null, market: !!m
  };
  if (!m) return out;
  out.price = m.price;
  out.priceChange = { ...m.priceChange, y1: pct(m.price, ago(hist, "price", 365)) };
  out.marketCap = m.marketCap;
  out.marketCapChange = {
    h24: pct(m.marketCap, ago(hist, "marketCap", 1)), d7: pct(m.marketCap, ago(hist, "marketCap", 7)),
    d30: pct(m.marketCap, ago(hist, "marketCap", 30)), d90: pct(m.marketCap, ago(hist, "marketCap", 90)),
    y1: pct(m.marketCap, ago(hist, "marketCap", 365))
  };
  out.volume24h = m.volume24h;
  out.volumeChange = {
    h24: m.volumeChange24h, d7: pct(m.volume24h, ago(hist, "volume", 7)), d30: pct(m.volume24h, ago(hist, "volume", 30)),
    d90: pct(m.volume24h, ago(hist, "volume", 90)), y1: pct(m.volume24h, ago(hist, "volume", 365))
  };
  out.circulatingSupply = m.circulatingSupply;
  out.sparkline7d = sp && sp.length >= 10 ? sp : null;
  out.priceChangeUsd = usdChanges(out.price, out.priceChange);
  out.marketCapChangeUsd = usdChanges(out.marketCap, out.marketCapChange);
  out.volumeChangeUsd = usdChanges(out.volume24h, out.volumeChange);
  out.updated = m.updated;
  return out;
}

// The detail-only parts: highs and lows, markets, about, news, indicators.
export async function assetDetail(slug, name, ticker) {
  const [ex, mk, inf, nw, ind] = await Promise.all([
    quiet(() => extremes(slug)), quiet(() => exchanges(slug)), quiet(info),
    quiet(() => news(name, ticker)), slug === "btc" ? quiet(indicators) : Promise.resolve(null)
  ]);
  const i = inf && inf[slug];
  return {
    ath: ex && ex.ath, atl: ex && ex.atl,
    about: i ? i.about : null, website: i ? i.website : null, whitepaper: i ? i.whitepaper : null,
    exchanges: mk || [], news: nw || [], indicators: ind
  };
}
