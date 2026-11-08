// The menu's logged-in group (components/site-links.js, drawn by
// components/site-header.js): headed "My account", so "Dashboard" isn't
// listed twice, and its account/ link is called Settings everywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const links = () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync("components/site-links.js", "utf8"), { window });
  return window.CA_SITE_LINKS;
};

test("the logged-in group is headed My account, not Dashboard", () => {
  const header = fs.readFileSync("components/site-header.js", "utf8");
  assert.match(header, /"My account" \+ ICONS\.chevron/);
  assert.doesNotMatch(header, /"Dashboard" \+ ICONS\.chevron/);
});

test("the group lists Dashboard, Reports and Settings, in that order", () => {
  // Array.from: the file ran in its own context, whose arrays deepEqual
  // would never match ours.
  const items = Array.from(links().dashboards).filter((d) => !d.tier);
  assert.deepEqual(items.map((d) => d.label), ["Dashboard", "Reports", "Settings"]);
  assert.deepEqual(items.map((d) => d.href), ["dashboard/", "reports/", "account/"]);
});

test("the account/ page is called Settings", () => {
  const page = fs.readFileSync("account/index.html", "utf8");
  assert.match(page, /<title>Settings — Canary Alpha Research<\/title>/);
  assert.match(page, /<h1 class="members__title">Settings<\/h1>/);
  assert.match(fs.readFileSync("components/site-header.js", "utf8"), /account\/">Settings<\/a>/);
});
