/*
 * POST /api/billing/sync: re-reads the user's plan from Stripe now. The
 * account page calls it when Checkout or the portal sends the user back,
 * so the new plan shows even if the webhook hasn't arrived yet.
 */
import { currentUser } from "../_lib/auth.js";
import { recompute } from "../_lib/billing.js";
import { json, error, sameOrigin } from "../_lib/http.js";
import { effectiveTier } from "../_lib/plans.js";

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!user.stripeCustomerId) return json({ tier: user.tier });
  const billing = await recompute(user.stripeCustomerId);
  return json({ tier: effectiveTier(billing) });
}
