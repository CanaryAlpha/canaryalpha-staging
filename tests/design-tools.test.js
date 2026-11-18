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

test("the globe and the panel use the hero's breakpoints: 600px and 1100px", () => {
  assert.match(read("components/dot-globe.js"), /w >= 1100 \? "desktop" : w >= 600 \? "tablet" : "phone"/);
  assert.match(panel, /innerWidth >= 1100 \? "desktop" : innerWidth >= 600 \? "tablet" : "phone"/);
});

test("the panel has Headline, Globe and Background sections, each with Copy settings and Reset", () => {
  for (const s of ['section("headline", "Headline"', 'section("globe", "Globe"', 'section("background", "Background"']) assert.ok(panel.includes(s), s);
  assert.ok(panel.includes('data-act="copy">Copy settings') && panel.includes('data-act="reset">Reset'));
  assert.ok(panel.includes("Copy all settings"));
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
  assert.ok(panel.includes(`light: { ground: "${tok(light, "ground")}" }, dark: { ground: "${tok(dark, "ground")}" }`));
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
