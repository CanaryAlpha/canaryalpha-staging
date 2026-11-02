/*
 * What a dashboard may show this user. Everything is decided here, on the
 * server: a Free user's responses carry Bitcoin and Ethereum and only a
 * COUNT of the other researched tokens, never their names, tickers,
 * logos, scores or market data.
 */
import { hasTier } from "./plans.js";
import { research } from "./research.js";
import { FREE_SLUGS } from "./coins.js";

// The research API's covered tokens, Bitcoin and Ethereum first.
export async function coverage() {
  const r = await research("/api/tokens", "free");
  if (r.status !== 200 || !r.body || !Array.isArray(r.body.tokens)) return null;
  const order = (t) => (FREE_SLUGS.includes(t.slug) ? FREE_SLUGS.indexOf(t.slug) : FREE_SLUGS.length);
  return r.body.tokens.slice().sort((a, b) => order(a) - order(b));
}

// { visible: [token], hidden: number } for this user's plan.
export function allowed(tokens, tier) {
  if (hasTier(tier, "pro")) return { visible: tokens, hidden: 0 };
  const visible = tokens.filter((t) => FREE_SLUGS.includes(t.slug));
  return { visible, hidden: tokens.length - visible.length };
}

// Source credits shown on every dashboard (some sources require them).
export const ATTRIBUTION = [
  { name: "CoinMarketCap", url: "https://coinmarketcap.com/", what: "prices, market cap, volume, project info" },
  { name: "CoinGecko", url: "https://www.coingecko.com/", what: "all-time highs and lows, markets" },
  { name: "CoinPaprika", url: "https://coinpaprika.com/", what: "all-time highs, markets" },
  { name: "alternative.me", url: "https://alternative.me/crypto/fear-and-greed-index/", what: "Fear & Greed Index" },
  { name: "Bitbo", url: "https://bitbo.io/treasuries/etf-flows/", what: "spot ETF flows" },
  { name: "Bitstamp and Kraken", url: "https://www.bitstamp.net/", what: "Bitcoin price history" },
  { name: "mempool.space", url: "https://mempool.space/", what: "Bitcoin block data" }
];
