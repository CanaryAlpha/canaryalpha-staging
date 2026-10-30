/*
 * Every word and number shown in the clips. Edit here; the animations adapt
 * (bar lengths, counters and totals are computed from these values).
 */

export type Clip = { id: string; file: string; title: string; tagline: string };

// ---- Clip 1: 80-point scoring framework ------------------------------------
export const scoring = {
  id: "Scoring",
  file: "01-scoring-framework",
  title: "80-point scoring framework",
  tagline: "Six weighted categories. One clear verdict.",
  heading: "Token score",
  // weight = the points a category is worth; score = points awarded.
  // The weights add up to the maximum (80) shown on the counter.
  categories: [
    { name: "Fundamentals", weight: 20, score: 16 },
    { name: "Tokenomics", weight: 15, score: 12 },
    { name: "On-Chain", weight: 15, score: 11 },
    { name: "Team", weight: 10, score: 8 },
    { name: "Market", weight: 10, score: 8 },
    { name: "Risk", weight: 10, score: 7 },
  ],
  verdict: "ACCUMULATE",
  verdictTone: "success" as "success" | "warning" | "ink",
};

// ---- Clip 2: On-chain forensics --------------------------------------------
// Positions are on the 1080 x 1080 stage (x, y in px).
export const forensics = {
  id: "Forensics",
  file: "02-onchain-forensics",
  title: "On-chain forensics",
  tagline: "See what insiders do, not what they say.",
  heading: "Wallet flows",
  nodes: [
    { id: "whale", label: "Whale", kind: "source", x: 230, y: 330, r: 58 },
    { id: "treasury", label: "Treasury", kind: "source", x: 230, y: 640, r: 58 },
    { id: "w1", label: "", kind: "wallet", x: 520, y: 250, r: 14 },
    { id: "w2", label: "", kind: "wallet", x: 540, y: 460, r: 14 },
    { id: "w3", label: "Fresh wallet", kind: "wallet", x: 560, y: 680, r: 16 },
    { id: "exA", label: "Exchange A", kind: "exchange", x: 860, y: 250, r: 40 },
    { id: "exB", label: "Exchange B", kind: "exchange", x: 860, y: 470, r: 40 },
    { id: "exC", label: "Exchange C", kind: "exchange", x: 860, y: 690, r: 40 },
  ],
  // Edges with particles flowing from `from` to `to`.
  edges: [
    { from: "whale", to: "w1" },
    { from: "w1", to: "exA" },
    { from: "whale", to: "w2" },
    { from: "w2", to: "exB" },
    { from: "treasury", to: "w2" },
    { from: "treasury", to: "w3" },
    { from: "w3", to: "exC" },
    { from: "w2", to: "exA" },
  ],
  // The suspicious route the scanner traces, node by node.
  suspiciousPath: ["treasury", "w3", "exC"],
  callout: { title: "Treasury → Exchange", value: "4.2M tokens", note: "Routed through a fresh wallet" },
};

// ---- Clip 3: Scam screening ------------------------------------------------
export const screening = {
  id: "Screening",
  file: "03-scam-screening",
  title: "Scam screening",
  tagline: "Six red flags, caught early.",
  heading: "Red-flag screen",
  // status "pass" gets a green check; "flag" flips to a red flag.
  items: [
    { label: "Developer activity", status: "pass" },
    { label: "Team communication", status: "flag" },
    { label: "Contract permissions", status: "pass" },
    { label: "Liquidity lock", status: "pass" },
    { label: "Holder concentration", status: "pass" },
    { label: "Hidden sell pressure", status: "flag" },
  ] as { label: string; status: "pass" | "flag" }[],
  chart: {
    title: "Hidden sell pressure",
    priceLabel: "Price",
    volumeLabel: "Sell volume",
    // 0..1 values, left to right: the price keeps rising while sells grow.
    price: [0.18, 0.24, 0.22, 0.31, 0.36, 0.34, 0.45, 0.52, 0.58, 0.66, 0.72, 0.8],
    sellVolume: [0.12, 0.14, 0.13, 0.2, 0.24, 0.3, 0.36, 0.45, 0.55, 0.64, 0.78, 0.92],
  },
};

// ---- Clip 4: Built to revisit ----------------------------------------------
export const revisit = {
  id: "Revisit",
  file: "04-built-to-revisit",
  title: "Built to revisit",
  tagline: "Quarterly updates. Your thesis stays current.",
  heading: "Quarterly update",
  asset: "Example Protocol",
  previous: { quarter: "Q2", label: "Q2 2026 report" },
  current: { quarter: "Q3", label: "Q3 2026 report" },
  // before/after per metric; `delta` shows only when it changed.
  // tone: "up" (green ▲) or "down" (green ▼, an improvement) or none.
  metrics: [
    { name: "Score", before: "56 / 80", after: "62 / 80", delta: "▲ +6 score", tone: "good" },
    { name: "Risk flags", before: "2", after: "1", delta: "▼ risk flag resolved", tone: "good" },
    { name: "Verdict", before: "HOLD", after: "ACCUMULATE", delta: "Upgraded", tone: "good" },
    { name: "Unlock schedule", before: "On track", after: "On track", delta: "", tone: "" },
  ],
  whatChanged: [
    "Team wallet sales stopped; the flag is resolved",
    "Treasury runway extended to 30 months",
    "Exchange inflows back to normal levels",
  ],
  timeline: ["Q1", "Q2", "Q3", "Q4"],
};

export const clips: Clip[] = [scoring, forensics, screening, revisit];
