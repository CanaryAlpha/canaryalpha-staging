/*
 * POST /api/billing/portal  { upgrade?: "enterprise_monthly" |
 *   "enterprise_yearly" }  ->  { url } of the Stripe customer portal
 *
 * Without upgrade: the portal's home, where the member switches monthly and
 * yearly or between Pro and Enterprise, cancels (at the end of the paid
 * period), changes card and downloads invoices. Open even with paid plans
 * switched off, so anyone who has paid can always manage it.
 *
 * With upgrade (a Pro member, paid plans open): straight to the portal's
 * confirmation page for that Enterprise price. The portal charges the
 * prorated difference for the rest of the current period at once and the
 * renewal date stays the same (portal settings in Stripe: proration
 * "always invoice"; a move down, to Pro or from yearly to monthly, waits
 * for the period end).
 */
import { currentUser } from "../_lib/auth.js";
import { stripe, liveSubscription, priceFor } from "../_lib/billing.js";
import { json, error, sameOrigin, siteOrigin, paidPlansEnabled } from "../_lib/http.js";

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!user.stripeCustomerId) return error(404, "no_billing", "There's nothing to manage yet.");

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const returnUrl = siteOrigin(request) + "/account/";
  const params = { customer: user.stripeCustomerId, return_url: returnUrl };

  if (body.upgrade) {
    if (body.upgrade !== "enterprise_monthly" && body.upgrade !== "enterprise_yearly") return error(400, "bad_plan", "Unknown plan.");
    if (!paidPlansEnabled()) return error(403, "paid_plans_closed", "Paid plans aren't open yet.");
    const live = await liveSubscription(user.stripeCustomerId);
    if (!live || live.plan !== "pro") return error(409, "not_pro", "Upgrading to Enterprise starts from a Pro plan.");
    const price = await priceFor(body.upgrade);
    params.flow_data = {
      type: "subscription_update_confirm",
      subscription_update_confirm: { subscription: live.sub.id, items: [{ id: live.item.id, price: price.id, quantity: 1 }] },
      after_completion: { type: "redirect", redirect: { return_url: returnUrl + "?checkout=success" } }
    };
  }
  const session = await stripe().billingPortal.sessions.create(params);
  return json({ url: session.url });
}
