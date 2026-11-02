/*
 * The Enterprise dashboard's bespoke reports.
 *
 * GET  /api/billing/orders/  ->  { tier, allowance, orders }
 *   allowance: this billing month's reports, { limit, used, left,
 *   monthStart, resetsAt, periodEnd, renews }, or null without a live
 *   Enterprise subscription. orders: every report order, newest first
 *   (billing.js).
 *
 * POST /api/billing/orders/  { reportFor, notes }  ->  { order, allowance }
 *   Requests a bespoke report: uses one of the month's reports. Enterprise
 *   only, checked against Stripe; 409 when none are left this month.
 */
import { currentUser } from "../_lib/auth.js";
import { reportOrders, enterpriseAllowance, requestReport } from "../_lib/billing.js";
import { json, error, sameOrigin } from "../_lib/http.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!user.stripeCustomerId) return json({ tier: user.tier, allowance: null, orders: [] });
  const [orders, allowance] = await Promise.all([reportOrders(user.stripeCustomerId), enterpriseAllowance(user.stripeCustomerId)]);
  return json({ tier: user.tier, allowance, orders });
}

// One line of plain text: no control characters, spaces squeezed.
function text(v, max) {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (user.tier !== "enterprise" || !user.stripeCustomerId) return error(403, "not_enterprise", "Bespoke reports are part of Enterprise.");

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const reportFor = text(body.reportFor, 100);
  const notes = text(body.notes, 500);
  if (reportFor.length < 2) return error(400, "bad_request", "Name the token or project the report is for.");
  try {
    const order = await requestReport(user.stripeCustomerId, { reportFor, notes });
    return json({ order, allowance: await enterpriseAllowance(user.stripeCustomerId) });
  } catch (e) {
    if (e && e.status && e.code) return error(e.status, e.code, e.message);
    throw e;
  }
}
