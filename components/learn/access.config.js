/*
 * Who sees what in the education layer. One place for every rule.
 *
 * Tiers, lowest to highest: "public" (no account), "free", "pro",
 * "enterprise". Each feature names the LOWEST tier that sees it in full;
 * every higher tier sees it too. Anyone below gets a locked preview (title,
 * thumbnail, first line, a "Pro" label and a link to pricing), never an
 * empty space.
 *
 * The viewer's tier comes from the demo login (components/auth.js; logged
 * out = "public"). For previews, add ?tier=public, ?tier=free, ?tier=pro or
 * ?tier=enterprise to any page's address: a small switcher appears and the
 * education content shows that tier's view. It only changes what the
 * education layer shows; members' pages still need their login.
 */
window.CA_LEARN_ACCESS = {
  tiers: ["public", "free", "pro", "enterprise"],
  tierNames: { public: "Public", free: "Free", pro: "Pro", enterprise: "Enterprise" },

  features: {
    learnHub: "public",          // the Learn hub, Start here and articles
    glossaryExplainers: "public", // "Explain this" popovers and the Learn glossary
    readingList: "public",
    beginnerVideos: "public",    // videos in a category marked "public" below
    assetVideos: "pro",          // videos in a category marked "pro" below
    caseForAgainst: "pro"        // the full "case for and against" on asset pages
  },

  // Which feature rule each video category follows.
  videoCategories: {
    "getting-started": "beginnerVideos",
    "crypto-explained": "assetVideos",
    "reading-research": "beginnerVideos"
  },

  // Simple / Detailed default per tier (a viewer's own choice is remembered
  // and wins).
  defaultMode: { public: "simple", free: "simple", pro: "detailed", enterprise: "detailed" }
};
