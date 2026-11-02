/*
 * GET /api/dashboard/asset/?id=btc: one asset's full detail, for a plan
 * that includes it. A token the plan doesn't include gets 403 with no
 * data at all (not even its name).
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { coverage, allowed } from "../_lib/dashboard.js";
import { quotes, assetSummary, assetDetail } from "../_lib/market.js";
import { quiet } from "../_lib/cache.js";
import { SLUG } from "../_lib/research.js";
import { hasTier } from "../_lib/plans.js";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!SLUG.test(id)) return error(400, "bad_id", "Unknown asset.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  const tokens = await quiet(coverage);
  if (!tokens) return error(502, "research_unavailable", "Research is unavailable right now. Try again shortly.");
  const t = allowed(tokens, user.tier).visible.find((x) => x.slug === id);
  if (!t && hasTier(user.tier, "pro")) return error(404, "not_found", "We don't cover that asset.");
  if (!t) {
    // Same answer whether the token exists or not, so a Free user can't
    // probe which tokens we cover.
    return error(403, "locked", "This asset is part of Pro.");
  }
  const q = await quiet(quotes);
  const [summary, detail] = await Promise.all([assetSummary(id, q && q.coins[id], t), assetDetail(id, t.name, t.symbol)]);
  return json({ tier: user.tier, asset: { ...summary, ...detail }, lastUpdated: (q && q.at) || null });
}
