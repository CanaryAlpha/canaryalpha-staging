/*
 * Hero visuals: the animation in the homepage hero, and every label, range
 * and timing the three options use. Edit here; hero-visuals.js and the three
 * option files (hero-early-warning.js, hero-verdict.js, hero-noise.js) read
 * this. All data is fictional.
 *
 * Load order on a page: feature-visuals.config.js (the verdict option reuses
 * its scoring categories and verdict bands), this file, the option files,
 * then hero-visuals.js.
 */
window.CA_HERO_VISUALS = {
  // Which option the homepage hero shows: "early-warning", "verdict" or
  // "noise". For a quick look without editing, add ?hero=verdict (or
  // ?hero=noise) to the homepage address.
  heroVariant: "early-warning",

  // Timing, in milliseconds. Each run plays, holds its final state for
  // `hold`, fades out over `fade`, then replays with new results. Runs only
  // while on screen and the tab is visible.
  cycle: {
    hold: 2500,
    fade: 900,
    // Fixes the first run's results; replays are random.
    seed: 411
  },

  // 1. Early warning: on-chain activity ticks along under a price line. One
  // marker flags a signal; about `lag` later the price reacts.
  "early-warning": {
    duration: 8500,           // the line crossing the full width
    markers: 34,              // activity ticks along the bottom
    lag: { min: 1300, max: 1800 },
    // Where the flagged marker sits, as a share of the width.
    signalAt: { min: 0.36, max: 0.54 },
    // Share of runs with a positive signal (green, price rises).
    positiveChance: 0.3,
    // How far the price moves after the signal, as a share of its range.
    move: { min: 0.22, max: 0.36 },
    priceLabel: "Price",
    activityLabel: "On-chain activity",
    // {amount} is filled in each run from `amount` (millions, like 3.1M);
    // {pct} from `pct`.
    amount: { min: 1.2, max: 8.4 },
    pct: { min: 18, max: 64 },
    negative: [
      "Whale moved {amount} to exchange",
      "Treasury unlock: {amount} tokens",
      "Dev activity stalled",
      "Liquidity pulled from main pool",
      "Insider wallets selling {amount}",
      "Team silent for 6 weeks"
    ],
    positive: [
      "Exchange outflows: {amount} tokens",
      "Long-term holders accumulating",
      "Dev activity up {pct}%",
      "Whale withdrew {amount} to cold storage"
    ]
  },

  // 2. Report verdict: a report card fills in. Scores, total and verdict
  // come from feature-visuals.config.js (scoring), so they match the
  // "80-point scoring framework" visual further down the page.
  verdict: {
    caption: "Example report",
    // Fictional tokens, one per run.
    tokens: ["Norvane (NRV)", "Quillon (QLN)", "Tessaro (TSR)", "Halvard (HLV)",
      "Orrisa (ORS)", "Kestrel Chain (KSC)", "Meridel (MRD)"],
    totalLabel: "Total",
    verdictLabel: "Verdict"
  },

  // 3. Signal from noise: scattered points gather into one line that ends
  // at a verdict marker, then scatter again. The line's end height follows
  // the score (higher score, higher end); the verdict uses the same bands.
  noise: {
    // Gathering plus the line and verdict fading in; then `cycle.hold`,
    // then the points scatter (2 s) and the next run gathers.
    duration: 6200,
    points: { phone: 70, desktop: 130 },
    verdictLabel: "Verdict"
  }
};
