/*
 * Who gets which plan. Pure functions only (no network), so the tier rules
 * can be tested on their own: node --test tests/
 *
 * The plan state lives on the Clerk user, in publicMetadata.billing, written
 * ONLY by the server (api/_lib/billing.js, from Stripe). It is never trusted
 * from the browser. A member has at most one subscription, Pro or
 * Enterprise (a plan change in the portal changes its price):
 *
 *   billing: {
 *     plan               "pro" | "enterprise" | null
 *     status             Stripe subscription status, or null
 *     interval           "month" | "year" | null
 *     periodStart        ISO date the paid period started
 *     periodEnd          ISO date the paid period ends
 *     cancelAtPeriodEnd  true when cancelled but still paid up
 *     updatedAt          ISO date of the last recompute
 *   }
 *
 * Records written before Enterprise became a subscription (proStatus,
 * proInterval, proPeriodEnd, proCancelAtPeriodEnd) still read as Pro until
 * the next recompute replaces them.
 */

export const TIERS = ["free", "pro", "enterprise"];

// Subscription statuses that still give the plan. past_due: Stripe is
// retrying a failed renewal; access continues until Stripe gives up and
// cancels.
const LIVE_STATUSES = ["active", "trialing", "past_due"];

// A missed webhook must not cut a paying member off the moment the period
// ends: the next event (or the account page's sync) corrects it.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

// Enterprise's bespoke reports: this many each billing month, monthly and
// yearly plans alike. Unused ones don't carry over.
export const REPORTS_PER_MONTH = 3;

// The subscription in a billing record, in the current shape.
export function subscription(billing) {
  const b = billing || {};
  if (b.plan !== undefined || b.status !== undefined) {
    return {
      plan: b.plan || null, status: b.status || null, interval: b.interval || null,
      periodStart: b.periodStart || null, periodEnd: b.periodEnd || null, cancelAtPeriodEnd: !!b.cancelAtPeriodEnd
    };
  }
  return {
    plan: b.proStatus ? "pro" : null, status: b.proStatus || null, interval: b.proInterval || null,
    periodStart: null, periodEnd: b.proPeriodEnd || null, cancelAtPeriodEnd: !!b.proCancelAtPeriodEnd
  };
}

export function isLive(status) {
  return LIVE_STATUSES.includes(status);
}

export function effectiveTier(billing, now = Date.now()) {
  const s = subscription(billing);
  if ((s.plan === "pro" || s.plan === "enterprise") && isLive(s.status) && s.periodEnd && Date.parse(s.periodEnd) + GRACE_MS > now) return s.plan;
  return "free";
}

export function hasTier(tier, need) {
  return TIERS.indexOf(tier) >= TIERS.indexOf(need || "free");
}

// The research API's tier names: Enterprise reads the "institutional" view.
export function apiTier(tier) {
  return tier === "enterprise" ? "institutional" : tier === "pro" ? "pro" : "free";
}

// A Stripe price's plan, from its lookup key (pro_monthly, enterprise_yearly).
export function planOfPrice(price) {
  const key = (price && price.lookup_key) || "";
  const tagged = price && price.metadata && price.metadata.ca_plan;
  if (/^enterprise_/.test(key) || tagged === "enterprise") return "enterprise";
  if (/^pro_/.test(key) || tagged === "pro") return "pro";
  return null;
}

// Calendar months in UTC; the 31st plus a month is the last day of the
// shorter month, never the start of the one after.
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1,
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, last));
  return out;
}

/*
 * The billing month that holds `now`, inside a paid period: monthly steps
 * from the period's start (so a yearly plan has twelve), the last one ending
 * with the period. After the period ends (a late webhook) it stays on the
 * last month.
 *   returns { start: Date, end: Date }
 */
export function billingMonth(periodStart, periodEnd, now = Date.now()) {
  const end = new Date(periodEnd).getTime();
  const at = Math.min(now, end - 1);
  let k = 0;
  while (k < 24 && addMonths(periodStart, k + 1).getTime() <= at) k++;
  return { start: addMonths(periodStart, k), end: new Date(Math.min(addMonths(periodStart, k + 1).getTime(), end)) };
}

/*
 * This month's bespoke-report allowance.
 *   requests: [{ at (ms) }]   the member's requests, any order (cancelled
 *                             ones already left out)
 *   returns { limit, used, left, monthStart, resetsAt (ISO) }
 */
export function allowance(requests, month, limit = REPORTS_PER_MONTH) {
  const from = month.start.getTime(), to = month.end.getTime();
  const used = requests.filter((r) => r.at >= from && r.at < to).length;
  return { limit, used, left: Math.max(0, limit - used), monthStart: month.start.toISOString(), resetsAt: month.end.toISOString() };
}

/*
 * A member's own order of the asset list (Pro and Enterprise).
 *   cleanOrder(input, slugs)  the order to save: the covered tokens the
 *       input names, in its order, without repeats; null when the input
 *       isn't a list of token slugs
 *   applyOrder(saved, slugs)  the order to show now: the saved tokens still
 *       covered, then any covered since, in the coverage order
 */
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_ORDER = 500;
export function cleanOrder(input, slugs) {
  if (!Array.isArray(input) || input.length > MAX_ORDER || !input.every((s) => typeof s === "string" && SLUG.test(s))) return null;
  const covered = new Set(slugs), seen = new Set();
  return input.filter((s) => covered.has(s) && !seen.has(s) && seen.add(s));
}
export function applyOrder(saved, slugs) {
  if (!Array.isArray(saved) || !saved.length) return null;
  const kept = cleanOrder(saved.filter((s) => typeof s === "string" && SLUG.test(s)), slugs) || [];
  const have = new Set(kept);
  return kept.concat(slugs.filter((s) => !have.has(s)));
}
