/*
 * GET /api/me: the signed-in user and their plan, as the server sees it.
 *   200 { user {name, email}, tier, billing {plan, status, interval,
 *   periodEnd, cancelAtPeriodEnd, customer}, paidPlans }   401 when signed out
 *   (header x-clerk-auth-reason says why)
 */
import { currentUser, requestState } from "./_lib/auth.js";
import { json, error, paidPlansEnabled } from "./_lib/http.js";
import { subscription } from "./_lib/plans.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) {
    // Clerk's reason code (e.g. "token-invalid", never the token) on the
    // 401, so a rejected session can be traced from the Network tab.
    const res = error(401, "signed_out", "Log in to continue.");
    const state = await requestState(request);
    if (state.reason) res.headers.set("x-clerk-auth-reason", state.reason);
    return res;
  }
  const s = subscription(user.billing);
  return json({
    user: { name: user.name, email: user.email },
    tier: user.tier,
    billing: {
      plan: s.plan,
      status: s.status,
      interval: s.interval,
      periodEnd: s.periodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      customer: !!user.stripeCustomerId
    },
    paidPlans: paidPlansEnabled()
  });
}
