#!/usr/bin/env node
// Fails if any served file mentions localhost or 127.0.0.1, so a link copied
// from a local preview can never reach canaryalpha.co. "Served" means every
// file git tracks, minus what .vercelignore keeps off the site (tools/, tests/,
// docs/, README.md, STAGING.md, CNAME). Binary files (images, fonts) are skipped.
// Run: npm run lint   (also run by npm test and by tools/deploy.sh)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const ignored = existsSync(join(root, ".vercelignore"))
  ? readFileSync(join(root, ".vercelignore"), "utf8").split("\n")
      .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
      .map((l) => l.replace(/^\//, "").replace(/\/$/, ""))
  : [];
const isIgnored = (f) => ignored.some((p) => f === p || f.startsWith(p + "/"));

const PATTERN = /localhost|127\.0\.0\.1/i;
const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0").filter(Boolean).filter((f) => !isIgnored(f));

const hits = [];
for (const f of files) {
  const buf = readFileSync(join(root, f));
  if (buf.includes(0)) continue; // binary
  buf.toString("utf8").split("\n").forEach((line, i) => {
    if (PATTERN.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
  });
}

if (hits.length) {
  console.error("Local addresses (localhost / 127.0.0.1) found in served files:");
  for (const h of hits) console.error("  " + h);
  console.error("Use a relative path (e.g. /holdings/) or https://canaryalpha.co instead.");
  process.exit(1);
}
console.log(`No localhost or 127.0.0.1 in ${files.length} served files.`);
