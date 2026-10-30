#!/usr/bin/env python3
"""Writes the redirect pages: one index.html per old address, so old links
never 404. GitHub Pages has no server redirects, so each page redirects with
a script (keeping ?query and #hash) and a meta refresh, and names the new
address as canonical.

Edit REDIRECTS below, then run from the repo root:  python3 tools/make-redirects.py
Every target is a path from the site root ("" is the home page), optionally
ending in a #section (e.g. "#pricing"): that section then wins over any #hash
on the old address.
"""
import os

SITE = "https://canaryalpha.co/"

# Old live site (canaryalpha.co before the 2026 cutover).
REPORT_SLUGS = ["mega", "dot", "eigenlayer", "zro", "strato", "prove", "aztec", "btc", "eth", "aave"]
REDIRECTS = {"reports/" + s + "/": "reports/" for s in REPORT_SLUGS}
REDIRECTS.update({
    "glossary/": "learn/glossary/",
    "sign-in/": "login/",
    "sign-up/": "signup/",
    "pricing/": "#pricing",  # the Pricing section on the home page
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

PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Redirect page, written by tools/make-redirects.py. Don't edit by hand. -->
  <title>Moved — Canary Alpha Research</title>
  <link rel="canonical" href="{canonical}">
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
    with open(path, "w") as f:
        f.write(PAGE.format(canonical=SITE + new, rel=up + hash, path=up, hash=hash))
print(len(REDIRECTS), "redirect pages written")
