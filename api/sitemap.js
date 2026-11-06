/*
 * GET /sitemap.xml (rewritten here by vercel.json): the public pages only.
 *
 * Members' pages are never listed: /dashboard/, /account/ and, since item
 * 407, /reports/ and every report, which need a login and are marked
 * noindex. tests/sitemap.test.js checks this list against the pages in the
 * repo, so a new public page fails the tests until it is listed here or
 * named in NOT_LISTED there.
 */
export const PUBLIC_PAGES = [
  { path: "/", lastmod: "2026-11-04" },
  { path: "/learn/", lastmod: "2026-10-29" },
  { path: "/learn/glossary/", lastmod: "2026-10-29" },
  { path: "/contact/", lastmod: "2026-10-29" },
  { path: "/signup/", lastmod: "2026-10-29" },
  { path: "/terms/", lastmod: "2026-11-03" },
  { path: "/privacy/", lastmod: "2026-11-01" },
  { path: "/holdings/", lastmod: "2026-11-04" },
  { path: "/disclaimer/", lastmod: "2026-11-04" }
];

export function sitemap(origin) {
  const urls = PUBLIC_PAGES.map((p) => `  <url><loc>${origin}${p.path}</loc><lastmod>${p.lastmod}</lastmod></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function GET() {
  return new Response(sitemap("https://canaryalpha.co"), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" }
  });
}
