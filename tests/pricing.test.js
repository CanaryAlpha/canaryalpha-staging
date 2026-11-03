// Prices shown on the site: the "Save N%" badge on each yearly price must be
// the real saving against 12 monthly payments, and the account page and the
// Terms must quote the same prices as the pricing cards. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const num = (s) => Number(s.replace(/[$,]/g, ""));
const fmt = (n) => "$" + n.toLocaleString("en-US");

// Each paid card: <p class="plan__price">$M<…>/month … $Y<…>/year … Save N%</p>
function cards() {
  const html = read("index.html");
  const out = {};
  // One <article class="plan plan--x"> per card; read each on its own.
  for (const block of html.split('<article class="plan plan--').slice(1)) {
    const plan = block.slice(0, block.search(/["\s]/));
    const m = block.match(/<p class="plan__price">(\$[\d,]+)<span class="plan__period">\/month<\/span>[\s\S]*?<span class="plan__yearly"><span>(\$[\d,]+)<span class="plan__period">\/year<\/span><\/span><span class="plan__save">Save (\d+)%<\/span>/);
    if (m && block.indexOf(m[0]) < block.indexOf("</article>")) out[plan] = { monthly: num(m[1]), yearly: num(m[2]), save: Number(m[3]) };
  }
  return out;
}

test("the pricing cards show Pro and Enterprise", () => {
  const c = cards();
  assert.deepEqual(c.pro, { monthly: 30, yearly: 288, save: 20 });
  assert.deepEqual(c.enterprise, { monthly: 1000, yearly: 8400, save: 30 });
});

test("each Save badge is the real yearly saving", () => {
  for (const [plan, c] of Object.entries(cards())) {
    const real = Math.round((1 - c.yearly / (12 * c.monthly)) * 100);
    assert.equal(c.save, real, plan + ": badge says " + c.save + "%, real saving " + real + "%");
  }
});

test("the account page and the Terms quote the card prices", () => {
  const { enterprise: e, pro: p } = cards();
  const account = read("account/account.js");
  const terms = read("terms/index.html");
  assert.ok(account.includes(fmt(e.monthly) + " a month, or " + fmt(e.yearly) + " a year (save " + e.save + "%)"), "account.js Enterprise text");
  assert.equal(account.split("Enterprise monthly, " + fmt(e.monthly) + "<").length - 1, 2, "account.js monthly buttons");
  assert.equal(account.split("Enterprise yearly, " + fmt(e.yearly) + "<").length - 1, 2, "account.js yearly buttons");
  assert.ok(account.includes(fmt(p.monthly) + " a month, or " + fmt(p.yearly) + " a year (save " + p.save + "%)"), "account.js Pro text");
  assert.ok(terms.includes("<strong>Enterprise:</strong> " + fmt(e.monthly) + " per month or " + fmt(e.yearly) + " per year"), "Terms Enterprise");
  assert.ok(terms.includes("<strong>Pro:</strong> " + fmt(p.monthly) + " per month or " + fmt(p.yearly) + " per year"), "Terms Pro");
});
