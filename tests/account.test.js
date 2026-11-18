// The account page's Log out button and the theme toggle: two bugs that
// came from scripts finding the wrong element (or none) at load.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (f) => fs.readFileSync(f, "utf8");

test("the account page wires its own Log out button, not the header's", () => {
  const js = read("account/account.js");
  // A bare querySelector("[data-logout]") finds the header's hidden button
  // first (the header comes before <main>), leaving the page's button dead.
  assert.doesNotMatch(js, /querySelector\("\[data-logout\]"\)/);
  assert.match(js, /wireLogout\(document\.querySelector\("main \[data-logout\]"\)/);
  assert.match(read("account/index.html"), /data-logout-error/);
});

test("every Log out control uses the one shared log-out (components/auth.js)", () => {
  const files = ["components/site-header.js", "account/account.js"];
  for (const f of files) {
    const js = read(f);
    assert.match(js, /wireLogout\(/, f);
    assert.doesNotMatch(js, /signOut\(\)\.then/, f + " must not sign out on its own");
  }
  // Any other page or script with a Log out button must be listed above.
  const all = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "tests", "tools"].includes(e.name)) continue;
      const p = dir + "/" + e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(e.name) && /data-logout[\s>"]/.test(read(p))) all.push(p.slice(2));
    }
  })(".");
  assert.deepEqual(all.sort(), ["account/index.html", "components/site-header.js"]);
});

test("log out: loading state, an error if it fails, home with replace, no stale page on Back", () => {
  const js = read("components/auth.js");
  assert.match(js, /Logging out\\u2026/);
  assert.match(js, /We couldn't log you out/);
  assert.match(js, /location\.replace\(ROOT\)/);
  assert.match(js, /pageshow[\s\S]*e\.persisted && shownLoggedIn && !hint\(\)[\s\S]*location\.reload\(\)/);
  // A failed Clerk load must not be swallowed (it used to resolve and send
  // the member home still logged in).
  assert.doesNotMatch(js, /Clerk\.signOut\(\); \}, function \(\) \{\}\)/);
});

test("the theme toggle works on headers built after the page script runs", () => {
  const js = read("script.js");
  assert.doesNotMatch(js, /var toggle = document\.querySelector\("\.themes__toggle"\)/);
  assert.match(js, /closest\("\.themes__toggle"\)/);
  assert.match(js, /ca-header-built/);
  assert.match(read("components/site-header.js"), /dispatchEvent\(new Event\("ca-header-built"\)\)/);
});

test("the Clerk profile panel takes the site's colours and is redrawn when the theme changes", () => {
  const js = read("components/members/clerk-forms.js");
  for (const k of ["colorForeground", "colorBackground", "colorInput", "colorMutedForeground", "navbar:", "footer:", "formFieldInput:", "formButtonPrimary:", "menuList:"]) {
    assert.ok(js.includes(k), k);
  }
  assert.match(js, /attributeFilter: \["data-theme"\]/);
  assert.match(js, /unmountUserProfile/);
});
