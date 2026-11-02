/*
 * GET /api/dashboard/: the dashboard for this user's plan.
 *   { tier, assets [asset], hidden (count of researched tokens the plan
 *     doesn't include), fearGreed, etfFlows, lastUpdated, attribution,
 *     customOrder }
 * customOrder (Pro and Enterprise): the member's own order of the asset
 * list as slugs, tokens covered since they saved it added at the end; null
 * when they haven't set one (api/dashboard/order.js).
 * Free: Bitcoin and Ethereum only; the rest is a number (dashboard.js).
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { coverage, allowed, ATTRIBUTION } from "../_lib/dashboard.js";
import { quotes, assetSummary, fearGreed, etfFlows } from "../_lib/market.js";
import { quiet } from "../_lib/cache.js";
import { hasTier, applyOrder } from "../_lib/plans.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  const tokens = await quiet(coverage);
  if (!tokens) return error(502, "research_unavailable", "Research is unavailable right now. Try again shortly.");
  const { visible, hidden } = allowed(tokens, user.tier);
  const [q, fg, etf] = await Promise.all([quiet(quotes), quiet(fearGreed), quiet(etfFlows)]);
  const assets = await Promise.all(visible.map((t) => assetSummary(t.slug, q && q.coins[t.slug], t)));
  return json({
    tier: user.tier, assets, hidden,
    fearGreed: fg, etfFlows: etf,
    lastUpdated: (q && q.at) || null,
    attribution: ATTRIBUTION,
    customOrder: hasTier(user.tier, "pro") ? applyOrder(user.assetOrder, visible.map((t) => t.slug)) : null
  });
}
