import test from "node:test";
import assert from "node:assert/strict";
import { usdChanges } from "../api/_lib/market.js";
import { allowed } from "../api/_lib/dashboard.js";

test("dollar change agrees with % change", () => {
  const c = usdChanges(110, { d1: 10, d2: -50, bad: null });
  assert.ok(Math.abs(c.d1 - 10) < 1e-9);            // 100 -> 110
  assert.ok(Math.abs(c.d2 - -110) < 1e-9);          // 220 -> 110
  assert.equal(c.bad, null);                        // missing stays missing
});

const tokens = ["btc", "eth", "aave", "dot", "mega"].map((slug) => ({ slug, name: slug.toUpperCase() }));

test("Free sees Bitcoin and Ethereum, and only a count of the rest", () => {
  const r = allowed(tokens, "free");
  assert.deepEqual(r.visible.map((t) => t.slug), ["btc", "eth"]);
  assert.equal(r.hidden, 3);
  assert.ok(!JSON.stringify(r).includes("AAVE"));
});

test("Pro and Enterprise see every researched token", () => {
  for (const tier of ["pro", "enterprise"]) {
    const r = allowed(tokens, tier);
    assert.equal(r.visible.length, 5);
    assert.equal(r.hidden, 0);
  }
});
