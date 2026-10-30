/*
 * Feature visuals: every label, number range, band and probability the four
 * animations use, plus their timing. Edit here; feature-visuals.js reads
 * this and draws the visuals.
 *
 * Each visual replays on a cycle with fresh, randomly generated results.
 * The first run is always the same (it uses `seed`); replays are random.
 * All values are placeholders until the real research data is in.
 *
 * Load this file before feature-visuals.js on any page that uses them.
 */
window.CA_FEATURE_VISUALS = {
  // Timing, in milliseconds. Each run animates, holds its final state for
  // `hold`, fades out over `reset`, then replays with new results; the
  // animation stretches to fill whatever is left of `length`. Visuals only
  // run while on screen (and the tab is visible).
  cycle: {
    length: 10000,
    hold: 2000,
    reset: 1000,
    // Delay before each visual's first run, times its position on the page
    // (0, 1, 2, 3), so visuals on screen together never reset in sync.
    stagger: 700,
    // Individual movements (a bar filling, a card sliding) may slow down by
    // up to this much to fill the cycle; the rest goes into the spacing.
    maxSlowdown: 1.4,
    // Fixes the first run's results (chosen to show each visual well).
    seed: 903
  },

  // 1. 80-point scoring framework. The six weights must add up to 80.
  // explain: the category's "Explain this" entry (learn/data/explainers.js),
  // shown as an icon when the page loads the education layer.
  scoring: {
    asset: "Example token",
    caption: "Research score",
    categories: [
      { name: "Fundamentals",        weight: 15, explain: "cat-fundamentals" },
      { name: "Tokenomics",          weight: 15, explain: "cat-tokenomics" },
      { name: "On-chain activity",   weight: 15, explain: "cat-onchain" },
      { name: "Team and governance", weight: 10, explain: "cat-team-governance" },
      { name: "Market structure",    weight: 15, explain: "cat-market-structure" },
      { name: "Risk controls",       weight: 10, explain: "cat-risk-controls" }
    ],
    // Each category scores about `center` of its weight on average; `spread`
    // widens or narrows the range (results cluster mid-range, extremes are
    // rare). No category scores below `floor` of its weight.
    center: 0.68,
    spread: 1.2,
    floor: 0.2,
    verdictLabel: "Verdict",
    // The verdict comes from the total: the first band whose `min` the total
    // reaches. Highest first. The update cards (4) use these verdicts too.
    bands: [
      { min: 64, label: "Deploy Investment" },
      { min: 52, label: "Conditional Hold" },
      { min: 40, label: "Watch List" },
      { min: 0,  label: "Avoid" }
    ]
  },

  // 2. On-chain forensics. Positions are % of the graph's width (x) and
  // height (y). kind: "whale", "treasury", "wallet" or "exchange". The
  // layout stays the same on every run; only the results change.
  forensics: {
    nodes: [
      { id: "w1", label: "Whale 1",    kind: "whale",    x: 10, y: 18 },
      { id: "w2", label: "Whale 2",    kind: "whale",    x: 10, y: 52 },
      { id: "t",  label: "Treasury",   kind: "treasury", x: 10, y: 86 },
      { id: "m1", label: "Wallet",     kind: "wallet",   x: 48, y: 30 },
      { id: "m2", label: "New wallet", kind: "wallet",   x: 48, y: 78 },
      { id: "e1", label: "Exchange A", kind: "exchange", x: 88, y: 22 },
      { id: "e2", label: "Exchange B", kind: "exchange", x: 88, y: 70 }
    ],
    flows: [
      { from: "w1", to: "m1" },
      { from: "w2", to: "m1" },
      { from: "m1", to: "e1" },
      { from: "w2", to: "e1" },
      { from: "t",  to: "m2" },
      { from: "m2", to: "e2" },
      { from: "m2", to: "e1" }
    ],
    // Paths that can be flagged, each a chain of node ids joined by flows
    // above. One is picked each run.
    suspects: [
      ["t", "m2", "e2"],
      ["t", "m2", "e1"],
      ["w2", "m1", "e1"],
      ["w1", "m1", "e1"],
      ["w2", "e1"]
    ],
    // Tokens moved along the flagged path, in millions (shown like 2.8M).
    amount: { min: 0.8, max: 9.6 },
    hours: [12, 24, 36, 48, 72],
    // Flow intensity: how fast and how strongly each flow runs (1 = full).
    intensity: { min: 0.45, max: 1 },
    annotation: {
      title: "Flagged path",
      // {path}, {amount} and {hours} are filled in each run.
      text: "{path}: {amount} tokens in {hours} hours."
    },
    legend: { flow: "Token flow", flagged: "Flagged" }
  },

  // 3. Scam screening. Each check shows `pass` or, if it trips, `flag`.
  // The check with `chart: true` drives the mini chart: tripped, price rises
  // while sell volume grows underneath; passed, volume stays healthy.
  // explain: the check's "Explain this" entry (learn/data/explainers.js).
  screening: {
    checks: [
      { label: "Contract ownership",   pass: "Renounced",    flag: "Admin keys live", explain: "contract-ownership" },
      { label: "Developer activity",   pass: "Active",       flag: "Inactive 4 months", explain: "developer-activity" },
      { label: "Team communication",   pass: "Regular",      flag: "Silent 9 weeks", explain: "team-communication" },
      { label: "Liquidity depth",      pass: "Healthy",      flag: "Thin", explain: "liquidity-depth" },
      { label: "Holder concentration", pass: "Within range", flag: "Top 10 hold 61%", explain: "holder-concentration" },
      { label: "Hidden sell pressure", pass: "None found",   flag: "Selling into the rise", chart: true, explain: "hidden-sell-pressure" }
    ],
    // Chance of 0, 1, 2 or 3 checks tripping on a run.
    flagOdds: [0.12, 0.38, 0.38, 0.12],
    summary: {
      none: "No red flags of 6",
      one: "1 red flag of 6",
      many: "{n} red flags of 6"
    },
    chart: {
      title: "Price vs. sell volume",
      priceLabel: "Price",
      volumeLabel: "Sell volume",
      points: 12,
      // Bars are drawn against this volume, so healthy volume looks low.
      volumeMax: 44
    }
  },

  // 4. Built to revisit. Each run is the next quarterly update: the new
  // report becomes the "previous" card of the following run.
  revisit: {
    asset: "Example token",
    previousLabel: "Previous report",
    currentLabel: "Latest update",
    // The first run compares this quarter with the one after it.
    start: { quarter: 2, year: 2026 },
    quarterFormat: "Q{q} {year}",
    // Score out of 80.
    score: { name: "Score", start: 58, change: { min: -8, max: 8 }, min: 24, max: 78 },
    // Each run, every value is nudged back toward its start by this share of
    // the gap, so values wander but don't get stuck at a limit.
    pull: 0.25,
    // The verdict comes from the score, using scoring.bands above.
    verdictName: "Verdict",
    upgraded: "Upgraded",
    downgraded: "Downgraded",
    // Other metrics: each changes on a run with probability `chance`, by an
    // amount within `change`, up or down, kept within min..max. Higher is
    // better for each, so up is green and down is red.
    metrics: [
      { name: "Liquidity depth",   start: 4.2, chance: 0.6, change: { min: 0.3, max: 1.6 },
        min: 0.8, max: 12, decimals: 1, prefix: "$", suffix: "M" },
      { name: "Developer commits", start: 46, chance: 0.6, change: { min: 4, max: 15 },
        min: 6, max: 120, decimals: 0, prefix: "", suffix: "/mo" }
    ]
  }
};
