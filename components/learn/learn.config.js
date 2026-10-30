/*
 * Education layer settings that aren't content: reading-list outlets,
 * filters, levels and the video player.
 */
window.CA_LEARN_CONFIG = {
  // Reading list: only articles from these outlets are shown. The names
  // below are SAMPLE placeholders; replace them with the outlets you approve.
  approvedOutlets: [
    "Sample Outlet One",
    "Sample Outlet Two",
    "Sample Outlet Three",
    "Sample Outlet Four"
  ],

  // Reading-list topics, in filter order.
  topics: [
    { id: "basics", label: "Basics" },
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
    { id: "security", label: "Security and scams" },
    { id: "markets", label: "Markets" },
    { id: "on-chain", label: "On-chain data" }
  ],

  levels: ["Beginner", "Intermediate", "Advanced"],

  // Explainer video categories, in display order.
  videoCategories: [
    { id: "getting-started", label: "Getting started" },
    { id: "crypto-explained", label: "Crypto explained" },
    { id: "reading-research", label: "Reading our research" }
  ],

  // Video player. A video's "videoUrl" (videos.js) may be a YouTube, Vimeo
  // or hosted .mp4/.webm address. Nothing loads until the viewer presses
  // play; then the embed loads with captions on. Hosted files take their
  // captions from the video's "captionsUrl" (a .vtt file).
  player: {
    youtubeHost: "https://www.youtube-nocookie.com/embed/",
    vimeoHost: "https://player.vimeo.com/video/",
    captionLanguage: "en"
  }
};
