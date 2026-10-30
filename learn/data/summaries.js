/*
 * TODO: replace sample content.
 *
 * Simple mode's one-line, plain-English summaries, shown under each metric
 * and section when a viewer chooses "Simple". Detailed mode hides them.
 *
 * Each entry is either one sentence, or "cases": one sentence per state,
 * where the page picks the case that fits today's data (the comment above
 * each entry lists them). Words in {braces} are filled in from the data;
 * keep them as they are. Education only: describe, never advise.
 */
window.CA_LEARN_SUMMARIES = {
  /* ---- Dashboards ------------------------------------------------------- */
  // Case: the index's current label.
  fearGreed: {
    cases: {
      "Extreme Fear": "The market mood is very fearful today ({value} of 100). Prices often swing sharply at times like this.",
      "Fear": "The market mood leans fearful today ({value} of 100). People are cautious, and moves can be jumpy.",
      "Neutral": "The market mood is balanced today ({value} of 100): neither fearful nor greedy.",
      "Greed": "The market mood leans greedy today ({value} of 100). Optimism is high, and moves can be quick.",
      "Extreme Greed": "The market mood is very greedy today ({value} of 100). Strong optimism has often come before sharp pullbacks."
    }
  },
  // Case: "in" (both funds took money in over 7 days), "out" (both lost
  // money), "mixed".
  etfFlows: {
    cases: {
      in: "Over the past week, more money went into bitcoin and ether funds than came out.",
      out: "Over the past week, more money left bitcoin and ether funds than came in.",
      mixed: "Over the past week, bitcoin funds had net {btcDir} while ether funds had net {ethDir}."
    }
  },
  marketMap: "Each bubble is a coin. Bigger bubbles are bigger coins; colour shows how the price moved or our verdict.",
  assets: "Each coin shows its price, how it moved, and its size. Open a coin to see its full page.",

  /* ---- Asset pages ------------------------------------------------------ */
  // {score} of 80; case: the verdict.
  score: {
    cases: {
      "Deploy Investment": "{name} scores {score} of 80, our highest band. The evidence we found is strong across most categories.",
      "Conditional Hold": "{name} scores {score} of 80: a solid result with some weak spots to keep an eye on.",
      "Watch List": "{name} scores {score} of 80: real concerns sit alongside some strengths.",
      "Avoid": "{name} scores {score} of 80, our lowest band. Our research found serious weaknesses."
    }
  },
  price: "{name} is {day} in the last day and {week} over the past week.",
  marketCap: "All the {name} in circulation is worth about {cap} at today's price.",
  // Case: "busy", "normal" or "quiet" trading for the coin's size.
  volume: {
    cases: {
      busy: "About {volume} of {name} changed hands in the last day. That's busy trading for a coin this size.",
      normal: "About {volume} of {name} changed hands in the last day, a normal amount for a coin this size.",
      quiet: "About {volume} of {name} changed hands in the last day. That's quiet trading for a coin this size."
    }
  },
  athAtl: "{name} is {fromAth} below its highest price, set in {athDate}, and far above its lowest.",
  // Case: the Puell band.
  puell: {
    cases: {
      Low: "Bitcoin miners are earning much less than usual. In the past, this has lined up with low points in the market.",
      Neutral: "Bitcoin miners are earning about what they usually do, so this signal is neutral right now.",
      High: "Bitcoin miners are earning far more than usual. In the past, this has lined up with high points in the market."
    }
  },
  // Case: "below", "on" or "above" the long-term trend.
  rainbow: {
    cases: {
      below: "Bitcoin's price is in the \"{band}\" band, under its long-term growth path.",
      on: "Bitcoin's price is in the \"{band}\" band, close to its long-term growth path.",
      above: "Bitcoin's price is in the \"{band}\" band, over its long-term growth path."
    }
  },
  exchanges: "These are the biggest places to trade {name}. Check fees and safety before using any exchange.",
  // Case: "onto" or "off" exchanges over 30 days.
  whales: {
    cases: {
      onto: "Big investors moved more {ticker} onto exchanges this month, which can mean selling ahead.",
      off: "Big investors moved more {ticker} off exchanges this month, which often means holding for longer."
    }
  },
  // Case: "up", "down" or "same".
  changed: {
    cases: {
      up: "Our score rose from {from} to {to} since the last report.",
      down: "Our score fell from {from} to {to} since the last report.",
      same: "Our score stayed at {to} since the last report."
    }
  },

  /* ---- Learn hub --------------------------------------------------------- */
  startHere: "Five short reads that take you from zero to reading our reports. Tick each one off as you go.",
  videos: "Short videos that explain crypto and our research in plain English.",
  reading: "Hand-picked articles from trusted outlets, summed up in a few lines.",
  glossary: "Every term we use, explained simply."
};
