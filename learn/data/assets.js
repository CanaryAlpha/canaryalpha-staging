/*
 * TODO: replace sample content.
 *
 * Asset pages' education content, keyed by asset id (the ids in
 * dashboard/dashboard-data.js).
 *
 *   takeaways  3 plain-English bullets for the Key takeaways box at the top
 *              of the asset page (everyone sees these)
 *   bull       The case for: 2–3 bullets
 *   bear       The case against: 2–3 bullets
 *   risks      Key risks: 2–3 bullets
 *              (bull, bear and risks are the "case for and against"; who sees
 *              it in full: components/learn/access.config.js)
 *   video      the asset's explainer video id (learn/data/videos.js), if any
 *   reading    2–3 reading-list ids (learn/data/reading.js)
 *
 * Always balanced: as much space for the case against as for the case for.
 * Describe the evidence; never say an asset is a good investment or tell
 * anyone to buy or sell. Every asset after Ethereum is FICTIONAL sample data.
 */
window.CA_LEARN_ASSETS = {
  btc: {
    takeaways: [
      "Bitcoin is the largest cryptocurrency, with a fixed supply of 21 million coins.",
      "Big investors moved coins off exchanges this month, which often means holding.",
      "Its price is well below its all-time high, a reminder of how far it can swing."
    ],
    bull: [
      "The longest track record in crypto, with a network that has run since 2009.",
      "A fixed supply and growing access through spot ETFs and large institutions.",
      "Wide ownership and deep liquidity across many exchanges."
    ],
    bear: [
      "It earns no cash flow, so its price rests on demand alone.",
      "Mining uses a lot of energy, which draws criticism and regulation.",
      "Large holders and funds can move the price when they buy or sell."
    ],
    risks: [
      "Past falls of more than 70% from a high.",
      "Changes in regulation or tax rules in major markets.",
      "Losing access to coins through hacks, scams or lost keys."
    ],
    video: "bitcoin-explained",
    reading: ["r2", "r3", "r9"]
  },
  eth: {
    takeaways: [
      "Ethereum runs programs called smart contracts, which power many crypto apps.",
      "Big investors moved coins onto exchanges this month, which can mean selling ahead.",
      "It is secured by staking, and its use depends on apps people choose to build there."
    ],
    bull: [
      "The largest platform for crypto apps, stablecoins and tokenized assets.",
      "Staking rewards and fee burning shape its supply.",
      "A large, active developer community."
    ],
    bear: [
      "Strong competition from faster or cheaper blockchains.",
      "Activity is spreading to separate networks built on top of it.",
      "Fees can rise sharply when the network is busy."
    ],
    risks: [
      "Bugs in smart contracts that apps depend on.",
      "Changing rules for staking in different countries.",
      "Price swings that have exceeded Bitcoin's in past downturns."
    ],
    video: "ethereum-explained",
    reading: ["r4", "r5", "r3"]
  },

  /* ---- Fictional sample tokens (Pro dashboard) ------------------------- */
  kestrel: {
    takeaways: [
      "Kestrel Chain is a fictional token with our highest sample score.",
      "Large holders moved coins off exchanges this month.",
      "Its score rose since the last report."
    ],
    bull: ["Steady developer activity in the sample data.", "Wide spread of holders."],
    bear: ["A young network with a short track record.", "Competes with larger, better-known chains."],
    risks: ["Token unlocks for early investors later this year.", "Thinner liquidity than the largest coins."],
    reading: ["r1", "r10"]
  },
  norvane: {
    takeaways: [
      "Norvane is a fictional token in our Conditional Hold band.",
      "Large holders moved coins onto exchanges this month.",
      "Its score slipped slightly since the last report."
    ],
    bull: ["Solid fundamentals in the sample report.", "An active community and regular updates."],
    bear: ["Exchange inflows from large holders.", "Fees earned have flattened."],
    risks: ["Possible selling from large holders.", "Competition from similar projects."],
    reading: ["r8", "r10"]
  },
  halvard: {
    takeaways: [
      "Halvard is a fictional token with a strong sample score.",
      "Large holders moved coins off exchanges this month.",
      "Its score rose since the last report."
    ],
    bull: ["Strong on-chain activity in the sample data.", "Clear rules for how the token supply grows."],
    bear: ["A large share of supply sits with early backers.", "Limited listings outside a few exchanges."],
    risks: ["Holder concentration.", "Liquidity that could thin in a sell-off."],
    reading: ["r8", "r10"]
  },
  tessaro: {
    takeaways: [
      "Tessaro is a fictional token in our Conditional Hold band.",
      "Large holders moved coins off exchanges this month.",
      "Its score rose since the last report."
    ],
    bull: ["Improving tokenomics in the latest sample report.", "Steady trading volume."],
    bear: ["Usage is still small for its size.", "The team communicates irregularly."],
    risks: ["Token unlocks ahead.", "Reliance on a small developer team."],
    reading: ["r1", "r10"]
  },
  vantis: {
    takeaways: [
      "Vantis is a fictional token in our Conditional Hold band.",
      "Large holders moved coins onto exchanges this month.",
      "Its score fell since the last report."
    ],
    bull: ["An established product in the sample data.", "Listed on several exchanges."],
    bear: ["Score down since the last report.", "Developer activity has slowed."],
    risks: ["Exchange inflows from large holders.", "Admin keys still held by the team."],
    reading: ["r7", "r10"]
  },
  calder: {
    takeaways: [
      "Calder is a fictional token on our Watch List.",
      "Large holders moved coins onto exchanges this month.",
      "Its score rose a little since the last report."
    ],
    bull: ["Some recovery in the latest sample score.", "Growing trading volume."],
    bear: ["Weak fundamentals in the sample report.", "Concentrated ownership."],
    risks: ["Hidden sell pressure flagged in the sample screening.", "Thin liquidity."],
    reading: ["r7", "r10"]
  },
  meridel: {
    takeaways: [
      "Meridel is a fictional token in our Conditional Hold band.",
      "Large holders moved coins onto exchanges this month.",
      "Its score fell since the last report."
    ],
    bull: ["Reasonable market structure in the sample data.", "Regular team updates."],
    bear: ["Score down since the last report.", "Usage has flattened."],
    risks: ["Selling from large holders.", "Competition from bigger projects."],
    reading: ["r8", "r10"]
  },
  quillon: {
    takeaways: [
      "Quillon is a fictional token on our Watch List.",
      "Trading is unusually busy for its size.",
      "Large holders moved coins onto exchanges this month."
    ],
    bull: ["Strong interest from traders in the sample data.", "Score up since the last report."],
    bear: ["Busy trading can come from a few large accounts.", "Exchange inflows from large holders."],
    risks: ["Sharp price swings.", "Holder concentration."],
    reading: ["r8", "r7"]
  },
  orrisa: {
    takeaways: [
      "Orrisa is a fictional token in our Avoid band.",
      "Its score fell sharply since the last report.",
      "Our sample screening raised several red flags."
    ],
    bull: ["Still listed on major exchanges in the sample data.", "Some developer activity continues."],
    bear: ["Several red flags in the sample screening.", "Score down 7 points since the last report."],
    risks: ["Admin keys still active.", "Very thin liquidity."],
    reading: ["r7", "r6"]
  },
  lumora: {
    takeaways: [
      "Lumora is a fictional token with our lowest sample score.",
      "Its score fell since the last report.",
      "The team has been quiet for months in the sample data."
    ],
    bull: ["A small, loyal community in the sample data.", "Low fees to use the network."],
    bear: ["Little developer activity.", "Silent team communication."],
    risks: ["Project could be abandoned.", "Very concentrated ownership."],
    reading: ["r7", "r6"]
  }
};
