/*
 * The tokens we research, matched to each market data source.
 *
 * The research API (canaryalpha-api) decides which tokens are covered and
 * their scores; this list only says where each one's market data lives.
 * A covered token missing here (or with null for a source) still shows
 * its score and verdict; its market numbers from that source are hidden.
 * Add a line here when a new token is researched.
 *
 *   cmc      CoinMarketCap numeric id
 *   gecko    CoinGecko id
 *   paprika  CoinPaprika id
 */
export const COINS = {
  btc: { cmc: 1, gecko: "bitcoin", paprika: "btc-bitcoin" },
  eth: { cmc: 1027, gecko: "ethereum", paprika: "eth-ethereum" },
  aave: { cmc: 7278, gecko: "aave", paprika: "aave-new" },
  dot: { cmc: 6636, gecko: "polkadot", paprika: "dot-polkadot" },
  eigenlayer: { cmc: 30494, gecko: "eigenlayer", paprika: "eigen-eigenlayer" },
  zro: { cmc: 26997, gecko: "layerzero", paprika: "zro-layerzero" },
  mega: { cmc: 38770, gecko: "megaeth", paprika: "mega-megaeth" },
  prove: { cmc: 37593, gecko: "succinct", paprika: "prove-succinct" },
  aztec: { cmc: 39521, gecko: "aztec", paprika: "aztec-aztec" },
  strato: { cmc: null, gecko: null, paprika: null }
};

// Always shown in full on the Free plan, and pinned first for everyone.
export const FREE_SLUGS = ["btc", "eth"];
