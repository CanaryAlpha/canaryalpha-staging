/*
 * Site links: the menu bar (site-header.js) and the footer (site-footer.js)
 * both read these, so they stay in sync. Edit labels and links here only.
 *
 * Every href is relative to the site root. Each page's header and
 * footer give their way back to the root in data-root ("" on the home page,
 * "../" one folder down), and it is put in front of every href. So
 * "#pricing" becomes "#pricing" on the home page and "../#pricing" on
 * /learn/.
 *
 * Only link pages that exist. A footer column with no links is left out.
 * Load this before site-header.js on every page.
 */
window.CA_SITE_LINKS = {
  // Menu drop-down, top to bottom. loggedOut: only shown when logged out;
  // a logged-in user gets the Dashboard group (below) in their place.
  menu: [
    { label: "Our process", href: "#our-process" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Why us", href: "#why-us" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Learn", href: "learn/" },
    { label: "Log in", href: "login/", loggedOut: true },
    { label: "Sign up", href: "signup/", loggedOut: true },
    { label: "Contact Us", href: "contact/" },
    { label: "Glossary", href: "learn/glossary/" }
  ],

  // The menu's Dashboard group when logged in (site-header.js). All three
  // show for everyone; plans the user doesn't have get a lock and the
  // plan's name, and lead to that dashboard's paywall.
  dashboards: [
    { label: "Free dashboard", href: "dashboard/", tier: "free" },
    { label: "Pro dashboard", href: "dashboard/pro/", tier: "pro" },
    { label: "Enterprise dashboard", href: "dashboard/enterprise/", tier: "enterprise" }
  ],

  footer: {
    tagline: "Institutional-grade crypto research.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Our process", href: "#our-process" },
          { label: "How it works", href: "#how-it-works" },
          { label: "Why us", href: "#why-us" },
          { label: "Pricing", href: "#pricing" }
        ]
      },
      {
        title: "Resources",
        links: [
          { label: "Learn", href: "learn/" },
          { label: "FAQ", href: "#faq" },
          { label: "Glossary", href: "learn/glossary/" }
        ]
      },
      // Add About here once that page exists.
      { title: "Company", links: [{ label: "Contact Us", href: "contact/" }] },
      {
        title: "Legal",
        links: [
          { label: "Terms", href: "terms/" },
          { label: "Privacy", href: "privacy/" },
          { label: "Disclaimer", href: "disclaimer/" },
          { label: "Holdings", href: "holdings/" }
        ],
        note: "Research only. Not financial advice."
      }
    ],
    copyright: "© 2026 Canary Alpha Research LLC. All rights reserved."
  }
};
