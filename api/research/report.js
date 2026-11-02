/*
 * GET /api/research/report?slug=btc: one report, at this user's plan. A
 * report the plan doesn't include comes back as the public summary with
 * locked: true. degraded: true means the API served less than the plan
 * includes (the entitlement secret is missing or doesn't match Fly's).
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { apiTier } from "../_lib/plans.js";
import { research, SLUG } from "../_lib/research.js";

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!SLUG.test(slug)) return error(400, "bad_slug", "Unknown report.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");

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
