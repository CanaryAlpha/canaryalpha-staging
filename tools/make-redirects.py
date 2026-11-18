#!/usr/bin/env python3
"""Writes the redirect pages: one index.html per old address, so old links
never 404. GitHub Pages has no server redirects, so each page redirects with
a script (keeping ?query and #hash) and a meta refresh, and names the new
address as canonical.

Edit REDIRECTS below, then run from the repo root:  python3 tools/make-redirects.py
Every target is a path from the site root ("" is the home page), optionally
ending in a #section (e.g. "#pricing"): that section then wins over any #hash
on the old address.

Link previews: apps that unfurl a shared link (iMessage, WhatsApp, Slack, X)
read the old address's own tags and do not follow these redirects, so each
redirect page copies the share tags of the page it points to (og:title,
og:description, the share image), with SHARE overriding them for a #section.
A target with no share tags of its own (the members' pages) gets none.
"""
import html, os, re

SITE = "https://canaryalpha.co/"

# Old live site (canaryalpha.co before the 2026 cutover). Its report
# addresses, /reports/<slug>/, are real pages again since item 407
# (api/pages/report.js), so they are no longer redirected.
REDIRECTS = {}
REDIRECTS.update({
    "glossary/": "learn/glossary/",
    "sign-in/": "login/",
    "sign-up/": "signup/",
    "pricing/": "#pricing",  # the Pricing section on the home page
    # Sample-data dashboards replaced by the real ones (item 404).
    "dashboard/pro/": "dashboard/",
    "dashboard/pro/asset/": "dashboard/",
    "dashboard/enterprise/asset/": "dashboard/enterprise/",
    "dashboard/btc/": "dashboard/report/?slug=btc",
    "dashboard/eth/": "dashboard/report/?slug=eth",
})

# Old beta site: everything lived under /demo/.
for page in ["", "contact/", "disclaimer/", "privacy/", "terms/", "login/", "signup/",
             "learn/", "learn/glossary/", "learn/video/", "learn/article/",
             "dashboard/", "dashboard/btc/", "dashboard/eth/", "dashboard/pro/",
             "dashboard/pro/asset/", "dashboard/enterprise/", "dashboard/enterprise/asset/",
             "dashboard/bubble-options/", "animations-demo/", "consent-test/",
             "font-compare/", "hero-options/"]:
    REDIRECTS["demo/" + page] = page
REDIRECTS["demo/glossary/"] = "learn/glossary/"

# Share text for targets that are a section of a page, not a page.
SHARE = {
    "#pricing": ("Pricing — Canary Alpha Research",
                 "Plans and pricing for Canary Alpha Research. Start free with our full Bitcoin and Ethereum reports."),
}
IMAGE = SITE + "og/canary-alpha-share-v2.png"
IMAGE_ALT = "Canary Alpha Research: In-depth cryptocurrency fundamental analysis, explained simply."

SHARE_TAGS = """
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Canary Alpha Research">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{alt}">
  <meta name="twitter:card" content="summary_large_image">"""


def share_text(target, hash):
    """(og:title, og:description) of the target page, or None."""
    if hash in SHARE:
        return SHARE[hash]
    try:
        with open(os.path.join(target.split("?")[0], "index.html")) as f:
            head = f.read().split("</head>")[0]
    except OSError:
        return None
    def tag(name):
        m = re.search(r'<meta property="og:%s" content="([^"]*)"' % name, head)
        return html.unescape(m.group(1)) if m else None
    title, desc = tag("title"), tag("description")
    return (title, desc) if title and desc else None


PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Redirect page, written by tools/make-redirects.py. Don't edit by hand. -->
  <title>Moved — Canary Alpha Research</title>
  <link rel="canonical" href="{canonical}">{share}
  <meta http-equiv="refresh" content="0; url={rel}">
  <script>location.replace("{path}" + location.search + ("{hash}" || location.hash));</script>
</head>
<body>
  <p>This page has moved to <a href="{rel}">{canonical}</a>.</p>
</body>
</html>
"""

for old, new in sorted(REDIRECTS.items()):
    target, _, hash = new.partition("#")
    up = "../" * old.count("/") + target or "./"
    hash = "#" + hash if hash else ""
    path = os.path.join(old, "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    text = share_text(target, hash)
    share = SHARE_TAGS.format(title=html.escape(text[0]), desc=html.escape(text[1]), canonical=SITE + new,
                              image=IMAGE, alt=html.escape(IMAGE_ALT)) if text else ""
    with open(path, "w") as f:
        f.write(PAGE.format(canonical=SITE + new, rel=up + hash, path=up, hash=hash, share=share))
print(len(REDIRECTS), "redirect pages written")
