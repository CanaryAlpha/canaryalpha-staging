/*
 * GET /api/research/reports: the tokens this user's plan includes, each
 * with open: true, plus hidden: the number of other researched tokens. A
 * Free user never receives the other tokens' names or scores.
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { hasTier } from "../_lib/plans.js";
import { research, freeSlugs } from "../_lib/research.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  const [list, free] = await Promise.all([research("/api/tokens", "free"), freeSlugs()]);
  if (list.status !== 200 || !list.body) return error(502, "research_unavailable", "Research is unavailable right now. Try again shortly.");
  const paid = hasTier(user.tier, "pro");
  const shown = paid ? list.body.tokens : list.body.tokens.filter((t) => free.includes(t.slug));
  const reports = shown.map((t) => ({
    slug: t.slug, symbol: t.symbol, name: t.name, category: t.category,
    rating: t.rating, decision: t.decision, risk: t.risk_tier,
    updated: t.last_updated, thesis: t.one_line_thesis,
    free: free.includes(t.slug),
    open: paid || free.includes(t.slug)
  }));
  return json({ tier: user.tier, reports, hidden: list.body.tokens.length - shown.length });
}
