/*
 * Stripe: customers, and the plan state worked out from what Stripe says.
 *
 * There is no database. Stripe is the record of what was paid and of every
 * bespoke-report request; after every webhook (and when the account page
 * asks) recompute() reads the customer's subscription back from Stripe and
 * writes the result to the Clerk user (publicMetadata.billing, see
 * plans.js). Running it twice gives the same answer, so a repeated or
 * out-of-order webhook does no harm.
 *
 * Plans are Stripe subscriptions: Pro and Enterprise, each monthly or
 * yearly. Prices are found by lookup key, so the same code works in the
 * TEST sandbox and, later, in live mode (docs/go-live-runbook.md).
 *
 * Bespoke reports (Enterprise): each request is a $0 invoice on the
 * customer, "Bespoke report: <token> (included in your Enterprise plan)",
 * with the order in its metadata (ca_kind "bespoke_report"). The member
 * sees it in their billing history; the month's count is read back from
 * these invoices. Custom reports bought one at a time before Enterprise
 * became a subscription (Checkout payments, ca_plan "enterprise") still
 * show in the order list; they no longer give access.
 *
 * Environment: STRIPE_SECRET_KEY.
 */
import Stripe from "stripe";
import { clerk } from "./auth.js";
import { planOfPrice, isLive, billingMonth, allowance, REPORTS_PER_MONTH } from "./plans.js";

export const PLANS = {
  pro_monthly: { lookupKey: "pro_monthly", plan: "pro" },
  pro_yearly: { lookupKey: "pro_yearly", plan: "pro" },
  enterprise_monthly: { lookupKey: "enterprise_monthly", plan: "enterprise" },
  enterprise_yearly: { lookupKey: "enterprise_yearly", plan: "enterprise" }
};

let client;
export function stripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function priceFor(plan) {
  const res = await stripe().prices.list({ lookup_keys: [PLANS[plan].lookupKey], active: true, limit: 1 });
  if (!res.data.length) throw new Error("No active Stripe price with lookup key " + PLANS[plan].lookupKey);
  return res.data[0];
}

// The user's Stripe customer, created on first use. Its id is kept on the
// Clerk user (privateMetadata, never sent to the browser) and the Clerk id
// on the customer, so either side can find the other.
export async function ensureCustomer(user) {
  if (user.stripeCustomerId) {
    const c = await stripe().customers.retrieve(user.stripeCustomerId);
    if (!c.deleted) return c.id;
  }
  const c = await stripe().customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: { clerk_user_id: user.id }
  });
  await clerk().users.updateUserMetadata(user.id, { privateMetadata: { stripeCustomerId: c.id } });
  return c.id;
}

const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);

// "Now" for this customer: the real time, or a TEST-mode test clock's time
// when the customer runs on one (so a simulated month counts as a month).
async function customerNow(customer) {
  const clock = customer && customer.test_clock;
  if (!clock) return Date.now();
  const id = typeof clock === "string" ? clock : clock.id;
  const c = await stripe().testHelpers.testClocks.retrieve(id);
  return c.frozen_time * 1000;
}

// The customer's live subscription (newest first), with its plan and
// current period, or null.
export async function liveSubscription(customerId) {
  const subs = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  const sub = subs.data.filter((s) => isLive(s.status)).sort((a, b) => b.created - a.created)[0];
  if (!sub) return null;
  const item = sub.items.data[0];
  return {
    sub, item,
    plan: planOfPrice(item.price),
    interval: item.price.recurring ? item.price.recurring.interval : null,
    periodStart: iso(item.current_period_start || sub.current_period_start),
    periodEnd: iso(item.current_period_end || sub.current_period_end)
  };
}

/*
 * Reads the customer back from Stripe and writes the Clerk user's plan
 * state. Returns the billing object written, or null when the customer
 * isn't linked to a Clerk user.
 */
export async function recompute(customerId) {
  const customer = await stripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  const userId = customer.metadata && customer.metadata.clerk_user_id;
  if (!userId) return null;

  const live = await liveSubscription(customerId);
  const billing = {
    plan: live ? live.plan : null,
    status: live ? live.sub.status : null,
    interval: live ? live.interval : null,
    periodStart: live ? live.periodStart : null,
    periodEnd: live ? live.periodEnd : null,
    cancelAtPeriodEnd: live ? !!(live.sub.cancel_at_period_end || live.sub.cancel_at) : false,
    updatedAt: new Date().toISOString()
  };
  try {
    // The whole billing object is replaced, so fields from the old
    // per-report Enterprise (enterpriseUntil, reports) go with it.
    await clerk().users.updateUserMetadata(userId, { publicMetadata: { billing } });
  } catch (e) {
    // The member deleted their account (api/clerk/webhook.js cancels their
    // subscriptions): nothing to update, and nothing for Stripe to retry.
    if (e && e.status === 404) return null;
    throw e;
  }
  return billing;
}

// The report pipeline's stages, in order (the same keys as
// components/dashboard/report-stages.config.js). The last one means
// delivered.
export const REPORT_STAGES = ["received", "collection", "forensics", "scoring", "writing", "review", "delivered"];
// Business days a report takes at most (2–3), for the first delivery estimate.
const DEFAULT_DAYS = 3;

// Public order number from the Stripe id (the request's invoice, or an
// older report's payment): "CR-" and its last 8 letters.
export const orderNumber = (stripeId) => "CR-" + stripeId.slice(-8).toUpperCase();

function addBusinessDays(ms, n) {
  const d = new Date(ms);
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6) n--; }
  return d.toISOString().slice(0, 10);
}

export const REQUEST_KIND = "bespoke_report";
const unixOf = (inv) => (/^\d+$/.test((inv.metadata || {}).requested_at || "") ? +inv.metadata.requested_at : inv.created);

// The member's bespoke-report requests (their $0 invoices), cancelled ones
// left out, oldest first.
export async function bespokeRequests(customerId) {
  const out = [];
  for await (const inv of stripe().invoices.list({ customer: customerId, limit: 100 })) {
    const m = inv.metadata || {};
    if (m.ca_kind !== REQUEST_KIND || m.report_status === "cancelled") continue;
    out.push(inv);
  }
  return out.sort((a, b) => unixOf(a) - unixOf(b) || (a.id < b.id ? -1 : 1));
}

// Custom reports bought one at a time before Enterprise became a
// subscription: completed Checkout payments, less refunds.
async function legacyPurchases(customerId) {
  const out = [];
  for await (const s of stripe().checkout.sessions.list({
    customer: customerId, status: "complete", limit: 100,
    expand: ["data.payment_intent.latest_charge", "data.line_items"]
  })) {
    if (!s.metadata || s.metadata.ca_plan !== "enterprise" || s.mode !== "payment" || s.payment_status !== "paid") continue;
    const pi = s.payment_intent;
    const charge = pi && pi.latest_charge;
    const qty = (s.line_items && s.line_items.data[0] && s.line_items.data[0].quantity) || 1;
    const refunded = charge ? Math.round(charge.amount_refunded / (s.amount_total / qty)) : 0;
    const field = (s.custom_fields || []).find((f) => f.key === "report_for");
    out.push({
      id: pi.id, at: (charge ? charge.created : s.created) * 1000, meta: pi.metadata || {},
      reportFor: (field && field.text && field.text.value) || "", notes: "", reports: qty, refunded: refunded > 0
    });
  }
  return out;
}

// One order for the dashboard's progress tracker. The report pipeline
// records progress in the order's metadata (tools/report-status.mjs):
//   report_stage    a key from REPORT_STAGES
//   report_history  "stage:unixSeconds,..." (each stage's start)
//   report_eta      "YYYY-MM-DD" (optional; else ordered + 3 business days)
//   report_url      link to the delivered report (optional)
// Older orders that only have report_status "delivered" count as delivered.
function orderView(o) {
  const meta = o.meta;
  let stage = REPORT_STAGES.includes(meta.report_stage) ? meta.report_stage : null;
  if (!stage) stage = meta.report_status === "delivered" ? "delivered" : "received";
  const started = { received: Math.floor(o.at / 1000) };
  for (const part of String(meta.report_history || "").split(",")) {
    const [k, t] = part.split(":");
    if (REPORT_STAGES.includes(k) && /^\d+$/.test(t || "")) started[k] = +t;
  }
  const upTo = REPORT_STAGES.indexOf(stage);
  const history = REPORT_STAGES.slice(0, upTo + 1).map((k, i) => {
    const next = REPORT_STAGES[i + 1];
    const s = started[k] ? new Date(started[k] * 1000).toISOString() : null;
    const done = i < upTo || k === "delivered";
    return { stage: k, startedAt: s, completedAt: done ? (k === "delivered" ? s : (started[next] ? new Date(started[next] * 1000).toISOString() : null)) : null };
  });
  return {
    id: orderNumber(o.id),
    token: { name: o.reportFor || "Custom report", ticker: "" },
    reportFor: o.reportFor,
    notes: o.notes,
    orderedAt: new Date(o.at).toISOString(),
    estimatedDelivery: /^\d{4}-\d{2}-\d{2}$/.test(meta.report_eta || "") ? meta.report_eta : addBusinessDays(o.at, DEFAULT_DAYS),
    status: stage === "delivered" ? "delivered" : "in_progress",
    stage, stageProgress: stage === "delivered" ? 1 : 0,
    history,
    files: stage === "delivered" && /^https:\/\//.test(meta.report_url || "") ? { view: meta.report_url } : null,
    updatedAt: new Date(Math.max(...Object.values(started)) * 1000).toISOString(),
    reports: o.reports,
    refunded: o.refunded
  };
}

// Every report order for the Enterprise dashboard, newest first.
export async function reportOrders(customerId) {
  const [requests, legacy] = await Promise.all([bespokeRequests(customerId), legacyPurchases(customerId)]);
  const fromRequests = requests.map((inv) => ({
    id: inv.id, at: unixOf(inv) * 1000, meta: inv.metadata || {},
    reportFor: inv.metadata.report_for || "", notes: inv.metadata.report_notes || "", reports: 1, refunded: false
  }));
  return fromRequests.concat(legacy).sort((a, b) => b.at - a.at).map(orderView);
}

/*
 * This billing month's bespoke-report allowance for an Enterprise member,
 * or null without a live Enterprise subscription.
 *   { limit, used, left, monthStart, resetsAt, periodEnd, renews }
 * renews is false when the plan is cancelled and this is its last month
 * (the allowance then ends with the plan instead of resetting).
 */
export async function enterpriseAllowance(customerId, known) {
  const [customer, live, requests] = await Promise.all([
    stripe().customers.retrieve(customerId),
    known ? Promise.resolve(known) : liveSubscription(customerId),
    bespokeRequests(customerId)
  ]);
  if (!live || live.plan !== "enterprise" || customer.deleted) return null;
  const now = await customerNow(customer);
  const month = billingMonth(live.periodStart, live.periodEnd, now);
  const a = allowance(requests.map((r) => ({ at: unixOf(r) * 1000 })), month);
  const lastMonth = month.end.getTime() >= Date.parse(live.periodEnd);
  return { ...a, periodEnd: live.periodEnd, renews: !(lastMonth && (live.sub.cancel_at_period_end || live.sub.cancel_at)) };
}

/*
 * A bespoke-report request: uses one of this month's reports and adds an
 * order to the tracker. Throws { status, code, message } when it can't.
 *   { reportFor (2-100 chars), notes (0-500) }  ->  the new order
 */
export async function requestReport(customerId, { reportFor, notes }) {
  const live = await liveSubscription(customerId);
  const before = await enterpriseAllowance(customerId, live);
  if (!before) throw { status: 403, code: "not_enterprise", message: "Bespoke reports are part of Enterprise." };
  if (before.left < 1) throw { status: 409, code: "allowance_used", message: "You've used this month's " + before.limit + " reports." };
  const customer = await stripe().customers.retrieve(customerId);
  const now = await customerNow(customer);
  const metadata = {
    ca_kind: REQUEST_KIND, ca_plan: "enterprise",
    clerk_user_id: (customer.metadata && customer.metadata.clerk_user_id) || "",
    report_for: reportFor, report_notes: notes,
    report_stage: "received", report_status: "in_progress",
    requested_at: String(Math.floor(now / 1000)),
    subscription: live.sub.id
  };
  const inv = await stripe().invoices.create({
    customer: customerId, auto_advance: false, collection_method: "charge_automatically",
    pending_invoice_items_behavior: "exclude", currency: "usd",
    description: "Bespoke report request, included in your Enterprise plan.",
    metadata
  });
  await stripe().invoiceItems.create({
    customer: customerId, invoice: inv.id, amount: 0, currency: "usd",
    description: "Bespoke report: " + reportFor + " (included in your Enterprise plan)"
  });
  await stripe().invoices.finalizeInvoice(inv.id, { auto_advance: false });

  // Two requests at the same moment could both see one report left: the
  // one that came second is cancelled again.
  const month = billingMonth(live.periodStart, live.periodEnd, now);
  const inMonth = (await bespokeRequests(customerId)).filter((r) => {
    const at = unixOf(r) * 1000;
    return at >= month.start.getTime() && at < month.end.getTime();
  });
  if (inMonth.findIndex((r) => r.id === inv.id) >= before.limit) {
    await stripe().invoices.update(inv.id, { metadata: { report_status: "cancelled" } });
    throw { status: 409, code: "allowance_used", message: "You've used this month's " + before.limit + " reports." };
  }
  return orderView({ id: inv.id, at: +metadata.requested_at * 1000, meta: metadata, reportFor, notes, reports: 1, refunded: false });
}

export { REPORTS_PER_MONTH };
