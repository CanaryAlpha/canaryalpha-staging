/*
 * Dashboard sample data. ALL VALUES ARE SAMPLE DATA for the demo dashboards:
 * realistic but not live, and every token other than Bitcoin and Ethereum
 * (and every news headline and source) is fictional.
 *
 * Read only through components/dashboard/dashboard-api.js; the pages never
 * read this file directly. Generated once by a script, then kept as plain
 * data. Money in US dollars; changes in percent; dates in ISO format.
 * A null band "max" means no upper limit. An asset's "logo" is the path
 * (from the repo root, without size or extension) of its logo files in
 * assets/logos/: NAME-64 and NAME-128, each as .webp and .png. Assets
 * without one show their ticker in a ring.
 */
window.CA_DASHBOARD_SAMPLE = {
 "meta": {
  "lastUpdated": "2026-10-23T13:30:00Z",
  "currency": "USD",
  "sample": true
 },
 "fearGreed": {
  "value": 38,
  "yesterday": 41,
  "lastWeek": 52,
  "lastMonth": 27,
  "bands": [
   {
    "max": 24,
    "label": "Extreme Fear"
   },
   {
    "max": 44,
    "label": "Fear"
   },
   {
    "max": 55,
    "label": "Neutral"
   },
   {
    "max": 75,
    "label": "Greed"
   },
   {
    "max": 100,
    "label": "Extreme Greed"
   }
  ]
 },
 "etfFlows": {
  "btc": {
   "label": "Spot Bitcoin ETFs",
   "days": [
    {
     "date": "2026-09-11",
     "netFlow": -295200000
    },
    {
     "date": "2026-09-14",
     "netFlow": 203600000
    },
    {
     "date": "2026-09-15",
     "netFlow": 496400000
    },
    {
     "date": "2026-09-16",
     "netFlow": 512700000
    },
    {
     "date": "2026-09-17",
     "netFlow": 163500000
    },
    {
     "date": "2026-09-18",
     "netFlow": 534000000
    },
    {
     "date": "2026-09-21",
     "netFlow": 550400000
    },
    {
     "date": "2026-09-22",
     "netFlow": 154700000
    },
    {
     "date": "2026-09-23",
     "netFlow": -231300000
    },
    {
     "date": "2026-09-24",
     "netFlow": 71500000
    },
    {
     "date": "2026-09-25",
     "netFlow": -86100000
    },
    {
     "date": "2026-09-28",
     "netFlow": 173100000
    },
    {
     "date": "2026-09-29",
     "netFlow": -296400000
    },
    {
     "date": "2026-09-30",
     "netFlow": -351200000
    },
    {
     "date": "2026-10-01",
     "netFlow": 145600000
    },
    {
     "date": "2026-10-02",
     "netFlow": 224300000
    },
    {
     "date": "2026-10-05",
     "netFlow": 243500000
    },
    {
     "date": "2026-10-06",
     "netFlow": 231900000
    },
    {
     "date": "2026-10-07",
     "netFlow": -306800000
    },
    {
     "date": "2026-10-08",
     "netFlow": -290400000
    },
    {
     "date": "2026-10-09",
     "netFlow": -308800000
    },
    {
     "date": "2026-10-12",
     "netFlow": -481700000
    },
    {
     "date": "2026-10-13",
     "netFlow": -511400000
    },
    {
     "date": "2026-10-14",
     "netFlow": -429100000
    },
    {
     "date": "2026-10-15",
     "netFlow": 248200000
    },
    {
     "date": "2026-10-16",
     "netFlow": 409200000
    },
    {
     "date": "2026-10-19",
     "netFlow": 216500000
    },
    {
     "date": "2026-10-20",
     "netFlow": -68000000
    },
    {
     "date": "2026-10-21",
     "netFlow": -210900000
    },
    {
     "date": "2026-10-22",
     "netFlow": -142600000
    }
   ]
  },
  "eth": {
   "label": "Spot Ether ETFs",
   "days": [
    {
     "date": "2026-09-11",
     "netFlow": 87200000
    },
    {
     "date": "2026-09-14",
     "netFlow": -60500000
    },
    {
     "date": "2026-09-15",
     "netFlow": -45900000
    },
    {
     "date": "2026-09-16",
     "netFlow": -51100000
    },
    {
     "date": "2026-09-17",
     "netFlow": -52000000
    },
    {
     "date": "2026-09-18",
     "netFlow": 123100000
    },
    {
     "date": "2026-09-21",
     "netFlow": 8400000
    },
    {
     "date": "2026-09-22",
     "netFlow": 42700000
    },
    {
     "date": "2026-09-23",
     "netFlow": 73400000
    },
    {
     "date": "2026-09-24",
     "netFlow": -24000000
    },
    {
     "date": "2026-09-25",
     "netFlow": 11100000
    },
    {
     "date": "2026-09-28",
     "netFlow": -44500000
    },
    {
     "date": "2026-09-29",
     "netFlow": -82300000
    },
    {
     "date": "2026-09-30",
     "netFlow": 57700000
    },
    {
     "date": "2026-10-01",
     "netFlow": 100000
    },
    {
     "date": "2026-10-02",
     "netFlow": -88500000
    },
    {
     "date": "2026-10-05",
     "netFlow": 60800000
    },
    {
     "date": "2026-10-06",
     "netFlow": -98200000
    },
    {
     "date": "2026-10-07",
     "netFlow": -102200000
    },
    {
     "date": "2026-10-08",
     "netFlow": 46500000
    },
    {
     "date": "2026-10-09",
     "netFlow": -130000000
    },
    {
     "date": "2026-10-12",
     "netFlow": -107800000
    },
    {
     "date": "2026-10-13",
     "netFlow": -89000000
    },
    {
     "date": "2026-10-14",
     "netFlow": -103600000
    },
    {
     "date": "2026-10-15",
     "netFlow": -100000000
    },
    {
     "date": "2026-10-16",
     "netFlow": -96000000
    },
    {
     "date": "2026-10-19",
     "netFlow": -28200000
    },
    {
     "date": "2026-10-20",
     "netFlow": 39000000
    },
    {
     "date": "2026-10-21",
     "netFlow": 71400000
    },
    {
     "date": "2026-10-22",
     "netFlow": 38400000
    }
   ]
  }
 },
 "assets": [
  {
   "id": "btc",
   "logo": "assets/logos/bitcoin",
   "name": "Bitcoin",
   "ticker": "BTC",
   "price": 98420,
   "priceChange": {
    "h1": 0.21,
    "h24": -1.84,
    "d7": 3.62,
    "d30": -6.15,
    "d90": 9.84,
    "y1": 41.7
   },
   "marketCap": 1962494800000,
   "marketCapChange": {
    "h24": -1.84,
    "d7": 3.63,
    "d30": -6.11,
    "d90": 9.96,
    "y1": 42.2
   },
   "volume24h": 38600000000,
   "volumeChange": {
    "h24": -0.5,
    "d7": -5.4,
    "d30": 34.9,
    "d90": -29.1,
    "y1": 45.4
   },
   "circulatingSupply": 19940000,
   "ath": {
    "price": 126080,
    "date": "2025-10-06"
   },
   "atl": {
    "price": 67.81,
    "date": "2013-07-06"
   },
   "sparkline7d": [
    94982,
    95103,
    95335,
    95441,
    95746,
    95855,
    96239,
    96322,
    96422,
    95747,
    95949,
    96398,
    95743,
    96856,
    96457,
    97132,
    97095,
    96708,
    96462,
    97589,
    98217,
    96707,
    96629,
    96430,
    97325,
    97790,
    98111,
    97833,
    98334,
    97748,
    97328,
    98188,
    98302,
    97601,
    97426,
    98087,
    98276,
    97919,
    97879,
    98038,
    98237,
    98420
   ],
   "canaryScore": 66,
   "reportDate": "2026-10-01",
   "previousReport": {
    "date": "2026-07-02",
    "score": 63
   },
   "about": "Bitcoin is a decentralized digital currency secured by proof-of-work mining, with a fixed supply of 21 million coins. Launched in 2009, it is the largest crypto asset by market cap and is widely treated as a store of value.",
   "website": "https://bitcoin.org",
   "whitepaper": "https://bitcoin.org/bitcoin.pdf",
   "news": [
    {
     "headline": "Spot bitcoin ETFs log second week of mixed flows as volatility cools",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Miner reserves hold steady after difficulty adjustment",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Long-term holder supply climbs to a six-month high",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Options open interest concentrates around year-end strikes",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "BTC/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "BTC/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "BTC/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "BTC/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "BTC/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "eth",
   "logo": "assets/logos/ethereum",
   "name": "Ethereum",
   "ticker": "ETH",
   "price": 3612.4,
   "priceChange": {
    "h1": -0.34,
    "h24": -2.71,
    "d7": 5.18,
    "d30": -9.42,
    "d90": 14.6,
    "y1": 38.2
   },
   "marketCap": 436016680000,
   "marketCapChange": {
    "h24": -2.71,
    "d7": 5.19,
    "d30": -9.38,
    "d90": 14.72,
    "y1": 38.7
   },
   "volume24h": 17900000000,
   "volumeChange": {
    "h24": -10.1,
    "d7": 21.8,
    "d30": 29.3,
    "d90": -30.5,
    "y1": 66.5
   },
   "circulatingSupply": 120700000,
   "ath": {
    "price": 4946,
    "date": "2025-08-24"
   },
   "atl": {
    "price": 0.4329,
    "date": "2015-10-20"
   },
   "sparkline7d": [
    3434,
    3438,
    3440,
    3436,
    3454,
    3456,
    3464,
    3482,
    3506,
    3488,
    3487,
    3473,
    3467,
    3507,
    3527,
    3502,
    3538,
    3526,
    3554,
    3525,
    3517,
    3492,
    3463,
    3466,
    3489,
    3471,
    3466,
    3527,
    3544,
    3565,
    3559,
    3565,
    3586,
    3596,
    3607,
    3619,
    3620,
    3610,
    3604,
    3612,
    3608,
    3612.4
   ],
   "canaryScore": 61,
   "reportDate": "2026-10-01",
   "previousReport": {
    "date": "2026-07-02",
    "score": 58
   },
   "about": "Ethereum is a programmable blockchain whose smart contracts power decentralized finance, stablecoins and tokenized assets. Secured by proof of stake since 2022, its native asset ETH pays for network fees and staking.",
   "website": "https://ethereum.org",
   "whitepaper": "https://ethereum.org/en/whitepaper/",
   "news": [
    {
     "headline": "Staking queue shortens as validator exits slow",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Layer-2 fees fall after latest network upgrade",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Ether ETF products see first weekly outflow since August",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Stablecoin supply on Ethereum reaches a new record",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "ETH/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "ETH/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "ETH/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "ETH/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "ETH/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "kestrel",
   "name": "Kestrel Chain",
   "ticker": "KSC",
   "price": 27.9,
   "priceChange": {
    "h1": 0.58,
    "h24": 3.92,
    "d7": 11.4,
    "d30": 18.6,
    "d90": 42.3,
    "y1": 126.4
   },
   "marketCap": 8704800000,
   "marketCapChange": {
    "h24": 3.92,
    "d7": 11.41,
    "d30": 18.64,
    "d90": 42.42,
    "y1": 126.9
   },
   "volume24h": 640000000,
   "volumeChange": {
    "h24": -0.5,
    "d7": 23,
    "d30": -19.8,
    "d90": 58.2,
    "y1": 87.1
   },
   "circulatingSupply": 312000000,
   "ath": {
    "price": 34.12,
    "date": "2025-12-03"
   },
   "atl": {
    "price": 1.86,
    "date": "2023-01-02"
   },
   "sparkline7d": [
    25.045,
    25.115,
    25.204,
    25.221,
    25.208,
    25.226,
    25.216,
    25.382,
    25.543,
    25.558,
    25.464,
    25.419,
    25.715,
    25.618,
    25.819,
    25.758,
    26.199,
    26.548,
    26.831,
    26.603,
    26.63,
    26.78,
    26.834,
    26.769,
    27.041,
    27.022,
    26.997,
    26.752,
    26.691,
    26.741,
    27.018,
    26.962,
    26.971,
    27.319,
    27.525,
    27.595,
    27.527,
    27.545,
    27.655,
    27.769,
    27.826,
    27.9
   ],
   "canaryScore": 69,
   "reportDate": "2026-10-08",
   "previousReport": {
    "date": "2026-07-09",
    "score": 64
   },
   "about": "Kestrel Chain (KSC) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Kestrel Chain treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Kestrel Chain core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large KSC holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Kestrel Chain liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "KSC/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "KSC/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "KSC/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "KSC/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "KSC/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "norvane",
   "name": "Norvane",
   "ticker": "NRV",
   "price": 4.82,
   "priceChange": {
    "h1": -0.12,
    "h24": 1.07,
    "d7": -2.45,
    "d30": 6.8,
    "d90": -11.2,
    "y1": 23.5
   },
   "marketCap": 5832200000,
   "marketCapChange": {
    "h24": 1.07,
    "d7": -2.44,
    "d30": 6.84,
    "d90": -11.08,
    "y1": 24
   },
   "volume24h": 412000000,
   "volumeChange": {
    "h24": -17.5,
    "d7": 17.5,
    "d30": 33.2,
    "d90": -5.7,
    "y1": 51.7
   },
   "circulatingSupply": 1210000000,
   "ath": {
    "price": 7.95,
    "date": "2024-03-14"
   },
   "atl": {
    "price": 0.512,
    "date": "2022-11-21"
   },
   "sparkline7d": [
    4.941,
    4.933,
    4.925,
    4.909,
    4.922,
    4.929,
    4.918,
    4.91,
    4.923,
    4.953,
    4.955,
    4.981,
    4.957,
    4.907,
    4.922,
    4.874,
    4.881,
    4.93,
    4.883,
    4.937,
    4.899,
    4.847,
    4.845,
    4.801,
    4.838,
    4.88,
    4.849,
    4.894,
    4.841,
    4.803,
    4.78,
    4.786,
    4.809,
    4.816,
    4.82,
    4.829,
    4.811,
    4.817,
    4.832,
    4.824,
    4.823,
    4.82
   ],
   "canaryScore": 63,
   "reportDate": "2026-09-24",
   "previousReport": {
    "date": "2026-06-25",
    "score": 65
   },
   "about": "Norvane (NRV) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Norvane treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Norvane core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large NRV holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Norvane liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "NRV/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "NRV/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "NRV/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "NRV/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "NRV/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "halvard",
   "name": "Halvard",
   "ticker": "HLV",
   "price": 1.142,
   "priceChange": {
    "h1": 0.07,
    "h24": -0.64,
    "d7": 1.9,
    "d30": 4.3,
    "d90": 8.1,
    "y1": 17.9
   },
   "marketCap": 3540200000,
   "marketCapChange": {
    "h24": -0.64,
    "d7": 1.91,
    "d30": 4.34,
    "d90": 8.22,
    "y1": 18.4
   },
   "volume24h": 97000000,
   "volumeChange": {
    "h24": 14.4,
    "d7": 21.1,
    "d30": 26.5,
    "d90": -20.4,
    "y1": 36.1
   },
   "circulatingSupply": 3100000000,
   "ath": {
    "price": 1.48,
    "date": "2025-07-19"
   },
   "atl": {
    "price": 0.211,
    "date": "2023-06-10"
   },
   "sparkline7d": [
    1.121,
    1.122,
    1.122,
    1.122,
    1.124,
    1.125,
    1.131,
    1.131,
    1.128,
    1.124,
    1.117,
    1.113,
    1.113,
    1.119,
    1.133,
    1.122,
    1.126,
    1.121,
    1.134,
    1.121,
    1.132,
    1.133,
    1.124,
    1.114,
    1.123,
    1.139,
    1.133,
    1.135,
    1.135,
    1.142,
    1.14,
    1.145,
    1.142,
    1.148,
    1.149,
    1.143,
    1.14,
    1.143,
    1.145,
    1.144,
    1.143,
    1.142
   ],
   "canaryScore": 66,
   "reportDate": "2026-10-15",
   "previousReport": {
    "date": "2026-07-16",
    "score": 62
   },
   "about": "Halvard (HLV) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Halvard treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Halvard core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large HLV holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Halvard liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "HLV/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "HLV/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "HLV/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "HLV/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "HLV/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "tessaro",
   "name": "Tessaro",
   "ticker": "TSR",
   "price": 18.36,
   "priceChange": {
    "h1": 0.44,
    "h24": 2.58,
    "d7": 7.9,
    "d30": -4.2,
    "d90": 21.7,
    "y1": 64.8
   },
   "marketCap": 2937600000,
   "marketCapChange": {
    "h24": 2.58,
    "d7": 7.91,
    "d30": -4.16,
    "d90": 21.82,
    "y1": 65.3
   },
   "volume24h": 186000000,
   "volumeChange": {
    "h24": 8.5,
    "d7": -3.4,
    "d30": -3.6,
    "d90": -22.1,
    "y1": 96.7
   },
   "circulatingSupply": 160000000,
   "ath": {
    "price": 26.4,
    "date": "2024-12-05"
   },
   "atl": {
    "price": 3.12,
    "date": "2023-09-11"
   },
   "sparkline7d": [
    17.016,
    17.05,
    17.11,
    17.165,
    17.145,
    17.175,
    17.166,
    17.207,
    17.293,
    17.338,
    17.36,
    17.255,
    17.38,
    17.277,
    17.264,
    17.164,
    17.282,
    17.397,
    17.671,
    17.841,
    17.806,
    17.902,
    17.755,
    17.789,
    17.761,
    17.711,
    17.761,
    17.824,
    17.924,
    17.88,
    18.022,
    18.177,
    18.038,
    18.085,
    18.077,
    18.067,
    18.192,
    18.194,
    18.268,
    18.279,
    18.32,
    18.36
   ],
   "canaryScore": 58,
   "reportDate": "2026-09-30",
   "previousReport": {
    "date": "2026-07-01",
    "score": 55
   },
   "about": "Tessaro (TSR) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Tessaro treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Tessaro core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large TSR holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Tessaro liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "TSR/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "TSR/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "TSR/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "TSR/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "TSR/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "vantis",
   "name": "Vantis",
   "ticker": "VNT",
   "price": 112.4,
   "priceChange": {
    "h1": -0.31,
    "h24": -1.22,
    "d7": -5.6,
    "d30": -13.8,
    "d90": -2.4,
    "y1": 9.6
   },
   "marketCap": 2416600000,
   "marketCapChange": {
    "h24": -1.22,
    "d7": -5.59,
    "d30": -13.76,
    "d90": -2.28,
    "y1": 10.1
   },
   "volume24h": 58000000,
   "volumeChange": {
    "h24": -13.7,
    "d7": -17.9,
    "d30": -0.5,
    "d90": 15.4,
    "y1": 67.6
   },
   "circulatingSupply": 21500000,
   "ath": {
    "price": 189.5,
    "date": "2024-11-27"
   },
   "atl": {
    "price": 24.6,
    "date": "2022-12-30"
   },
   "sparkline7d": [
    119.1,
    118.9,
    118.8,
    118.8,
    118.4,
    117.9,
    117.9,
    117.1,
    117,
    117.1,
    117.2,
    117.5,
    116.7,
    116.1,
    115.6,
    116.9,
    115.4,
    115.3,
    116.7,
    115.8,
    115.7,
    115.5,
    114.7,
    115.1,
    115.1,
    114.4,
    115,
    115.6,
    115.4,
    115.5,
    115.9,
    115,
    114.6,
    114.8,
    114.2,
    114.1,
    113.2,
    112.9,
    112.6,
    112.7,
    112.6,
    112.4
   ],
   "canaryScore": 56,
   "reportDate": "2026-09-17",
   "previousReport": {
    "date": "2026-06-18",
    "score": 60
   },
   "about": "Vantis (VNT) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Vantis treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Harbor Chain Report",
     "url": "#"
    },
    {
     "headline": "Vantis core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Large VNT holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Vantis liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Blocknote Weekly",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "VNT/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "VNT/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "VNT/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "VNT/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "VNT/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "calder",
   "name": "Calder",
   "ticker": "CLD",
   "price": 0.874,
   "priceChange": {
    "h1": 1.12,
    "h24": 6.45,
    "d7": 14.2,
    "d30": 27.9,
    "d90": 18.4,
    "y1": -12.6
   },
   "marketCap": 1616900000,
   "marketCapChange": {
    "h24": 6.45,
    "d7": 14.21,
    "d30": 27.94,
    "d90": 18.52,
    "y1": -12.1
   },
   "volume24h": 210000000,
   "volumeChange": {
    "h24": -17,
    "d7": -20.9,
    "d30": 43.1,
    "d90": -9.3,
    "y1": 95.2
   },
   "circulatingSupply": 1850000000,
   "ath": {
    "price": 2.31,
    "date": "2021-11-09"
   },
   "atl": {
    "price": 0.188,
    "date": "2023-06-12"
   },
   "sparkline7d": [
    0.7653,
    0.7683,
    0.772,
    0.7752,
    0.78,
    0.7858,
    0.789,
    0.7873,
    0.7945,
    0.7997,
    0.8006,
    0.8066,
    0.8091,
    0.8171,
    0.8129,
    0.8141,
    0.8172,
    0.8157,
    0.813,
    0.8254,
    0.8157,
    0.8136,
    0.8193,
    0.8164,
    0.8239,
    0.8309,
    0.8378,
    0.8484,
    0.8498,
    0.8446,
    0.8485,
    0.8512,
    0.8492,
    0.8542,
    0.8597,
    0.8586,
    0.8572,
    0.8636,
    0.8648,
    0.8686,
    0.8706,
    0.874
   ],
   "canaryScore": 44,
   "reportDate": "2026-10-10",
   "previousReport": {
    "date": "2026-07-11",
    "score": 41
   },
   "about": "Calder (CLD) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Calder treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Harbor Chain Report",
     "url": "#"
    },
    {
     "headline": "Calder core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Large CLD holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Calder liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Blocknote Weekly",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "CLD/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "CLD/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "CLD/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "CLD/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "CLD/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "meridel",
   "name": "Meridel",
   "ticker": "MRD",
   "price": 2.315,
   "priceChange": {
    "h1": -0.22,
    "h24": -3.18,
    "d7": -8.7,
    "d30": -15.4,
    "d90": -28.1,
    "y1": -36.9
   },
   "marketCap": 1481600000,
   "marketCapChange": {
    "h24": -3.18,
    "d7": -8.69,
    "d30": -15.36,
    "d90": -27.98,
    "y1": -36.4
   },
   "volume24h": 64000000,
   "volumeChange": {
    "h24": -14.2,
    "d7": -2.2,
    "d30": 9.9,
    "d90": -1.7,
    "y1": 56.7
   },
   "circulatingSupply": 640000000,
   "ath": {
    "price": 9.84,
    "date": "2022-04-02"
   },
   "atl": {
    "price": 1.67,
    "date": "2024-08-05"
   },
   "sparkline7d": [
    2.536,
    2.531,
    2.522,
    2.519,
    2.516,
    2.519,
    2.521,
    2.51,
    2.493,
    2.491,
    2.495,
    2.504,
    2.475,
    2.474,
    2.449,
    2.455,
    2.436,
    2.452,
    2.461,
    2.422,
    2.406,
    2.426,
    2.415,
    2.384,
    2.394,
    2.403,
    2.385,
    2.384,
    2.36,
    2.382,
    2.372,
    2.372,
    2.358,
    2.352,
    2.346,
    2.348,
    2.348,
    2.346,
    2.342,
    2.333,
    2.323,
    2.315
   ],
   "canaryScore": 53,
   "reportDate": "2026-09-10",
   "previousReport": {
    "date": "2026-06-11",
    "score": 57
   },
   "about": "Meridel (MRD) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Meridel treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Meridel core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large MRD holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Meridel liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "MRD/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "MRD/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "MRD/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "MRD/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "MRD/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "quillon",
   "name": "Quillon",
   "ticker": "QLN",
   "price": 0.3874,
   "priceChange": {
    "h1": 2.84,
    "h24": 18.6,
    "d7": 31.4,
    "d30": 22.7,
    "d90": 9.6,
    "y1": -21.3
   },
   "marketCap": 1007240000,
   "marketCapChange": {
    "h24": 18.6,
    "d7": 31.41,
    "d30": 22.74,
    "d90": 9.72,
    "y1": -20.8
   },
   "volume24h": 482000000,
   "volumeChange": {
    "h24": 25.8,
    "d7": -19.7,
    "d30": -2.9,
    "d90": 59.9,
    "y1": 1.8
   },
   "circulatingSupply": 2600000000,
   "ath": {
    "price": 1.215,
    "date": "2024-03-26"
   },
   "atl": {
    "price": 0.0841,
    "date": "2023-10-19"
   },
   "sparkline7d": [
    0.2948,
    0.2972,
    0.299,
    0.3005,
    0.3038,
    0.305,
    0.3076,
    0.3124,
    0.3132,
    0.3172,
    0.3211,
    0.3228,
    0.3228,
    0.3238,
    0.3288,
    0.3279,
    0.327,
    0.3313,
    0.3338,
    0.3408,
    0.3378,
    0.3361,
    0.3379,
    0.3427,
    0.3476,
    0.3517,
    0.3502,
    0.3509,
    0.3558,
    0.3595,
    0.3611,
    0.3661,
    0.3673,
    0.3711,
    0.3746,
    0.3755,
    0.378,
    0.3783,
    0.3803,
    0.3833,
    0.3852,
    0.3874
   ],
   "canaryScore": 47,
   "reportDate": "2026-10-17",
   "previousReport": {
    "date": "2026-07-18",
    "score": 44
   },
   "about": "Quillon (QLN) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Quillon treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Quillon core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Large QLN holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Blocknote Weekly",
     "url": "#"
    },
    {
     "headline": "Quillon liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Harbor Chain Report",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "QLN/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "QLN/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "QLN/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "QLN/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "QLN/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "orrisa",
   "name": "Orrisa",
   "ticker": "ORS",
   "price": 0.0612,
   "priceChange": {
    "h1": -0.48,
    "h24": -4.85,
    "d7": -12.9,
    "d30": -24.6,
    "d90": -41.2,
    "y1": -58.4
   },
   "marketCap": 575280000,
   "marketCapChange": {
    "h24": -4.85,
    "d7": -12.89,
    "d30": -24.56,
    "d90": -41.08,
    "y1": -57.9
   },
   "volume24h": 31000000,
   "volumeChange": {
    "h24": 22,
    "d7": -24.1,
    "d30": 26.5,
    "d90": 39.6,
    "y1": 87.2
   },
   "circulatingSupply": 9400000000,
   "ath": {
    "price": 0.388,
    "date": "2024-04-08"
   },
   "atl": {
    "price": 0.0598,
    "date": "2026-10-21"
   },
   "sparkline7d": [
    0.0703,
    0.07,
    0.0699,
    0.0695,
    0.0691,
    0.0689,
    0.0685,
    0.0685,
    0.0686,
    0.0681,
    0.0677,
    0.0678,
    0.068,
    0.0672,
    0.0668,
    0.0672,
    0.0668,
    0.0666,
    0.0669,
    0.0671,
    0.066,
    0.0652,
    0.0651,
    0.0652,
    0.0649,
    0.0653,
    0.0655,
    0.0649,
    0.0646,
    0.0643,
    0.0642,
    0.0633,
    0.0628,
    0.0626,
    0.0624,
    0.0622,
    0.0623,
    0.0621,
    0.062,
    0.0618,
    0.0615,
    0.0612
   ],
   "canaryScore": 39,
   "reportDate": "2026-10-03",
   "previousReport": {
    "date": "2026-07-04",
    "score": 46
   },
   "about": "Orrisa (ORS) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Orrisa treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Harbor Chain Report",
     "url": "#"
    },
    {
     "headline": "Orrisa core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Large ORS holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Orrisa liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Blocknote Weekly",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "ORS/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "ORS/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "ORS/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "ORS/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "ORS/KRW",
     "url": "#"
    }
   ]
  },
  {
   "id": "lumora",
   "name": "Lumora",
   "ticker": "LMR",
   "price": 0.00418,
   "priceChange": {
    "h1": 0.36,
    "h24": -2.06,
    "d7": 4.4,
    "d30": -18.2,
    "d90": -33.5,
    "y1": -47.8
   },
   "marketCap": 401280000,
   "marketCapChange": {
    "h24": -2.06,
    "d7": 4.41,
    "d30": -18.16,
    "d90": -33.38,
    "y1": -47.3
   },
   "volume24h": 22000000,
   "volumeChange": {
    "h24": -8.6,
    "d7": -27.2,
    "d30": 17.3,
    "d90": 29.7,
    "y1": -21.7
   },
   "circulatingSupply": 96000000000,
   "ath": {
    "price": 0.0214,
    "date": "2024-02-29"
   },
   "atl": {
    "price": 0.00311,
    "date": "2026-08-05"
   },
   "sparkline7d": [
    0.004004,
    0.004004,
    0.004005,
    0.004003,
    0.004008,
    0.004014,
    0.00401,
    0.003999,
    0.004031,
    0.004009,
    0.004033,
    0.004047,
    0.004054,
    0.004022,
    0.004077,
    0.00406,
    0.00405,
    0.00402,
    0.00401,
    0.004068,
    0.004097,
    0.004073,
    0.004098,
    0.00413,
    0.004104,
    0.004113,
    0.004122,
    0.004126,
    0.004161,
    0.004142,
    0.004108,
    0.004123,
    0.004136,
    0.004163,
    0.004185,
    0.004161,
    0.004147,
    0.004156,
    0.004164,
    0.004166,
    0.004173,
    0.00418
   ],
   "canaryScore": 35,
   "reportDate": "2026-09-03",
   "previousReport": {
    "date": "2026-06-04",
    "score": 38
   },
   "about": "Lumora (LMR) is a fictional sample token used to demonstrate the Pro dashboard. Its figures, history and report are invented for layout purposes only and describe no real project.",
   "website": "#",
   "whitepaper": "#",
   "news": [
    {
     "headline": "Lumora treasury publishes quarterly spending report",
     "date": "2026-10-21",
     "source": "Harbor Chain Report",
     "url": "#"
    },
    {
     "headline": "Lumora core team schedules network upgrade vote",
     "date": "2026-10-18",
     "source": "Canary Alpha Research",
     "url": "#"
    },
    {
     "headline": "Large LMR holder moves tokens to an exchange",
     "date": "2026-10-13",
     "source": "Meridian Markets Desk",
     "url": "#"
    },
    {
     "headline": "Lumora liquidity incentives extended for one quarter",
     "date": "2026-10-07",
     "source": "Blocknote Weekly",
     "url": "#"
    }
   ],
   "exchanges": [
    {
     "rank": 1,
     "exchange": "Binance",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 2,
     "exchange": "Coinbase Exchange",
     "pair": "LMR/USD",
     "url": "#"
    },
    {
     "rank": 3,
     "exchange": "OKX",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 4,
     "exchange": "Bybit",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 5,
     "exchange": "Kraken",
     "pair": "LMR/USD",
     "url": "#"
    },
    {
     "rank": 6,
     "exchange": "Bitget",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 7,
     "exchange": "KuCoin",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 8,
     "exchange": "Gate",
     "pair": "LMR/USDT",
     "url": "#"
    },
    {
     "rank": 9,
     "exchange": "Bitstamp",
     "pair": "LMR/USD",
     "url": "#"
    },
    {
     "rank": 10,
     "exchange": "Upbit",
     "pair": "LMR/KRW",
     "url": "#"
    }
   ]
  }
 ],
 "pro": {
  "btc": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 1.69,
      "change30d": 4.6,
      "lastMove": "2026-10-09"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.06,
      "change30d": -4.6,
      "lastMove": "2026-10-04"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.85,
      "change30d": -3.9,
      "lastMove": "2026-10-04"
     },
     {
      "label": "Unlabeled whale 0xc4…72",
      "shareOfSupply": 0.29,
      "change30d": 12.5,
      "lastMove": "2026-10-03"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.33,
      "change30d": -17.7,
      "lastMove": "2026-09-30"
     }
    ],
    "exchangeNetFlow30d": -1094079719,
    "summary": "Large holders moved a net $1.09B off exchanges over 30 days, usually a sign of holding rather than selling."
   },
   "changes": {
    "summary": "Score up 3 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "eth": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 3.47,
      "change30d": -10,
      "lastMove": "2026-10-09"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 0.53,
      "change30d": -11.1,
      "lastMove": "2026-10-04"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.42,
      "change30d": 0.4,
      "lastMove": "2026-09-30"
     },
     {
      "label": "Unlabeled whale 0xc4…72",
      "shareOfSupply": 0.46,
      "change30d": 8.1,
      "lastMove": "2026-09-29"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.14,
      "change30d": -4.3,
      "lastMove": "2026-09-29"
     }
    ],
    "exchangeNetFlow30d": 522865971,
    "summary": "Large holders moved a net $522.9M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score up 3 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "kestrel": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 4.11,
      "change30d": -9.4,
      "lastMove": "2026-10-21"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 0.67,
      "change30d": -17.2,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.22,
      "change30d": 11.1,
      "lastMove": "2026-10-16"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 0.46,
      "change30d": 12.5,
      "lastMove": "2026-09-29"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.63,
      "change30d": -13.5,
      "lastMove": "2026-10-08"
     }
    ],
    "exchangeNetFlow30d": -29414888,
    "summary": "Large holders moved a net $29.4M off exchanges over 30 days, usually a sign of holding rather than selling."
   },
   "changes": {
    "summary": "Score up 5 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "norvane": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 2.96,
      "change30d": -2.1,
      "lastMove": "2026-10-09"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.14,
      "change30d": 5.1,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.15,
      "change30d": -15.8,
      "lastMove": "2026-10-06"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 0.59,
      "change30d": 1.6,
      "lastMove": "2026-10-14"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.22,
      "change30d": 4.5,
      "lastMove": "2026-10-21"
     }
    ],
    "exchangeNetFlow30d": 8921631,
    "summary": "Large holders moved a net $8.9M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score down 2 points since the last report.",
    "notes": [
     "Developer activity slowed over the quarter.",
     "Holder concentration rose: the top 10 wallets hold more supply.",
     "Sell pressure built on rallies; flagged for the next review."
    ]
   }
  },
  "halvard": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 4.49,
      "change30d": 8.5,
      "lastMove": "2026-10-19"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 0.7,
      "change30d": -9.3,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.66,
      "change30d": 4.5,
      "lastMove": "2026-10-02"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 0.41,
      "change30d": -7.3,
      "lastMove": "2026-09-30"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.39,
      "change30d": -14,
      "lastMove": "2026-10-18"
     }
    ],
    "exchangeNetFlow30d": -3438615,
    "summary": "Large holders moved a net $3.4M off exchanges over 30 days, usually a sign of holding rather than selling."
   },
   "changes": {
    "summary": "Score up 4 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "tessaro": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 2.15,
      "change30d": 10.4,
      "lastMove": "2026-10-01"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 2.1,
      "change30d": -0.6,
      "lastMove": "2026-10-11"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.48,
      "change30d": 0,
      "lastMove": "2026-10-15"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 0.5,
      "change30d": -8.9,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.85,
      "change30d": -3.6,
      "lastMove": "2026-10-10"
     }
    ],
    "exchangeNetFlow30d": -5751349,
    "summary": "Large holders moved a net $5.8M off exchanges over 30 days, usually a sign of holding rather than selling."
   },
   "changes": {
    "summary": "Score up 3 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "vantis": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 2.31,
      "change30d": 0.8,
      "lastMove": "2026-10-21"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.98,
      "change30d": -14.2,
      "lastMove": "2026-10-07"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.19,
      "change30d": -0.4,
      "lastMove": "2026-10-19"
     },
     {
      "label": "Unlabeled whale 0xc4…75",
      "shareOfSupply": 1.02,
      "change30d": -0.3,
      "lastMove": "2026-10-09"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.14,
      "change30d": -8.5,
      "lastMove": "2026-10-03"
     }
    ],
    "exchangeNetFlow30d": 1294784,
    "summary": "Large holders moved a net $1.3M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score down 4 points since the last report.",
    "notes": [
     "Developer activity slowed over the quarter.",
     "Holder concentration rose: the top 10 wallets hold more supply.",
     "Sell pressure built on rallies; flagged for the next review."
    ]
   }
  },
  "calder": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 2.89,
      "change30d": 4.3,
      "lastMove": "2026-10-06"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.24,
      "change30d": -14.6,
      "lastMove": "2026-10-21"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.5,
      "change30d": 7.5,
      "lastMove": "2026-10-05"
     },
     {
      "label": "Unlabeled whale 0xc4…75",
      "shareOfSupply": 0.2,
      "change30d": -3.1,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.48,
      "change30d": -3.9,
      "lastMove": "2026-10-20"
     }
    ],
    "exchangeNetFlow30d": 6085224,
    "summary": "Large holders moved a net $6.1M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score up 3 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "meridel": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 0.85,
      "change30d": -5.5,
      "lastMove": "2026-10-11"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.08,
      "change30d": 12.8,
      "lastMove": "2026-10-12"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.94,
      "change30d": 4.5,
      "lastMove": "2026-10-08"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 1.09,
      "change30d": 10.9,
      "lastMove": "2026-10-07"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.15,
      "change30d": -6,
      "lastMove": "2026-10-12"
     }
    ],
    "exchangeNetFlow30d": 2445632,
    "summary": "Large holders moved a net $2.4M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score down 4 points since the last report.",
    "notes": [
     "Developer activity slowed over the quarter.",
     "Holder concentration rose: the top 10 wallets hold more supply.",
     "Sell pressure built on rallies; flagged for the next review."
    ]
   }
  },
  "quillon": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 3.73,
      "change30d": 8.6,
      "lastMove": "2026-10-10"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.05,
      "change30d": -8.7,
      "lastMove": "2026-10-05"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 1.18,
      "change30d": -17.1,
      "lastMove": "2026-10-15"
     },
     {
      "label": "Unlabeled whale 0xc4…76",
      "shareOfSupply": 0.84,
      "change30d": 1.4,
      "lastMove": "2026-10-17"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.79,
      "change30d": 9.3,
      "lastMove": "2026-10-05"
     }
    ],
    "exchangeNetFlow30d": 14731152,
    "summary": "Large holders moved a net $14.7M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score up 3 points since the last report.",
    "notes": [
     "On-chain activity improved: daily active addresses up quarter on quarter.",
     "Liquidity deepened on the main trading pairs.",
     "No new red flags in the scam screening."
    ]
   }
  },
  "orrisa": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 4.24,
      "change30d": 5,
      "lastMove": "2026-10-14"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 1.25,
      "change30d": 3.3,
      "lastMove": "2026-10-22"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.21,
      "change30d": 11.7,
      "lastMove": "2026-10-16"
     },
     {
      "label": "Unlabeled whale 0xc4…75",
      "shareOfSupply": 0.55,
      "change30d": -2.1,
      "lastMove": "2026-10-08"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.64,
      "change30d": -2.8,
      "lastMove": "2026-10-14"
     }
    ],
    "exchangeNetFlow30d": 1078484,
    "summary": "Large holders moved a net $1.1M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score down 7 points since the last report.",
    "notes": [
     "Developer activity slowed over the quarter.",
     "Holder concentration rose: the top 10 wallets hold more supply.",
     "Sell pressure built on rallies; flagged for the next review."
    ]
   }
  },
  "lumora": {
   "whales": {
    "wallets": [
     {
      "label": "Exchange cold wallet",
      "shareOfSupply": 4.1,
      "change30d": 9.2,
      "lastMove": "2026-10-14"
     },
     {
      "label": "Early investor",
      "shareOfSupply": 0.43,
      "change30d": -4.2,
      "lastMove": "2026-10-19"
     },
     {
      "label": "Treasury multisig",
      "shareOfSupply": 0.46,
      "change30d": -17.1,
      "lastMove": "2026-10-13"
     },
     {
      "label": "Unlabeled whale 0xc4…75",
      "shareOfSupply": 0.66,
      "change30d": 13.5,
      "lastMove": "2026-10-17"
     },
     {
      "label": "Market maker",
      "shareOfSupply": 0.15,
      "change30d": -10.4,
      "lastMove": "2026-10-14"
     }
    ],
    "exchangeNetFlow30d": 544853,
    "summary": "Large holders moved a net $0.5M onto exchanges over 30 days, which can come before selling."
   },
   "changes": {
    "summary": "Score down 3 points since the last report.",
    "notes": [
     "Developer activity slowed over the quarter.",
     "Holder concentration rose: the top 10 wallets hold more supply.",
     "Sell pressure built on rallies; flagged for the next review."
    ]
   }
  }
 },
 "indicators": {
  "btc": {
   "puell": {
    "bands": [
     {
      "max": 0.6,
      "label": "Low"
     },
     {
      "max": 2,
      "label": "Neutral"
     },
     {
      "max": null,
      "label": "High"
     }
    ],
    "weekly": [
     {
      "date": "2024-10-28",
      "value": 1.39
     },
     {
      "date": "2024-11-04",
      "value": 1.33
     },
     {
      "date": "2024-11-11",
      "value": 1.35
     },
     {
      "date": "2024-11-18",
      "value": 1.33
     },
     {
      "date": "2024-11-25",
      "value": 1.33
     },
     {
      "date": "2024-12-02",
      "value": 1.29
     },
     {
      "date": "2024-12-09",
      "value": 1.28
     },
     {
      "date": "2024-12-16",
      "value": 1.31
     },
     {
      "date": "2024-12-23",
      "value": 1.27
     },
     {
      "date": "2024-12-30",
      "value": 1.33
     },
     {
      "date": "2025-01-06",
      "value": 1.28
     },
     {
      "date": "2025-01-13",
      "value": 1.25
     },
     {
      "date": "2025-01-20",
      "value": 1.26
     },
     {
      "date": "2025-01-27",
      "value": 1.2
     },
     {
      "date": "2025-02-03",
      "value": 1.17
     },
     {
      "date": "2025-02-10",
      "value": 1.22
     },
     {
      "date": "2025-02-17",
      "value": 1.17
     },
     {
      "date": "2025-02-24",
      "value": 1.22
     },
     {
      "date": "2025-03-03",
      "value": 1.21
     },
     {
      "date": "2025-03-10",
      "value": 1.14
     },
     {
      "date": "2025-03-17",
      "value": 1.07
     },
     {
      "date": "2025-03-24",
      "value": 1.05
     },
     {
      "date": "2025-03-31",
      "value": 1.02
     },
     {
      "date": "2025-04-07",
      "value": 1.04
     },
     {
      "date": "2025-04-14",
      "value": 1.07
     },
     {
      "date": "2025-04-21",
      "value": 1.07
     },
     {
      "date": "2025-04-28",
      "value": 0.66
     },
     {
      "date": "2025-05-05",
      "value": 0.61
     },
     {
      "date": "2025-05-12",
      "value": 0.57
     },
     {
      "date": "2025-05-19",
      "value": 0.52
     },
     {
      "date": "2025-05-26",
      "value": 0.58
     },
     {
      "date": "2025-06-02",
      "value": 0.57
     },
     {
      "date": "2025-06-09",
      "value": 0.55
     },
     {
      "date": "2025-06-16",
      "value": 0.59
     },
     {
      "date": "2025-06-23",
      "value": 0.66
     },
     {
      "date": "2025-06-30",
      "value": 0.61
     },
     {
      "date": "2025-07-07",
      "value": 0.58
     },
     {
      "date": "2025-07-14",
      "value": 0.57
     },
     {
      "date": "2025-07-21",
      "value": 0.59
     },
     {
      "date": "2025-07-28",
      "value": 0.56
     },
     {
      "date": "2025-08-04",
      "value": 0.51
     },
     {
      "date": "2025-08-11",
      "value": 0.52
     },
     {
      "date": "2025-08-18",
      "value": 0.6
     },
     {
      "date": "2025-08-25",
      "value": 0.66
     },
     {
      "date": "2025-09-01",
      "value": 0.69
     },
     {
      "date": "2025-09-08",
      "value": 0.71
     },
     {
      "date": "2025-09-15",
      "value": 0.74
     },
     {
      "date": "2025-09-22",
      "value": 0.74
     },
     {
      "date": "2025-09-29",
      "value": 0.68
     },
     {
      "date": "2025-10-06",
      "value": 0.63
     },
     {
      "date": "2025-10-13",
      "value": 0.67
     },
     {
      "date": "2025-10-20",
      "value": 0.7
     },
     {
      "date": "2025-10-27",
      "value": 0.68
     },
     {
      "date": "2025-11-03",
      "value": 0.65
     },
     {
      "date": "2025-11-10",
      "value": 0.64
     },
     {
      "date": "2025-11-17",
      "value": 0.67
     },
     {
      "date": "2025-11-24",
      "value": 0.62
     },
     {
      "date": "2025-12-01",
      "value": 0.67
     },
     {
      "date": "2025-12-08",
      "value": 0.65
     },
     {
      "date": "2025-12-15",
      "value": 0.62
     },
     {
      "date": "2025-12-22",
      "value": 0.59
     },
     {
      "date": "2025-12-29",
      "value": 0.58
     },
     {
      "date": "2026-01-05",
      "value": 0.59
     },
     {
      "date": "2026-01-12",
      "value": 0.65
     },
     {
      "date": "2026-01-19",
      "value": 0.72
     },
     {
      "date": "2026-01-26",
      "value": 0.72
     },
     {
      "date": "2026-02-02",
      "value": 0.75
     },
     {
      "date": "2026-02-09",
      "value": 0.78
     },
     {
      "date": "2026-02-16",
      "value": 0.74
     },
     {
      "date": "2026-02-23",
      "value": 0.68
     },
     {
      "date": "2026-03-02",
      "value": 0.73
     },
     {
      "date": "2026-03-09",
      "value": 0.67
     },
     {
      "date": "2026-03-16",
      "value": 0.72
     },
     {
      "date": "2026-03-23",
      "value": 0.66
     },
     {
      "date": "2026-03-30",
      "value": 0.63
     },
     {
      "date": "2026-04-06",
      "value": 0.7
     },
     {
      "date": "2026-04-13",
      "value": 0.77
     },
     {
      "date": "2026-04-20",
      "value": 0.77
     },
     {
      "date": "2026-04-27",
      "value": 0.75
     },
     {
      "date": "2026-05-04",
      "value": 0.77
     },
     {
      "date": "2026-05-11",
      "value": 0.74
     },
     {
      "date": "2026-05-18",
      "value": 0.77
     },
     {
      "date": "2026-05-25",
      "value": 0.73
     },
     {
      "date": "2026-06-01",
      "value": 0.72
     },
     {
      "date": "2026-06-08",
      "value": 0.76
     },
     {
      "date": "2026-06-15",
      "value": 0.76
     },
     {
      "date": "2026-06-22",
      "value": 0.8
     },
     {
      "date": "2026-06-29",
      "value": 0.83
     },
     {
      "date": "2026-07-06",
      "value": 0.88
     },
     {
      "date": "2026-07-13",
      "value": 0.83
     },
     {
      "date": "2026-07-20",
      "value": 0.79
     },
     {
      "date": "2026-07-27",
      "value": 0.82
     },
     {
      "date": "2026-08-03",
      "value": 0.83
     },
     {
      "date": "2026-08-10",
      "value": 0.79
     },
     {
      "date": "2026-08-17",
      "value": 0.77
     },
     {
      "date": "2026-08-24",
      "value": 0.78
     },
     {
      "date": "2026-08-31",
      "value": 0.85
     },
     {
      "date": "2026-09-07",
      "value": 0.89
     },
     {
      "date": "2026-09-14",
      "value": 0.87
     },
     {
      "date": "2026-09-21",
      "value": 0.92
     },
     {
      "date": "2026-09-28",
      "value": 0.92
     },
     {
      "date": "2026-10-05",
      "value": 0.92
     },
     {
      "date": "2026-10-12",
      "value": 0.9
     },
     {
      "date": "2026-10-19",
      "value": 0.92
     }
    ]
   },
   "rainbow": {
    "genesis": "2009-01-09",
    "fit": {
     "slope": 2.32871,
     "intercept": -15.30961,
     "note": "log10(price) = slope × ln(days since genesis) + intercept"
    },
    "bands": [
     {
      "label": "Basically a Fire Sale",
      "from": -0.4839,
      "to": -0.3197
     },
     {
      "label": "BUY!",
      "from": -0.3197,
      "to": -0.1555
     },
     {
      "label": "Accumulate",
      "from": -0.1555,
      "to": 0.0087
     },
     {
      "label": "Still cheap",
      "from": 0.0087,
      "to": 0.1728
     },
     {
      "label": "HODL!",
      "from": 0.1728,
      "to": 0.337
     },
     {
      "label": "Is this a bubble?",
      "from": 0.337,
      "to": 0.5012
     },
     {
      "label": "FOMO intensifies",
      "from": 0.5012,
      "to": 0.6653
     },
     {
      "label": "Sell. Seriously, SELL!",
      "from": 0.6653,
      "to": 0.8295
     },
     {
      "label": "Maximum Bubble Territory",
      "from": 0.8295,
      "to": 0.9937
     }
    ],
    "monthly": [
     {
      "month": "2012-01",
      "close": 5.5
     },
     {
      "month": "2012-02",
      "close": 6.342
     },
     {
      "month": "2012-03",
      "close": 6.657
     },
     {
      "month": "2012-04",
      "close": 7.175
     },
     {
      "month": "2012-05",
      "close": 7.772
     },
     {
      "month": "2012-06",
      "close": 8.093
     },
     {
      "month": "2012-07",
      "close": 9.203
     },
     {
      "month": "2012-08",
      "close": 10.2
     },
     {
      "month": "2012-09",
      "close": 13.458
     },
     {
      "month": "2012-10",
      "close": 19.417
     },
     {
      "month": "2012-11",
      "close": 27.04
     },
     {
      "month": "2012-12",
      "close": 34.686
     },
     {
      "month": "2013-01",
      "close": 49.998
     },
     {
      "month": "2013-02",
      "close": 67.397
     },
     {
      "month": "2013-03",
      "close": 93
     },
     {
      "month": "2013-04",
      "close": 93.86
     },
     {
      "month": "2013-05",
      "close": 92.473
     },
     {
      "month": "2013-06",
      "close": 94.122
     },
     {
      "month": "2013-07",
      "close": 98
     },
     {
      "month": "2013-08",
      "close": 186.6
     },
     {
      "month": "2013-09",
      "close": 306.1
     },
     {
      "month": "2013-10",
      "close": 587.3
     },
     {
      "month": "2013-11",
      "close": 1050
     },
     {
      "month": "2013-12",
      "close": 1010
     },
     {
      "month": "2014-01",
      "close": 895.9
     },
     {
      "month": "2014-02",
      "close": 825.7
     },
     {
      "month": "2014-03",
      "close": 829.4
     },
     {
      "month": "2014-04",
      "close": 733.6
     },
     {
      "month": "2014-05",
      "close": 702.4
     },
     {
      "month": "2014-06",
      "close": 640
     },
     {
      "month": "2014-07",
      "close": 568.7
     },
     {
      "month": "2014-08",
      "close": 478.7
     },
     {
      "month": "2014-09",
      "close": 406.3
     },
     {
      "month": "2014-10",
      "close": 366.1
     },
     {
      "month": "2014-11",
      "close": 306.2
     },
     {
      "month": "2014-12",
      "close": 268.1
     },
     {
      "month": "2015-01",
      "close": 220
     },
     {
      "month": "2015-02",
      "close": 222.8
     },
     {
      "month": "2015-03",
      "close": 228.1
     },
     {
      "month": "2015-04",
      "close": 254.4
     },
     {
      "month": "2015-05",
      "close": 273.1
     },
     {
      "month": "2015-06",
      "close": 257.5
     },
     {
      "month": "2015-07",
      "close": 290.3
     },
     {
      "month": "2015-08",
      "close": 304.2
     },
     {
      "month": "2015-09",
      "close": 297.3
     },
     {
      "month": "2015-10",
      "close": 314
     },
     {
      "month": "2015-11",
      "close": 335.3
     },
     {
      "month": "2015-12",
      "close": 356.3
     },
     {
      "month": "2016-01",
      "close": 400.5
     },
     {
      "month": "2016-02",
      "close": 433.1
     },
     {
      "month": "2016-03",
      "close": 482.5
     },
     {
      "month": "2016-04",
      "close": 497
     },
     {
      "month": "2016-05",
      "close": 572.6
     },
     {
      "month": "2016-06",
      "close": 622.3
     },
     {
      "month": "2016-07",
      "close": 655
     },
     {
      "month": "2016-08",
      "close": 678.9
     },
     {
      "month": "2016-09",
      "close": 786
     },
     {
      "month": "2016-10",
      "close": 809.1
     },
     {
      "month": "2016-11",
      "close": 864
     },
     {
      "month": "2016-12",
      "close": 960
     },
     {
      "month": "2017-01",
      "close": 1167
     },
     {
      "month": "2017-02",
      "close": 1342
     },
     {
      "month": "2017-03",
      "close": 1584
     },
     {
      "month": "2017-04",
      "close": 1846
     },
     {
      "month": "2017-05",
      "close": 2239
     },
     {
      "month": "2017-06",
      "close": 2480
     },
     {
      "month": "2017-07",
      "close": 3225
     },
     {
      "month": "2017-08",
      "close": 4264
     },
     {
      "month": "2017-09",
      "close": 5731
     },
     {
      "month": "2017-10",
      "close": 7878
     },
     {
      "month": "2017-11",
      "close": 10612
     },
     {
      "month": "2017-12",
      "close": 13800
     },
     {
      "month": "2018-01",
      "close": 12119
     },
     {
      "month": "2018-02",
      "close": 10939
     },
     {
      "month": "2018-03",
      "close": 9189
     },
     {
      "month": "2018-04",
      "close": 8317
     },
     {
      "month": "2018-05",
      "close": 7286
     },
     {
      "month": "2018-06",
      "close": 6400
     },
     {
      "month": "2018-07",
      "close": 6126
     },
     {
      "month": "2018-08",
      "close": 5053
     },
     {
      "month": "2018-09",
      "close": 5176
     },
     {
      "month": "2018-10",
      "close": 4346
     },
     {
      "month": "2018-11",
      "close": 4092
     },
     {
      "month": "2018-12",
      "close": 3740
     },
     {
      "month": "2019-01",
      "close": 4490
     },
     {
      "month": "2019-02",
      "close": 5639
     },
     {
      "month": "2019-03",
      "close": 6284
     },
     {
      "month": "2019-04",
      "close": 7796
     },
     {
      "month": "2019-05",
      "close": 8747
     },
     {
      "month": "2019-06",
      "close": 10800
     },
     {
      "month": "2019-07",
      "close": 9577
     },
     {
      "month": "2019-08",
      "close": 8935
     },
     {
      "month": "2019-09",
      "close": 8980
     },
     {
      "month": "2019-10",
      "close": 8661
     },
     {
      "month": "2019-11",
      "close": 7887
     },
     {
      "month": "2019-12",
      "close": 7200
     },
     {
      "month": "2020-01",
      "close": 6950
     },
     {
      "month": "2020-02",
      "close": 7078
     },
     {
      "month": "2020-03",
      "close": 6430
     },
     {
      "month": "2020-04",
      "close": 7783
     },
     {
      "month": "2020-05",
      "close": 8945
     },
     {
      "month": "2020-06",
      "close": 10863
     },
     {
      "month": "2020-07",
      "close": 13208
     },
     {
      "month": "2020-08",
      "close": 15404
     },
     {
      "month": "2020-09",
      "close": 16674
     },
     {
      "month": "2020-10",
      "close": 21856
     },
     {
      "month": "2020-11",
      "close": 24684
     },
     {
      "month": "2020-12",
      "close": 29000
     },
     {
      "month": "2021-01",
      "close": 33103
     },
     {
      "month": "2021-02",
      "close": 41647
     },
     {
      "month": "2021-03",
      "close": 49206
     },
     {
      "month": "2021-04",
      "close": 57700
     },
     {
      "month": "2021-05",
      "close": 49979
     },
     {
      "month": "2021-06",
      "close": 45449
     },
     {
      "month": "2021-07",
      "close": 41500
     },
     {
      "month": "2021-08",
      "close": 48600
     },
     {
      "month": "2021-09",
      "close": 52292
     },
     {
      "month": "2021-10",
      "close": 61300
     },
     {
      "month": "2021-11",
      "close": 55713
     },
     {
      "month": "2021-12",
      "close": 46334
     },
     {
      "month": "2022-01",
      "close": 39022
     },
     {
      "month": "2022-02",
      "close": 35135
     },
     {
      "month": "2022-03",
      "close": 32005
     },
     {
      "month": "2022-04",
      "close": 25655
     },
     {
      "month": "2022-05",
      "close": 22373
     },
     {
      "month": "2022-06",
      "close": 19800
     },
     {
      "month": "2022-07",
      "close": 18893
     },
     {
      "month": "2022-08",
      "close": 18962
     },
     {
      "month": "2022-09",
      "close": 17225
     },
     {
      "month": "2022-10",
      "close": 17092
     },
     {
      "month": "2022-11",
      "close": 16218
     },
     {
      "month": "2022-12",
      "close": 16550
     },
     {
      "month": "2023-01",
      "close": 17763
     },
     {
      "month": "2023-02",
      "close": 20006
     },
     {
      "month": "2023-03",
      "close": 22877
     },
     {
      "month": "2023-04",
      "close": 23499
     },
     {
      "month": "2023-05",
      "close": 27881
     },
     {
      "month": "2023-06",
      "close": 30500
     },
     {
      "month": "2023-07",
      "close": 31749
     },
     {
      "month": "2023-08",
      "close": 32717
     },
     {
      "month": "2023-09",
      "close": 36859
     },
     {
      "month": "2023-10",
      "close": 36556
     },
     {
      "month": "2023-11",
      "close": 40955
     },
     {
      "month": "2023-12",
      "close": 42300
     },
     {
      "month": "2024-01",
      "close": 50405
     },
     {
      "month": "2024-02",
      "close": 59590
     },
     {
      "month": "2024-03",
      "close": 71300
     },
     {
      "month": "2024-04",
      "close": 67526
     },
     {
      "month": "2024-05",
      "close": 69468
     },
     {
      "month": "2024-06",
      "close": 62876
     },
     {
      "month": "2024-07",
      "close": 58380
     },
     {
      "month": "2024-08",
      "close": 58900
     },
     {
      "month": "2024-09",
      "close": 64836
     },
     {
      "month": "2024-10",
      "close": 75236
     },
     {
      "month": "2024-11",
      "close": 87790
     },
     {
      "month": "2024-12",
      "close": 93400
     },
     {
      "month": "2025-01",
      "close": 92036
     },
     {
      "month": "2025-02",
      "close": 93602
     },
     {
      "month": "2025-03",
      "close": 95445
     },
     {
      "month": "2025-04",
      "close": 94200
     },
     {
      "month": "2025-05",
      "close": 99329
     },
     {
      "month": "2025-06",
      "close": 107518
     },
     {
      "month": "2025-07",
      "close": 101551
     },
     {
      "month": "2025-08",
      "close": 103599
     },
     {
      "month": "2025-09",
      "close": 114000
     },
     {
      "month": "2025-10",
      "close": 106376
     },
     {
      "month": "2025-11",
      "close": 98026
     },
     {
      "month": "2025-12",
      "close": 96800
     },
     {
      "month": "2026-01",
      "close": 91176
     },
     {
      "month": "2026-02",
      "close": 89840
     },
     {
      "month": "2026-03",
      "close": 87285
     },
     {
      "month": "2026-04",
      "close": 88400
     },
     {
      "month": "2026-05",
      "close": 96102
     },
     {
      "month": "2026-06",
      "close": 98786
     },
     {
      "month": "2026-07",
      "close": 104600
     },
     {
      "month": "2026-08",
      "close": 105143
     },
     {
      "month": "2026-09",
      "close": 103293
     },
     {
      "month": "2026-10",
      "close": 98420
     }
    ]
   }
  }
 }
};

/*
 * Enterprise custom report orders (sample). Stage keys come from
 * components/dashboard/report-stages.config.js. Each order: id, token
 * {name, ticker}, orderedAt, estimatedDelivery (2-3 business days after
 * the order), status ("in_progress" or "delivered"), stage (current stage
 * key), stageProgress (0-1 through the current stage), history [{stage,
 * startedAt, completedAt}], files {pdf, docx, view} once delivered.
 * Times in UTC.
 */
window.CA_DASHBOARD_SAMPLE.reports = [
 {
  "id": "CR-2026-1042",
  "token": { "name": "Kestrel Chain", "ticker": "KSC" },
  "orderedAt": "2026-10-22T15:10:00Z",
  "estimatedDelivery": "2026-10-27",
  "status": "in_progress",
  "stage": "writing",
  "stageProgress": 0.35,
  "history": [
   { "stage": "received", "startedAt": "2026-10-22T15:10:00Z", "completedAt": "2026-10-22T15:10:00Z" },
   { "stage": "collection", "startedAt": "2026-10-22T15:10:00Z", "completedAt": "2026-10-23T09:40:00Z" },
   { "stage": "forensics", "startedAt": "2026-10-23T09:40:00Z", "completedAt": "2026-10-23T18:25:00Z" },
   { "stage": "scoring", "startedAt": "2026-10-23T18:25:00Z", "completedAt": "2026-10-24T14:05:00Z" },
   { "stage": "writing", "startedAt": "2026-10-24T14:05:00Z", "completedAt": null }
  ],
  "files": null
 },
 {
  "id": "CR-2026-1047",
  "token": { "name": "Norvane", "ticker": "NRV" },
  "orderedAt": "2026-10-23T10:30:00Z",
  "estimatedDelivery": "2026-10-28",
  "status": "in_progress",
  "stage": "collection",
  "stageProgress": 0.05,
  "history": [
   { "stage": "received", "startedAt": "2026-10-23T10:30:00Z", "completedAt": "2026-10-23T10:30:00Z" },
   { "stage": "collection", "startedAt": "2026-10-23T10:30:00Z", "completedAt": null }
  ],
  "files": null
 },
 {
  "id": "CR-2026-1031",
  "token": { "name": "Halvard", "ticker": "HLV" },
  "orderedAt": "2026-10-19T09:00:00Z",
  "estimatedDelivery": "2026-10-21",
  "status": "delivered",
  "stage": "delivered",
  "stageProgress": 1,
  "history": [
   { "stage": "received", "startedAt": "2026-10-19T09:00:00Z", "completedAt": "2026-10-19T09:00:00Z" },
   { "stage": "collection", "startedAt": "2026-10-19T09:00:00Z", "completedAt": "2026-10-19T16:45:00Z" },
   { "stage": "forensics", "startedAt": "2026-10-19T16:45:00Z", "completedAt": "2026-10-20T11:20:00Z" },
   { "stage": "scoring", "startedAt": "2026-10-20T11:20:00Z", "completedAt": "2026-10-20T19:05:00Z" },
   { "stage": "writing", "startedAt": "2026-10-20T19:05:00Z", "completedAt": "2026-10-21T12:30:00Z" },
   { "stage": "review", "startedAt": "2026-10-21T12:30:00Z", "completedAt": "2026-10-21T16:20:00Z" },
   { "stage": "delivered", "startedAt": "2026-10-21T16:20:00Z", "completedAt": "2026-10-21T16:20:00Z" }
  ],
  "files": { "pdf": "#", "docx": "#", "view": "#" }
 }
];
