#!/usr/bin/env python3
"""Turns a copy of the site into the STAGING build, in place. Run by
tools/deploy.sh staging; see STAGING.md. Never run it on the repo itself.

  python3 tools/build-staging.py <dir> --sha <commit> [--base /canaryalpha-staging/]

What it changes, and only in <dir>:
  - CNAME and sitemap.xml are removed (staging must never claim canaryalpha.co,
    and has nothing to submit to search engines).
  - robots.txt disallows everything.
  - every page gets <meta name="robots" content="noindex, nofollow"> and a
    STAGING banner naming the commit.
  - paths that start at the site root ("/styles.css" in 404.html) gain the
    staging address's folder (--base), because GitHub Pages serves staging at
    canaryalpha.github.io/canaryalpha-staging/, not at a domain root.
The production site is the repo as committed; none of this ever reaches it.
"""
import argparse, os, re, sys

BANNER_CSS = (
    "<style>"
    ".ca-staging-banner{position:fixed;left:12px;bottom:12px;"  # bottom-left: centre has the scroll arrow, right the back-to-top button
    "z-index:2147483647;display:flex;gap:.5rem;align-items:center;max-width:calc(100vw - 88px);"
    "padding:6px 12px;border-radius:999px;background:#ffcc00;color:#000;"
    "font:600 12px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25);"
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".ca-staging-banner a{color:#000;text-decoration:underline}"
    "@media print{.ca-staging-banner{display:none}}"
    "</style>"
)


def banner(sha):
    return ('<div class="ca-staging-banner" role="note" aria-label="Staging site">'
            "STAGING &middot; not the live site &middot; build " + sha[:7] +
            ' &middot; <a href="https://canaryalpha.co/">canaryalpha.co</a></div>')


def stage_html(text, sha, base):
    head = re.search(r"<head[^>]*>", text, re.I)
    body = re.search(r"<body[^>]*>", text, re.I)
    if not head:
        return text, False
    meta = ('\n  <!-- STAGING build of ' + sha + ' (tools/build-staging.py) -->'
            '\n  <meta name="robots" content="noindex, nofollow">'
            '\n  <meta name="ca-staging-build" content="' + sha + '">\n  ' + BANNER_CSS)
    text = text[:head.end()] + meta + text[head.end():]
    if body:
        body = re.search(r"<body[^>]*>", text, re.I)
        text = text[:body.end()] + "\n  " + banner(sha) + text[body.end():]
    # Root-relative paths: href="/x" or src="/x", never protocol-relative "//x".
    # data-home/data-root tell the header and footer where the site root is.
    text = re.sub(r'((?:href|src|content|data-home|data-root)=")/(?!/)', lambda m: m.group(1) + base, text)
    return text, True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--sha", required=True)
    ap.add_argument("--base", default="/canaryalpha-staging/")
    a = ap.parse_args()
    root = os.path.abspath(a.dir)
    if os.path.isdir(os.path.join(root, ".git")):
        sys.exit("build-staging: refusing to run on a git checkout: " + root)
    if not a.base.startswith("/") or not a.base.endswith("/"):
        sys.exit("build-staging: --base must start and end with /")
    if not os.path.isfile(os.path.join(root, "index.html")):
        sys.exit("build-staging: no index.html in " + root)

    for name in ("CNAME", "sitemap.xml"):
        p = os.path.join(root, name)
        if os.path.exists(p):
            os.remove(p)
    with open(os.path.join(root, "robots.txt"), "w") as f:
        f.write("# STAGING: not for search engines. The live site is https://canaryalpha.co/\n"
                "User-agent: *\nDisallow: /\n")

    pages = 0
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in ("node_modules", ".git")]
        for fn in files:
            if not fn.endswith(".html"):
                continue
            p = os.path.join(d, fn)
            with open(p, encoding="utf-8") as f:
                text = f.read()
            new, ok = stage_html(text, a.sha, a.base)
            if ok:
                with open(p, "w", encoding="utf-8") as f:
                    f.write(new)
                pages += 1
    print("build-staging: %d pages marked noindex with the STAGING banner (build %s, base %s)"
          % (pages, a.sha[:7], a.base))


if __name__ == "__main__":
    main()
