/*
 * TODO: replace sample content.
 *
 * Explainer videos for the Learn hub and asset pages. Every video is a
 * SAMPLE placeholder until it is recorded: with "videoUrl" empty, the page
 * shows a "Video coming soon" player.
 *
 *   id          used in the address: /learn/video/?id=bitcoin-explained
 *   title, summary (2 sentences; the first line is the locked preview)
 *   category    "getting-started" | "crypto-explained" | "reading-research"
 *               (who may watch each category: components/learn/access.config.js)
 *   level       "Beginner" | "Intermediate" | "Advanced"
 *   length      "m:ss"
 *   asset       for "crypto-explained": the asset id it explains
 *   videoUrl    later: a YouTube, Vimeo or hosted .mp4/.webm address. Nothing
 *               loads until the viewer presses play; captions are switched on.
 *   captionsUrl for hosted files only: a .vtt captions file
 *   takeaways   3 short bullets
 *   transcript  the full transcript, one paragraph per item
 *   terms       related glossary term IDs (learn/data/explainers.js)
 */
window.CA_LEARN_VIDEOS = [
  {
    id: "what-is-crypto",
    title: "What is crypto, really?",
    category: "getting-started",
    level: "Beginner",
    length: "4:30",
    videoUrl: "",
    captionsUrl: "",
    summary: "A plain-English tour of what a cryptocurrency is and why it exists. No charts, no jargon, just the basic idea.",
    takeaways: [
      "A cryptocurrency is digital money recorded on a shared public ledger called a blockchain.",
      "No single company or bank controls the ledger; thousands of computers keep it in sync.",
      "Prices can rise and fall sharply, so it pays to learn before you take any risk."
    ],
    transcript: [
      "Hi, and welcome to Canary Alpha Research. In the next few minutes we'll cover what crypto actually is.",
      "Think of a notebook that records who owns what. Normally a bank keeps that notebook. With crypto, thousands of computers each keep a copy, and they agree on every new line before it's written.",
      "That shared notebook is called a blockchain. The coins recorded in it, like bitcoin or ether, are cryptocurrencies.",
      "Because no one company runs the notebook, anyone can check it, and it's very hard to change what's already written.",
      "Crypto prices move a lot, and many projects fail. That's why our research focuses on evidence, not hype.",
      "In the next video, we'll look at how people buy crypto safely."
    ],
    terms: ["market-cap", "volume"]
  },
  {
    id: "buy-safely",
    title: "How to buy crypto safely",
    category: "getting-started",
    level: "Beginner",
    length: "5:10",
    videoUrl: "",
    captionsUrl: "",
    summary: "What to check before you use an exchange, and the simple habits that keep your account safe.",
    takeaways: [
      "Use a well-known, regulated exchange in your country, and check its fees first.",
      "Turn on two-factor authentication with an app, not text messages.",
      "Start small while you learn how deposits, trades and withdrawals work."
    ],
    transcript: [
      "Most people buy their first crypto on an exchange: a website or app that matches buyers and sellers.",
      "Before you sign up, check that the exchange is licensed where you live, how long it has operated, and what it charges.",
      "Protect your account with a strong, unique password and two-factor authentication from an authenticator app.",
      "Be wary of anyone who contacts you offering help. Real support teams never ask for your password or recovery phrase.",
      "Try a small first purchase so you understand each step. This video is education only, not advice on what to buy."
    ],
    terms: ["liquidity-depth", "volume"]
  },
  {
    id: "wallets-security",
    title: "Wallets and security, simply",
    category: "getting-started",
    level: "Beginner",
    length: "6:05",
    videoUrl: "",
    captionsUrl: "",
    summary: "The difference between leaving coins on an exchange and holding them yourself, and how to protect a recovery phrase.",
    takeaways: [
      "A wallet holds the keys that prove you own your coins.",
      "Your recovery phrase is the master key: write it down offline and never share it.",
      "Hardware wallets keep keys off your computer, which blocks many common attacks."
    ],
    transcript: [
      "A crypto wallet doesn't hold coins the way a leather wallet holds cash. It holds keys: secret codes that let you move coins on the blockchain.",
      "If you leave coins on an exchange, the exchange holds the keys for you. That's convenient, but you rely on the exchange staying safe and solvent.",
      "If you hold the keys yourself, you're in full control, and fully responsible. Lose the recovery phrase and no one can get your coins back.",
      "Write the phrase on paper, store it somewhere safe and private, and never type it into a website or share it with anyone.",
      "For larger amounts, many people use a hardware wallet, a small device that signs transactions without exposing your keys."
    ],
    terms: ["whale-wallet", "contract-ownership"]
  },
  {
    id: "spot-scams",
    title: "Spotting common crypto scams",
    category: "getting-started",
    level: "Beginner",
    length: "5:45",
    videoUrl: "",
    captionsUrl: "",
    summary: "The warning signs behind most crypto scams, and the checks we run on every token. Learn the patterns once and spot them everywhere.",
    takeaways: [
      "Guaranteed returns and pressure to act fast are the clearest red flags.",
      "Check who controls a token's contract and how much the top wallets hold.",
      "If someone asks for your recovery phrase, it's a scam every time."
    ],
    transcript: [
      "Most crypto scams follow a handful of patterns. Once you know them, they're easier to spot.",
      "First: promises. No honest project can guarantee returns. Pressure to buy before a deadline is another warning sign.",
      "Second: control. If a small team still holds admin keys, they can change the token's rules after you buy.",
      "Third: concentration. If a few wallets own most of the supply, they can sell into everyone else.",
      "Our six-point scam screening checks these signs, and more, before we score any token."
    ],
    terms: ["scam-screening", "contract-ownership", "holder-concentration", "hidden-sell-pressure"]
  },
  {
    id: "bitcoin-explained",
    title: "Bitcoin explained",
    category: "crypto-explained",
    asset: "btc",
    level: "Beginner",
    length: "7:20",
    videoUrl: "",
    captionsUrl: "",
    summary: "What Bitcoin is, how mining secures it, and why its fixed supply matters to people who hold it. We also cover the main risks.",
    takeaways: [
      "Bitcoin is the first and largest cryptocurrency, with a hard cap of 21 million coins.",
      "Miners secure the network and earn new coins, which halve roughly every four years.",
      "Its price has seen deep falls as well as new highs; volatility is part of the picture."
    ],
    transcript: [
      "Bitcoin launched in 2009 as digital money that no government or company controls.",
      "New bitcoin are created as rewards for miners, who use computing power to add new blocks to the chain. That reward halves about every four years.",
      "Only 21 million bitcoin will ever exist. Supporters see that limit as a strength; critics point out that price, not supply, drives most of the risk.",
      "Large funds and companies now hold bitcoin, and spot ETFs let investors buy exposure through ordinary brokerage accounts.",
      "Bitcoin's price has fallen by more than 70 percent several times in its history. Understanding that range is part of understanding Bitcoin."
    ],
    terms: ["puell-multiple", "rainbow-chart", "etf-flows", "ath-atl"]
  },
  {
    id: "ethereum-explained",
    title: "Ethereum explained",
    category: "crypto-explained",
    asset: "eth",
    level: "Intermediate",
    length: "7:50",
    videoUrl: "",
    captionsUrl: "",
    summary: "How Ethereum runs apps on a shared blockchain, what staking is, and where the risks lie. A step up from the basics, still in plain English.",
    takeaways: [
      "Ethereum is a blockchain that runs programs, called smart contracts.",
      "Since 2022 it has been secured by staking instead of mining.",
      "Its value depends on people using the network, which faces strong competition."
    ],
    transcript: [
      "If Bitcoin is digital money, Ethereum is a shared computer. Anyone can run programs on it, called smart contracts.",
      "Those programs power lending apps, stablecoins, digital collectibles and tokenized assets.",
      "Ethereum switched from mining to staking in 2022. Holders lock up ether to help secure the network and earn rewards.",
      "Fees paid to use Ethereum are partly burned, which can reduce supply when the network is busy.",
      "The risks: rival blockchains, bugs in smart contracts, and changing rules for staking around the world."
    ],
    terms: ["developer-activity", "token-unlock", "etf-flows", "treasury"]
  },
  {
    id: "read-report",
    title: "How to read a Canary Alpha report",
    category: "reading-research",
    level: "Beginner",
    length: "6:40",
    videoUrl: "",
    captionsUrl: "",
    summary: "A walk through one report from top to bottom: the score, the verdict, the evidence and the risks. You'll know where to look first.",
    takeaways: [
      "Start with the score out of 80 and the verdict, then read why.",
      "Each of the six categories has its own score and evidence.",
      "The risks section matters as much as the strengths."
    ],
    transcript: [
      "Every Canary Alpha report follows the same structure, so once you've read one, you can read them all.",
      "At the top is the score out of 80 and a verdict: Deploy Investment, Conditional Hold, Watch List or Avoid.",
      "Below that, six categories each get a score: fundamentals, tokenomics, on-chain activity, team and governance, market structure, and risk controls.",
      "Each score links to the evidence behind it: wallet traces, code activity, liquidity data and more.",
      "Finally, read the risks. A verdict is a summary of research, not personal advice, and every coin carries risk."
    ],
    terms: ["canary-score", "verdict", "cat-fundamentals", "cat-tokenomics", "cat-onchain", "cat-team-governance", "cat-market-structure", "cat-risk-controls"]
  },
  {
    id: "read-dashboard",
    title: "Reading your dashboard",
    category: "reading-research",
    level: "Beginner",
    length: "4:15",
    videoUrl: "",
    captionsUrl: "",
    summary: "What each part of the dashboard shows, from the Fear & Greed gauge to the market map. Use the circled i on any metric for a quick explanation.",
    takeaways: [
      "The top strip shows the market's mood and big-fund flows.",
      "The market map shows every coin at a glance; bigger bubbles are bigger coins.",
      "Tap the circled i next to any metric for a plain-English explanation."
    ],
    transcript: [
      "Your dashboard starts with the market strip: the Fear & Greed Index and spot ETF flows.",
      "Next is the market map. Each bubble is a coin. You can change what size and colour mean with the drop-downs.",
      "Below that, your assets appear as cards or a list. Switch between them with the Cards and List buttons.",
      "Anywhere you see a small circled i, tap it for a short explanation of that number.",
      "Choose Simple to see one-line summaries, or Detailed for every figure."
    ],
    terms: ["fear-greed", "etf-flows", "market-map", "market-cap", "volume"]
  },
  {
    id: "on-chain-basics",
    title: "On-chain data: following the money",
    category: "reading-research",
    level: "Advanced",
    length: "9:05",
    videoUrl: "",
    captionsUrl: "",
    summary: "How we trace whales, treasuries and exchange flows, and what those signals can and can't tell you.",
    takeaways: [
      "Blockchains are public, so large moves between wallets can be traced.",
      "Coins moving onto exchanges often come before selling; moves off often mean storage.",
      "On-chain signals add context; they don't predict prices on their own."
    ],
    transcript: [
      "Every transaction on a public blockchain is visible. On-chain analysis turns that raw record into evidence.",
      "We start by labelling wallets: exchanges, project treasuries, early investors and large unlabeled holders, often called whales.",
      "Then we watch flows. Coins arriving at an exchange are often there to be sold. Coins leaving are often being stored.",
      "We compare those flows with the price. Selling into a rising price is one of the signs we call hidden sell pressure.",
      "On-chain data is powerful context, but it can be misread. We always weigh it with the rest of the evidence."
    ],
    terms: ["whale-wallet", "exchange-netflow", "treasury", "hidden-sell-pressure", "on-chain-forensics"]
  }
];
