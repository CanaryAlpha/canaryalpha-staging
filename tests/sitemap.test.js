// /sitemap.xml (api/sitemap.js): the public pages, and only those. Item 407
// made /reports/ members-only, so it and every report stay out.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { PUBLIC_PAGES, sitemap } from "../api/sitemap.js";

// Public pages deliberately left out of the sitemap: forms and templates
// with nothing to index, and design/test pages.
const NOT_LISTED = ["/login/", "/waitlist/", "/learn/article/", "/learn/video/",
  "/animations-demo/", "/consent-test/", "/font-compare/", "/hero-options/"];

const file = (p) => (p === "/" ? "" : p.slice(1)) + "index.html";

test("every listed page exists, is public and is indexable", () => {
  for (const { path, lastmod } of PUBLIC_PAGES) {
    assert.ok(fs.existsSync(file(path)), path);
    assert.doesNotMatch(fs.readFileSync(file(path), "utf8"), /name="robots" content="noindex/, path);
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("members' pages are never listed", () => {
  const xml = sitemap("https://canaryalpha.co");
  for (const p of ["/reports/", "/dashboard/", "/account/"]) assert.ok(!xml.includes(p), p);
});

test("every public page in the repo is either listed or deliberately left out", () => {
  const listed = new Set(PUBLIC_PAGES.map((p) => p.path));
  const pages = execSync("git ls-files '*index.html'", { encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => !f.startsWith("demo/") && !f.startsWith("marketing-animations/"))
    .filter((f) => {
      const html = fs.readFileSync(f, "utf8");
      return !html.includes("Redirect page, written by tools/make-redirects.py") && !/name="robots" content="noindex/.test(html);
    })
    .map((f) => "/" + f.replace(/index\.html$/, ""));
  for (const p of pages) assert.ok(listed.has(p) || NOT_LISTED.includes(p), p + " is public: list it in api/sitemap.js or in NOT_LISTED");
});

test("robots.txt points to the sitemap and keeps crawlers out of members' pages", () => {
  const robots = fs.readFileSync("robots.txt", "utf8");
  assert.match(robots, /^Sitemap: https:\/\/canaryalpha\.co\/sitemap\.xml$/m);
  for (const p of ["/dashboard/", "/account/", "/reports/", "/api/"]) assert.match(robots, new RegExp("^Disallow: " + p + "$", "m"));
  assert.ok(!fs.existsSync("sitemap.xml"), "no static sitemap.xml (it would win over the rewrite)");
});
