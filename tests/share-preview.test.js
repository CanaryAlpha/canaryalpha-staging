// Link previews (Open Graph / X cards): every public page shares the same
// image, og/canary-alpha-share-v2.png, a new file name so apps fetch it
// instead of a cached copy of the old brand/og-image.png (kept for old links).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const IMAGE = "https://canaryalpha.co/og/canary-alpha-share-v2.png";
const ALT = "Canary Alpha Research: In-depth cryptocurrency fundamental analysis, explained simply.";
const PUBLIC = ["index.html", "terms/index.html", "privacy/index.html", "disclaimer/index.html",
  "learn/index.html", "learn/glossary/index.html", "learn/article/index.html", "learn/video/index.html",
  "reviews/index.html", "contact/index.html", "waitlist/index.html", "holdings/index.html",
  "login/index.html", "signup/index.html", "pricing/index.html", "glossary/index.html",
  "sign-in/index.html", "sign-up/index.html"];

const meta = (html, attr, name) => {
  const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
  return m ? m[1] : null;
};

test("the share image is a 1200x630 PNG under 300 KB, and the old one stays", () => {
  const png = fs.readFileSync("og/canary-alpha-share-v2.png");
  assert.equal(png.toString("latin1", 1, 4), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 300 * 1024, png.length + " bytes");
  assert.ok(fs.existsSync("brand/og-image.png"));
});

for (const page of PUBLIC) {
  test(`${page} has complete share tags with the new image`, () => {
    const html = fs.readFileSync(page, "utf8");
    assert.equal(meta(html, "property", "og:image"), IMAGE);
    assert.equal(meta(html, "property", "og:image:width"), "1200");
    assert.equal(meta(html, "property", "og:image:height"), "630");
    assert.equal(meta(html, "property", "og:image:alt"), ALT);
    assert.equal(meta(html, "name", "twitter:card"), "summary_large_image");
    assert.equal(meta(html, "property", "og:site_name"), "Canary Alpha Research");
    assert.ok((meta(html, "property", "og:title") || "").includes("Canary Alpha Research"));
    assert.ok((meta(html, "property", "og:description") || "").length > 30);
  });
}

test("the homepage's preview text matches its headline", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const title = "Cryptocurrency Fundamental Analysis, Explained Simply | Canary Alpha Research";
  const desc = "In-depth crypto fundamental analysis in plain English. Every token scored on our 80-point framework, backed by on-chain forensics. Start free with Bitcoin and Ethereum.";
  assert.equal(meta(html, "property", "og:title"), title);
  assert.equal(meta(html, "name", "twitter:title"), title);
  assert.equal(meta(html, "property", "og:description"), desc);
  assert.equal(meta(html, "name", "twitter:description"), desc);
  assert.equal(meta(html, "property", "og:url"), "https://canaryalpha.co/");
});

test("report pages use the new image too", () => {
  const js = fs.readFileSync("api/_lib/report-html.js", "utf8");
  assert.match(js, /\$\{SITE\}\/og\/canary-alpha-share-v2\.png/);
  assert.ok(js.includes(ALT));
});

test("nothing still points previews at the old image or the old tagline", () => {
  let hits = "";
  try {
    hits = execFileSync("git", ["grep", "-l", "-I", "-e", "brand/og-image.png", "-e", "Institutional-grade",
      "--", "*.html", "*.js", ":!tests/*", ":!marketing-animations/*"], { encoding: "utf8" }).trim();
  } catch (e) {
    if (e.status !== 1) throw e;   // git grep exits 1 when nothing matches
  }
  assert.equal(hits, "");
});
