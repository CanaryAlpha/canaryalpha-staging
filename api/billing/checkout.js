/*
 * POST /api/billing/checkout  { plan: "pro_monthly" | "pro_yearly" |
 *   "enterprise_monthly" | "enterprise_yearly" }  ->  { url } of a Stripe
 *   Checkout page
 *
 * Refused unless PAID_PLANS_ENABLED is "true": that variable is the switch
 * that opens paid plans (docs/go-live-runbook.md). A member has one
 * subscription at a time: with a live one, they change plan in the portal
 * (api/billing/portal.js), never through a second Checkout.
 */
import { currentUser } from "../_lib/auth.js";
import { PLANS, stripe, priceFor, ensureCustomer } from "../_lib/billing.js";
import { json, error, paidPlansEnabled, sameOrigin, siteOrigin } from "../_lib/http.js";
import { subscription, isLive } from "../_lib/plans.js";

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  if (!paidPlansEnabled()) return error(403, "paid_plans_closed", "Paid plans aren't open yet.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const plan = PLANS[body.plan] ? body.plan : null;
  if (!plan) return error(400, "bad_plan", "Unknown plan.");

  if (isLive(subscription(user.billing).status)) {
    return error(409, "already_subscribed", "You already have a plan. Change it from your account page.");
  }

  const customer = await ensureCustomer(user);
  const price = await priceFor(plan);
  const origin = siteOrigin(request);
  const meta = { clerk_user_id: user.id, ca_plan: PLANS[plan].plan };
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    metadata: meta,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: { metadata: meta },
    success_url: origin + "/account/?checkout=success",
    cancel_url: origin + "/account/?checkout=cancelled",
    // Canary Alpha is the seller (Terms of Service), not Stripe: new Stripe
    // accounts turn Managed Payments (Stripe as merchant of record) on by
    // default, so it is turned off here on every checkout.
    managed_payments: { enabled: false }
  });
  return json({ url: session.url });
}
