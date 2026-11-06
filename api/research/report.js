/*
 * GET /api/research/report?slug=btc: one report, at this user's plan, as
 * JSON (the Enterprise "Full research data" download). Free: Bitcoin and
 * Ethereum only; any other slug is 403 "locked", whether it exists or not.
 * degraded: true means the API served less than the plan includes (the
 * entitlement secret is missing or doesn't match Fly's).
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { apiTier } from "../_lib/plans.js";
import { research, SLUG } from "../_lib/research.js";
import { canRead } from "../_lib/reports.js";

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!SLUG.test(slug)) return error(400, "bad_slug", "Unknown report.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  // Free: Bitcoin and Ethereum only, the same answer whether the token
  // exists or not (as api/dashboard/asset.js), so nothing can be probed.
  if (!canRead(slug, user.tier)) return error(403, "locked", "This report is part of Pro.");

  const r = await research("/api/tokens/" + slug, user.tier);
  if (r.status === 404) return error(404, "not_found", "We don't cover that token yet.");
  if (r.status !== 200 || !r.body) return error(502, "research_unavailable", "Research is unavailable right now. Try again shortly.");

  const a = r.body;
  const t = a._tier || {};
  const served = t.requested || "free";
  // Internal bookkeeping, not research: never sent on.
  if (a.web_meta) delete a.web_meta.execution_topology;
  delete a._tier;
  return json({
    tier: user.tier,
    locked: !!t.filtered && served === "free",
    degraded: served !== apiTier(user.tier) && !!t.filtered,
    report: a
  });
}
