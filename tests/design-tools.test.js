// Design tools (?design=1 only): the design panel's Headline, Globe and
// Background sections, per-screen-size globe settings, and the private
// device simulator at /design/simulator/.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const read = (f) => fs.readFileSync(f, "utf8");
const panel = read("components/design-panels.js");
const sim = read("design/simulator/index.html");

test("the globe config has settings for each screen size", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("components/dot-globe.config.js"), ctx);
  const d = ctx.window.CA_DOT_GLOBE_DEFAULTS.devices;
  assert.deepEqual(Object.keys(d).sort(), ["desktop", "phone", "tablet"]);
  for (const k of Object.keys(d)) {
    for (const f of ["visible", "size", "maxSize", "x", "offsetX", "y", "offsetY", "layer"]) assert.ok(f in d[k], k + "." + f);
  }
});

test("one set of screen sizes: phone under 768px, tablet 768-1199px, desktop 1200px and up", () => {
  assert.match(read("components/dot-globe.js"), /w >= 1200 \? "desktop" : w >= 768 \? "tablet" : "phone"/);
  assert.match(panel, /innerWidth >= 1200 \? "desktop" : innerWidth >= 768 \? "tablet" : "phone"/);
  assert.match(sim, /w >= 1200 \? "desktop" : w >= 768 \? "tablet" : "phone"/);
  // The hero's own rules (styles.css, up to the unused hero visuals) and the globe's.
  const all = read("styles.css"), heroCss = all.slice(all.indexOf(".hero {"), all.indexOf("/* The hero visual (components/hero-visuals.css)"));
  for (const [f, css] of [["styles.css (hero)", heroCss], ["components/dot-globe.css", read("components/dot-globe.css")]]) {
    assert.ok(css.length > 500, f);
    assert.doesNotMatch(css, /\((?:min|max)-width: (?:599|600|1099|1100)px\)/, f + " still uses the old 600/1100 breakpoints");
  }
  assert.ok(read("styles.css").includes("@media (min-width: 1200px) {\n  .hero .hero__title { font-size: 62px;"));
});

test("the panel: Desktop, Tablet and Phone tabs over Headline, Buttons, Globe, Background and Header", () => {
  assert.ok(panel.includes('role="tablist"') && panel.includes('role="tab"'));
  for (const s of ['section("headline", "Headline"', 'section("buttons", "Buttons"', 'section("globe", "Globe"', 'section("background", "Background"', 'section("header", "Header"']) assert.ok(panel.includes(s), s);
  for (const s of ['"Copy from Desktop"', '"Copy from Tablet"', '"Copy this device"', '"Reset this device"', 'data-act="copy-all">Copy settings', 'data-act="reset-all">Reset all']) assert.ok(panel.includes(s), s);
  assert.ok(panel.includes('"Editing: " + NAMES[cur]'));
  assert.ok(panel.includes("use the simulator to see them."));
  assert.ok(panel.includes('new CustomEvent("design:device"'));
  assert.ok(sim.includes('addEventListener("design:device"'));
  // No per-section device dropdowns any more.
  assert.doesNotMatch(panel, /label: "Screen size"|label: "Editing"/);
});

test("saved settings: one key for all three devices, older settings carried over", () => {
  assert.ok(panel.includes('var KEY = "ca-design-v2"'));
  for (const k of ['"ca-design-headline"', '"ca-design-globe"', '"ca-design-background"']) assert.ok(panel.includes(k), k);
  assert.match(panel, /function migrate\(\)/);
});

test("saving to the browser never throws", () => {
  assert.match(panel, /function load\(k\) \{ try \{/);
  assert.match(panel, /function save\(k, v\) \{ try \{/);
  assert.match(panel, /function drop\(k\) \{ try \{/);
});

test("the contrast check uses the site's own text colours", () => {
  const css = read("styles.css");
  const light = css.match(/:root,\s*:root\[data-theme="light"\] \{([^}]*)\}/)[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1];
  const tok = (b, n) => b.match(new RegExp("--" + n + ": (#[0-9a-f]{6})"))[1];
  assert.ok(panel.includes(`light: { ink: "${tok(light, "ink")}", muted: "${tok(light, "muted")}" }`));
  assert.ok(panel.includes(`dark: { ink: "${tok(dark, "ink")}", muted: "${tok(dark, "muted")}" }`));
  assert.ok(panel.includes(`var BG_DEF = { light: "${tok(light, "ground")}", dark: "${tok(dark, "ground")}" }`));
});

test("pages load the panel only with ?design=1", () => {
  for (const f of ["index.html", "learn/index.html", "learn/glossary/index.html", "signup/index.html"]) {
    const html = read(f);
    assert.match(html, /design = sessionStorage\.getItem\("ca-design"\) === "1"/, f);
    assert.doesNotMatch(html, /<script src="[^"]*design-panels\.js/, f + " must not load the panel unconditionally");
  }
});

test("the simulator is private: noindex, gated on ?design=1, and linked from nowhere", () => {
  assert.match(sim, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(sim, /if \(!design\) \{ document\.getElementById\("sim-locked"\)\.hidden = false; return; \}/);
  assert.match(sim, /\[hidden\] \{ display: none !important; \}/);
  let links = "";
  try {
    links = execFileSync("git", ["grep", "-l", "-E", "href=[\"'][^\"']*design/simulator", "--", "*.html", "*.js", ":!design/simulator/*", ":!tests/*"], { encoding: "utf8" }).trim();
  } catch (e) { if (e.status !== 1) throw e; }
  assert.equal(links, "");
});

test("the simulator's frames, pages and note", () => {
  for (const s of ['w: 390, h: 844', 'w: 820, h: 1180', 'w: 1440, h: 900']) assert.ok(sim.includes(s), s);
  for (const p of ['value="">Homepage', 'value="#pricing">Pricing', 'value="learn/">Learn', 'value="learn/glossary/">Glossary', 'value="signup/">Sign up']) assert.ok(sim.includes(p), p);
  assert.ok(sim.includes("Approximates screen sizes; check real devices before going live."));
  assert.ok(sim.includes('"?design=1&sim=1&t=" + Date.now()'));
});
