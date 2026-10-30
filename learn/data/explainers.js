/*
 * TODO: replace sample content.
 *
 * "Explain this" glossary: one entry per term, keyed by its ID. Every
 * explainer icon on the site (dashboards, asset pages, homepage, the Learn
 * glossary) reads its text from here, so a definition written once is used
 * everywhere.
 *
 *   "term-id": {
 *     term:     the name shown as the popover's title
 *     group:    the Learn glossary's grouping label
 *     means:    What it means      (shown in Simple and Detailed)
 *     does:     What it does       (Detailed only)
 *     matters:  Why it matters     (shown in Simple and Detailed)
 *     changes:  How it changes the crypto space (Detailed only)
 *     learnMore: { video: "video-id" } or { article: "article-id" }   (optional;
 *               without it, "Learn more" opens this term in the Learn glossary)
 *   }
 *
 * Leave a section out (or empty) to hide it. Keep sentences short and plain.
 * Education only: describe, never tell the reader to buy or sell.
 */
window.CA_LEARN_EXPLAINERS = {
  /* ---- Market data ------------------------------------------------------ */
  "fear-greed": {
    term: "Fear & Greed Index",
    group: "Market data",
    means: "A single number from 0 to 100 that sums up the market's mood. Low numbers mean fear; high numbers mean greed.",
    does: "It blends signals such as price swings, trading volume and social chatter into one daily reading.",
    matters: "Moods swing faster than facts. Extreme fear or greed often comes with sharp, emotional price moves.",
    changes: "It gives newcomers a quick read on sentiment, which used to need several data feeds to see.",
    learnMore: { video: "read-dashboard" }
  },
  "etf-flows": {
    term: "Spot ETF flows",
    group: "Market data",
    means: "How much money moved into or out of exchange-traded funds that hold the actual coin, such as spot bitcoin ETFs.",
    does: "Each trading day the funds report creations and redemptions. Net inflow means more money came in than left.",
    matters: "ETFs are a main route for traditional investors. Steady flows in or out show how that group is behaving.",
    changes: "ETFs brought crypto into ordinary brokerage accounts, pension plans and advisers' portfolios.",
    learnMore: { video: "read-dashboard" }
  },
  "market-cap": {
    term: "Market cap",
    group: "Market data",
    means: "The total value of all coins in circulation: the price multiplied by the number of coins.",
    does: "It ranks assets by size, so you can compare a large network with a small one.",
    matters: "A bigger market cap usually means a coin is harder to move on its own and has a longer track record. It does not mean it is safer or better.",
    changes: "Market cap is how the industry measures itself, from single tokens to the whole crypto market."
  },
  "volume": {
    term: "Trading volume",
    group: "Market data",
    means: "The dollar value of a coin traded in a set period, usually the last 24 hours.",
    does: "It shows how actively a coin is being bought and sold across exchanges.",
    matters: "High volume makes it easier to trade without moving the price. A sudden jump can signal news, or a few large traders.",
    changes: "Volume compared with market cap helps spot coins where trading is unusually busy or unusually quiet."
  },
  "price-change": {
    term: "Price change",
    group: "Market data",
    means: "How much the price moved over a period, shown in percent and in dollars.",
    does: "Comparing several periods (1 hour to 1 year) shows whether a move is a blip or a trend.",
    matters: "Short-term moves are noisy. Longer periods give a calmer picture of where a coin has been.",
    changes: "Crypto trades every hour of every day, so prices can move while traditional markets are closed."
  },
  "ath-atl": {
    term: "All-time high and low",
    group: "Market data",
    means: "The highest and lowest prices a coin has ever traded at, with the dates.",
    does: "It shows how far today's price sits from its past extremes.",
    matters: "Big gaps from the high show how much a coin can fall, and how long recoveries can take.",
    changes: "Crypto's history of deep falls and new highs is why we always show both ends of the range."
  },
  "market-map": {
    term: "Market map",
    group: "Market data",
    means: "A bubble chart of the coins we cover. Bigger bubbles are bigger coins; colour shows the price change or our verdict.",
    does: "It lets you see the whole market at a glance and spot outliers quickly.",
    matters: "Patterns are easier to see in a picture than in a long table.",
    learnMore: { video: "read-dashboard" }
  },

  /* ---- Indicators ------------------------------------------------------- */
  "puell-multiple": {
    term: "Puell Multiple",
    group: "Indicators",
    means: "A Bitcoin indicator that compares what miners earn today with their average over the past year.",
    does: "Low readings mean miners earn less than usual; high readings mean they earn much more than usual.",
    matters: "Miners sell coins to pay their costs. Unusually high or low earnings have lined up with past market tops and bottoms. It is a historical pattern, not a forecast.",
    changes: "It turns public mining data into a simple gauge anyone can read.",
    learnMore: { video: "read-report" }
  },
  "rainbow-chart": {
    term: "Bitcoin Rainbow Price Chart",
    group: "Indicators",
    means: "A long-term Bitcoin price chart on a log scale, with coloured bands around a smooth growth curve.",
    does: "It shows whether today's price is high or low compared with Bitcoin's long-term path.",
    matters: "It helps put short-term moves in context. The bands are a visual guide built on past data, not a prediction.",
    changes: "It made long-term price history easy to read at a glance, and is widely shared for that reason."
  },

  /* ---- On-chain --------------------------------------------------------- */
  "whale-wallet": {
    term: "Whale wallet",
    group: "On-chain",
    means: "A wallet that holds enough of a coin that its buying or selling can move the price on its own.",
    does: "We track large wallets and when they move coins, especially onto or off exchanges.",
    matters: "Coins moved onto an exchange are often about to be sold. Coins moved off are often being stored.",
    changes: "Public blockchains let anyone watch big holders, something hidden in most traditional markets.",
    learnMore: { video: "read-report" }
  },
  "treasury": {
    term: "Treasury",
    group: "On-chain",
    means: "The pool of tokens or money a project keeps to pay for its own work, such as development and grants.",
    does: "It funds the team and the community over time, often from a shared wallet that needs several approvals.",
    matters: "A large treasury can fund years of work. Large sales from it can add supply to the market.",
    changes: "On-chain treasuries let anyone see how a project spends, which was rarely possible before."
  },
  "token-unlock": {
    term: "Token unlock",
    group: "On-chain",
    means: "A scheduled date when tokens held back for the team, investors or the treasury become free to trade.",
    does: "Unlocks add new tokens to the supply in steps, often monthly or yearly.",
    matters: "A large unlock can raise selling pressure if early holders decide to sell.",
    changes: "Published unlock schedules make supply changes predictable, so they can be planned for."
  },
  "holder-concentration": {
    term: "Holder concentration",
    group: "On-chain",
    means: "How much of a coin's supply sits in a small number of wallets.",
    does: "We measure the share held by the top 10 wallets, leaving out exchanges and known contracts where we can.",
    matters: "When a few wallets own most of a coin, a small group can move the price sharply.",
    changes: "Spreading ownership widely is one sign that a network depends less on a few insiders."
  },
  "hidden-sell-pressure": {
    term: "Hidden sell pressure",
    group: "On-chain",
    means: "Large holders quietly selling while the price is still rising.",
    does: "We compare wallet movements and exchange flows with the price to catch selling that the chart alone doesn't show.",
    matters: "A rising price can hide insiders leaving. Spotting it early gives a fuller picture of the risk.",
    changes: "Blockchain data makes this kind of selling visible, which is very hard to see in traditional markets."
  },
  "developer-activity": {
    term: "Developer activity",
    group: "On-chain",
    means: "How much work developers are doing on a project's public code.",
    does: "We count changes to the code over time and check whether several people are contributing.",
    matters: "Steady work suggests a project is being maintained. Months of silence can be an early warning.",
    changes: "Open-source code lets anyone check whether a project is being built, not just talked about."
  },
  "liquidity-depth": {
    term: "Liquidity depth",
    group: "On-chain",
    means: "How much can be bought or sold near the current price before the price moves noticeably.",
    does: "We look at order books and trading pools to see how much money sits close to the market price.",
    matters: "Thin liquidity means even modest trades can swing the price, and it can be hard to sell in a hurry.",
    changes: "Decentralized trading pools made liquidity visible on-chain, where anyone can measure it."
  },
  "contract-ownership": {
    term: "Contract ownership",
    group: "On-chain",
    means: "Whether anyone still holds special control keys over a token's smart contract.",
    does: "We check if admin keys can change the rules, for example by creating new tokens or freezing wallets.",
    matters: "Live admin keys mean a small group can change the token after you've looked at it.",
    changes: "Giving up those keys, or putting them under shared control, is a common sign of a maturing project."
  },
  "team-communication": {
    term: "Team communication",
    group: "On-chain",
    means: "How regularly a project's team shares updates with its community.",
    does: "We check the dates of official updates, reports and announcements.",
    matters: "Long silences, especially alongside other warning signs, can mean a project has stalled.",
    changes: "Crypto projects are expected to report in public, in the open, rather than only to a few investors."
  },
  "exchange-netflow": {
    term: "Net exchange flow",
    group: "On-chain",
    means: "The amount of a coin moved onto exchanges minus the amount moved off, over a period.",
    does: "Positive means more coins arrived at exchanges; negative means more left.",
    matters: "Coins arriving at exchanges are often there to be sold. Coins leaving are often being stored long term.",
    changes: "Public blockchains make these flows visible to everyone, not just the exchanges."
  },

  /* ---- Our method ------------------------------------------------------- */
  "canary-score": {
    term: "Canary score (80 points)",
    group: "Our method",
    means: "Our overall score for a coin, out of 80, built from six weighted categories.",
    does: "Each category is scored from evidence, then added up. The total sets the verdict.",
    matters: "The same framework for every coin lets you compare them on equal terms.",
    changes: "It brings a repeatable, institutional-style process to an area full of opinion and hype.",
    learnMore: { video: "read-report" }
  },
  "cat-fundamentals": {
    term: "Fundamentals (15 points)",
    group: "Our method",
    means: "What the project does and whether people actually use it.",
    does: "We look at the problem it solves, real usage, fees earned and competition.",
    matters: "A token with no real use depends on hype alone."
  },
  "cat-tokenomics": {
    term: "Tokenomics (15 points)",
    group: "Our method",
    means: "How the token's supply works: how many exist, who holds them and when more are released.",
    does: "We check supply caps, inflation, token unlocks and how fairly tokens were first shared out.",
    matters: "Supply rules decide how much new selling can come later."
  },
  "cat-onchain": {
    term: "On-chain activity (15 points)",
    group: "Our method",
    means: "What the blockchain data shows about how a coin is used and held.",
    does: "We study active wallets, transaction trends, whale moves and exchange flows.",
    matters: "On-chain data shows what people do, not just what they say."
  },
  "cat-team-governance": {
    term: "Team and governance (10 points)",
    group: "Our method",
    means: "Who runs the project and how decisions are made.",
    does: "We check the team's track record, developer activity, who holds control keys and how voting works.",
    matters: "A capable, accountable team is less likely to abandon or misuse a project."
  },
  "cat-market-structure": {
    term: "Market structure (15 points)",
    group: "Our method",
    means: "Where and how the coin trades.",
    does: "We look at liquidity depth, which exchanges list it, trading volume and holder concentration.",
    matters: "Good market structure means fairer prices and fewer sudden swings from single trades."
  },
  "cat-risk-controls": {
    term: "Risk controls (10 points)",
    group: "Our method",
    means: "How well the project guards against hacks, failures and abuse.",
    does: "We check security audits, past incidents, admin key risks and red flags from our scam screening.",
    matters: "One serious failure can wipe out value regardless of everything else."
  },
  "verdict": {
    term: "Verdict",
    group: "Our method",
    means: "A short label that sums up a report's score: Deploy Investment, Conditional Hold, Watch List or Avoid.",
    does: "It turns the 80-point score into one of four bands, so findings are easy to compare.",
    matters: "It summarizes what the evidence shows. It is research, not a personal recommendation to buy or sell.",
    learnMore: { video: "read-report" }
  },
  "verdict-deploy-investment": {
    term: "Deploy Investment (64 to 80)",
    group: "Our method",
    means: "Our highest band: the evidence across all six categories is strong.",
    does: "Marks coins where our research found the fewest weaknesses.",
    matters: "Even the strongest scores carry crypto's normal risks. It describes our findings, not what you should do."
  },
  "verdict-conditional-hold": {
    term: "Conditional Hold (52 to 63)",
    group: "Our method",
    means: "A solid score with specific conditions or weak spots to keep an eye on.",
    does: "The report names the conditions that would move the score up or down.",
    matters: "It flags that the picture is mixed and worth checking again at the next update."
  },
  "verdict-watch-list": {
    term: "Watch List (40 to 51)",
    group: "Our method",
    means: "Real concerns sit alongside some strengths.",
    does: "Marks coins we keep tracking because the evidence could change in either direction.",
    matters: "It signals more open questions than answers at the time of the report."
  },
  "verdict-avoid": {
    term: "Avoid (below 40)",
    group: "Our method",
    means: "Our lowest band: serious weaknesses or red flags outweigh the strengths.",
    does: "Marks coins where the evidence raised major concerns, often from scam screening.",
    matters: "It describes high risk found by the research. It is not a prediction of the price."
  },
  "on-chain-forensics": {
    term: "On-chain forensics",
    group: "Our method",
    means: "Following coins between wallets to see who is holding, moving or selling.",
    does: "We trace whale wallets, treasuries and token flows to exchanges.",
    matters: "Actions on the blockchain can tell a different story from a project's announcements.",
    changes: "Public ledgers make this kind of tracing possible for anyone with the right tools."
  },
  "scam-screening": {
    term: "Scam screening",
    group: "Our method",
    means: "A six-point check for common warning signs before we score a coin.",
    does: "It checks contract ownership, developer activity, team communication, liquidity depth, holder concentration and hidden sell pressure.",
    matters: "Catching red flags early helps avoid the most common ways people lose money in crypto.",
    learnMore: { article: "common-scams" }
  },
  "quarterly-updates": {
    term: "Quarterly updates",
    group: "Our method",
    means: "We revisit each report every quarter to see what changed.",
    does: "Each update compares the new score with the last one and explains the difference.",
    matters: "Crypto moves fast. An old report can be out of date within months."
  },

  /* ---- Enterprise report stages ----------------------------------------- */
  "stage-received": {
    term: "Order received",
    group: "Report stages",
    means: "We have your request and have confirmed the token and scope.",
    does: "The report is added to our queue and an analyst is assigned.",
    matters: "From here you can follow each stage live on your dashboard."
  },
  "stage-collection": {
    term: "Data collection",
    group: "Report stages",
    means: "We gather the raw material: market data, blockchain data, code activity and documents.",
    does: "Everything is pulled from primary sources where possible and checked for gaps.",
    matters: "A report is only as good as the data behind it."
  },
  "stage-forensics": {
    term: "On-chain forensics",
    group: "Report stages",
    means: "We trace large wallets, treasury moves and exchange flows.",
    does: "Analysts follow the money to see who holds the token and what they are doing.",
    matters: "This is where hidden selling or insider risk usually shows up."
  },
  "stage-scoring": {
    term: "Scoring (80-point framework)",
    group: "Report stages",
    means: "The token is scored across our six weighted categories.",
    does: "Each score is backed by evidence and checked against our scoring guide.",
    matters: "The same framework for every token keeps reports comparable."
  },
  "stage-writing": {
    term: "Report writing",
    group: "Report stages",
    means: "Findings are written up in plain English, with charts and sources.",
    does: "The draft explains the score, the verdict and the key risks.",
    matters: "Clear writing turns raw data into something you can act on with confidence."
  },
  "stage-review": {
    term: "Quality review",
    group: "Report stages",
    means: "A second analyst checks the report before it is released.",
    does: "They verify figures and sources, and test the reasoning behind the score.",
    matters: "An independent check catches mistakes and keeps standards consistent."
  },
  "stage-delivered": {
    term: "Delivered",
    group: "Report stages",
    means: "Your report is finished and ready to read and download.",
    does: "It appears in your dashboard and is added to your quarterly update schedule.",
    matters: "From delivery, the token is tracked so the report stays current."
  }
};
