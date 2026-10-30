/*
 * TODO: replace sample content.
 *
 * Learn articles. "path" lists the Start here steps in order; each step is
 * one article below. Readers tick steps off as they go (saved in their
 * browser only).
 *
 *   id        used in the address: /learn/article/?id=common-scams
 *   title, minutes (reading time), level, summary (one or two sentences)
 *   takeaways 3 short bullets for the Key takeaways box
 *   sections  [{ heading, body: [paragraphs], detail: [paragraphs] }]
 *             "detail" paragraphs only show in Detailed mode
 *   video     a related video id (learn/data/videos.js), optional
 *   terms     related glossary term IDs (learn/data/explainers.js)
 */
window.CA_LEARN_ARTICLES = {
  path: ["what-is-crypto", "how-to-buy-safely", "wallets-and-security", "reading-our-reports", "common-scams"],

  articles: [
    {
      id: "what-is-crypto",
      title: "What is crypto?",
      minutes: 4,
      level: "Beginner",
      summary: "The basic idea behind cryptocurrencies, in plain English.",
      takeaways: [
        "Crypto is digital money recorded on a shared public ledger, the blockchain.",
        "No single company controls the ledger; many computers keep it in sync.",
        "Prices swing widely, so learning comes before any money."
      ],
      sections: [
        {
          heading: "A shared notebook",
          body: [
            "Imagine a notebook that records who owns what. Usually a bank keeps it. With crypto, thousands of computers each keep a copy and agree on every new entry.",
            "That notebook is a blockchain. The coins it records, like bitcoin and ether, are cryptocurrencies."
          ],
          detail: [
            "Computers agree on new entries through a set of rules called consensus. Bitcoin uses mining (proof of work); Ethereum uses staking (proof of stake)."
          ]
        },
        {
          heading: "Why people use it",
          body: [
            "Crypto can be sent anywhere in the world, at any hour, without a bank in the middle. Some coins also run apps, such as lending or trading services."
          ]
        },
        {
          heading: "The catch",
          body: [
            "Prices can rise and fall by large amounts in days. Many projects fail. That is why we score every coin on evidence, not hype."
          ]
        }
      ],
      video: "what-is-crypto",
      terms: ["market-cap", "volume", "price-change"]
    },
    {
      id: "how-to-buy-safely",
      title: "How to buy safely",
      minutes: 5,
      level: "Beginner",
      summary: "What to check before you choose an exchange, and how to protect your account.",
      takeaways: [
        "Pick a licensed exchange in your country and compare its fees.",
        "Use a strong password and app-based two-factor authentication.",
        "Start small while you learn each step."
      ],
      sections: [
        {
          heading: "Choosing an exchange",
          body: [
            "An exchange is a website or app where people buy and sell crypto. Look for one that is licensed where you live and has a long track record.",
            "Compare fees: some charge for each trade, some for deposits and withdrawals."
          ],
          detail: [
            "Check whether the exchange publishes proof of its reserves, and how it separates customer money from its own."
          ]
        },
        {
          heading: "Protecting your account",
          body: [
            "Use a unique password and turn on two-factor authentication with an authenticator app. Text-message codes can be stolen."
          ]
        },
        {
          heading: "Your first purchase",
          body: [
            "Try a small amount first so you understand deposits, trades and withdrawals. This guide is education only, not advice on what to buy."
          ]
        }
      ],
      video: "buy-safely",
      terms: ["liquidity-depth", "volume"]
    },
    {
      id: "wallets-and-security",
      title: "Wallets and security",
      minutes: 6,
      level: "Beginner",
      summary: "What a wallet really holds, and how to keep your recovery phrase safe.",
      takeaways: [
        "A wallet holds the keys that prove you own your coins.",
        "Never share your recovery phrase or type it into a website.",
        "Hardware wallets keep keys away from your computer."
      ],
      sections: [
        {
          heading: "Keys, not coins",
          body: [
            "A crypto wallet holds keys: secret codes that let you move coins. Whoever has the keys controls the coins."
          ]
        },
        {
          heading: "Exchange or self-custody",
          body: [
            "Leaving coins on an exchange is convenient, but the exchange holds the keys. Holding them yourself gives you full control and full responsibility."
          ],
          detail: [
            "Several exchanges have failed or been hacked over the years. Self-custody removes that risk but adds the risk of losing your own keys."
          ]
        },
        {
          heading: "The recovery phrase",
          body: [
            "Your recovery phrase is a list of words that can restore your wallet. Write it on paper, keep it private and safe, and never share it with anyone."
          ]
        }
      ],
      video: "wallets-security",
      terms: ["whale-wallet", "contract-ownership"]
    },
    {
      id: "reading-our-reports",
      title: "How to read our reports",
      minutes: 5,
      level: "Beginner",
      summary: "Where to look first in a Canary Alpha report, and what the score and verdict mean.",
      takeaways: [
        "Start with the score out of 80 and the verdict.",
        "Six categories each have their own score and evidence.",
        "Read the risks as carefully as the strengths."
      ],
      sections: [
        {
          heading: "Score and verdict",
          body: [
            "Every report scores a coin out of 80. The total sets one of four verdicts: Deploy Investment, Conditional Hold, Watch List or Avoid.",
            "A verdict summarizes our research. It is not a personal recommendation to buy or sell."
          ]
        },
        {
          heading: "The six categories",
          body: [
            "Fundamentals, tokenomics, on-chain activity, team and governance, market structure, and risk controls. Each one has its own score and the evidence behind it."
          ],
          detail: [
            "Weights: fundamentals, tokenomics, on-chain activity and market structure are worth 15 points each; team and governance and risk controls 10 each."
          ]
        },
        {
          heading: "Risks and updates",
          body: [
            "Each report ends with the main risks. Reports are revisited every quarter, so check the date and what changed."
          ]
        }
      ],
      video: "read-report",
      terms: ["canary-score", "verdict", "quarterly-updates"]
    },
    {
      id: "common-scams",
      title: "Common scams to avoid",
      minutes: 6,
      level: "Beginner",
      summary: "The patterns behind most crypto scams, and the checks that catch them.",
      takeaways: [
        "Guaranteed returns and pressure to act fast are red flags.",
        "Check who controls a token and how much the top wallets hold.",
        "Anyone asking for your recovery phrase is running a scam."
      ],
      sections: [
        {
          heading: "Too good to be true",
          body: [
            "No honest project can promise returns. Countdown timers, \"last chance\" messages and celebrity endorsements are classic pressure tactics."
          ]
        },
        {
          heading: "Who's in control",
          body: [
            "If a team still holds admin keys to a token, they can change its rules. If a few wallets hold most of the supply, they can sell into everyone else."
          ],
          detail: [
            "Watch for hidden sell pressure: insiders selling while the price still rises. Our scam screening compares wallet flows with the price to catch it."
          ]
        },
        {
          heading: "Fake help",
          body: [
            "Scammers pose as support staff or friendly experts. Real support never asks for your password or recovery phrase."
          ]
        }
      ],
      video: "spot-scams",
      terms: ["scam-screening", "contract-ownership", "holder-concentration", "hidden-sell-pressure", "developer-activity", "team-communication"]
    }
  ]
};
