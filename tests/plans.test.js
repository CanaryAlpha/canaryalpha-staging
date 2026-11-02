// The plan rules (api/_lib/plans.js) and the entitlement token
// (api/_lib/research.js). Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { effectiveTier, hasTier, apiTier, addMonths, planOfPrice, billingMonth, allowance, cleanOrder, applyOrder } from "../api/_lib/plans.js";
import { mintToken } from "../api/_lib/research.js";

const NOW = Date.parse("2026-10-30T12:00:00Z");
const day = 24 * 60 * 60 * 1000;

test("no billing is Free", () => {
  assert.equal(effectiveTier(null, NOW), "free");
  assert.equal(effectiveTier({}, NOW), "free");
});

const sub = (plan, status, endInDays) => ({ plan, status, interval: "month", periodStart: new Date(NOW - 5 * day).toISOString(), periodEnd: new Date(NOW + endInDays * day).toISOString() });

test("Pro and Enterprise while the subscription is live and paid up", () => {
  for (const plan of ["pro", "enterprise"]) {
    for (const s of ["active", "trialing", "past_due"]) assert.equal(effectiveTier(sub(plan, s, 10), NOW), plan);
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) assert.equal(effectiveTier(sub(plan, s, 10), NOW), "free");
  }
  assert.equal(effectiveTier(sub(null, "active", 10), NOW), "free");
});

test("a plan has 3 days' grace after the period end, then lapses", () => {
  assert.equal(effectiveTier(sub("enterprise", "active", -2), NOW), "enterprise");
  assert.equal(effectiveTier(sub("enterprise", "active", -4), NOW), "free");
  assert.equal(effectiveTier(sub("pro", "active", -2), NOW), "pro");
  assert.equal(effectiveTier(sub("pro", "active", -4), NOW), "free");
});

test("records from before Enterprise was a subscription", () => {
  const end = new Date(NOW + 10 * day).toISOString();
  assert.equal(effectiveTier({ proStatus: "active", proPeriodEnd: end }, NOW), "pro");
  // The old per-report access no longer counts for anything.
  assert.equal(effectiveTier({ enterpriseUntil: end }, NOW), "free");
  assert.equal(effectiveTier({ proStatus: "active", proPeriodEnd: end, enterpriseUntil: end }, NOW), "pro");
});

test("a price's plan, from its lookup key", () => {
  assert.equal(planOfPrice({ lookup_key: "enterprise_monthly" }), "enterprise");
  assert.equal(planOfPrice({ lookup_key: "enterprise_yearly" }), "enterprise");
  assert.equal(planOfPrice({ lookup_key: "pro_yearly" }), "pro");
  assert.equal(planOfPrice({ lookup_key: null, metadata: { ca_plan: "pro" } }), "pro");
  assert.equal(planOfPrice({ lookup_key: "enterprise_report" }), "enterprise");
  assert.equal(planOfPrice({}), null);
});

test("tier order and the API's names", () => {
  assert.ok(hasTier("enterprise", "pro"));
  assert.ok(hasTier("pro", "free"));
  assert.ok(!hasTier("free", "pro"));
  assert.ok(!hasTier("pro", "enterprise"));
  assert.equal(apiTier("enterprise"), "institutional");
  assert.equal(apiTier("pro"), "pro");
  assert.equal(apiTier("free"), "free");
  assert.equal(apiTier(undefined), "free");
});

test("calendar months, clamped at month end", () => {
  assert.equal(addMonths("2026-01-31T10:00:00Z", 1).toISOString(), "2026-02-28T10:00:00.000Z");
  assert.equal(addMonths("2028-01-31T10:00:00Z", 1).toISOString(), "2028-02-29T10:00:00.000Z");
  assert.equal(addMonths("2026-10-30T12:00:00Z", 1).toISOString(), "2026-11-30T12:00:00.000Z");
  assert.equal(addMonths("2026-12-15T00:00:00Z", 1).toISOString(), "2027-01-15T00:00:00.000Z");
  assert.equal(addMonths("2026-10-30T12:00:00Z", 3).toISOString(), "2027-01-30T12:00:00.000Z");
});

test("billing months: one per month, from the period start", () => {
  // Monthly plan: the period is the month.
  let m = billingMonth("2026-10-15T09:00:00Z", "2026-11-15T09:00:00Z", Date.parse("2026-11-01T00:00:00Z"));
  assert.equal(m.start.toISOString(), "2026-10-15T09:00:00.000Z");
  assert.equal(m.end.toISOString(), "2026-11-15T09:00:00.000Z");
  // Yearly plan: twelve months inside the year.
  m = billingMonth("2026-01-31T00:00:00Z", "2027-01-31T00:00:00Z", Date.parse("2026-03-05T00:00:00Z"));
  assert.equal(m.start.toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(m.end.toISOString(), "2026-03-31T00:00:00.000Z");
  m = billingMonth("2026-01-31T00:00:00Z", "2027-01-31T00:00:00Z", Date.parse("2026-12-31T00:00:00Z"));
  assert.equal(m.start.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.equal(m.end.toISOString(), "2027-01-31T00:00:00.000Z");
  // After the period (a late webhook): stays on the last month.
  m = billingMonth("2026-10-15T09:00:00Z", "2026-11-15T09:00:00Z", Date.parse("2026-11-16T00:00:00Z"));
  assert.equal(m.start.toISOString(), "2026-10-15T09:00:00.000Z");
});

test("3 bespoke reports a month; no carry-over", () => {
  const month = billingMonth("2026-10-15T00:00:00Z", "2027-10-15T00:00:00Z", Date.parse("2026-11-20T00:00:00Z"));
  const at = (iso) => ({ at: Date.parse(iso) });
  let a = allowance([], month);
  assert.deepEqual([a.limit, a.used, a.left], [3, 0, 3]);
  assert.equal(a.resetsAt, "2026-12-15T00:00:00.000Z");
  // Last month's three don't count; this month's do.
  a = allowance([at("2026-10-20T00:00:00Z"), at("2026-10-21T00:00:00Z"), at("2026-10-22T00:00:00Z"), at("2026-11-16T00:00:00Z")], month);
  assert.deepEqual([a.used, a.left], [1, 2]);
  a = allowance([at("2026-11-15T00:00:00Z"), at("2026-11-16T00:00:00Z"), at("2026-11-17T00:00:00Z"), at("2026-11-18T00:00:00Z")], month);
  assert.deepEqual([a.used, a.left], [4, 0]);
});

test("custom order: checked against the covered tokens", () => {
  const slugs = ["btc", "eth", "sol", "dot"];
  assert.deepEqual(cleanOrder(["sol", "btc", "sol", "gone", "eth"], slugs), ["sol", "btc", "eth"]);
  assert.equal(cleanOrder("sol,btc", slugs), null);
  assert.equal(cleanOrder(["SOL"], slugs), null);
  assert.equal(cleanOrder([1, 2], slugs), null);
  assert.equal(cleanOrder(new Array(501).fill("btc"), slugs), null);
  // Shown: saved tokens still covered, then new ones in coverage order.
  assert.deepEqual(applyOrder(["dot", "gone", "btc"], slugs), ["dot", "btc", "eth", "sol"]);
  assert.equal(applyOrder(null, slugs), null);
  assert.equal(applyOrder([], slugs), null);
});

test("entitlement token matches the API's format", () => {
  process.env.ENTITLEMENT_SECRET = "test-secret-not-real";
  const tok = mintToken("pro", NOW);
  const [scheme, payload, sig] = tok.split(".");
  assert.equal(scheme, "v1");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(claims.tier, "pro");
  assert.equal(claims.exp, Math.floor(NOW / 1000) + 300);
  const expected = crypto.createHmac("sha256", "test-secret-not-real").update("v1." + payload).digest("base64url");
  assert.equal(sig, expected);
  delete process.env.ENTITLEMENT_SECRET;
  assert.equal(mintToken("pro", NOW), null);
});
