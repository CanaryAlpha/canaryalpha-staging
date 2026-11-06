/*
 * GET /reports/<slug>/ (rewritten here by vercel.json as ?slug=): one
 * report, rendered at the member's own tier (item 407). Free: Bitcoin and
 * Ethereum in full; any other address is "This report is part of Pro",
 * naming nothing. Pro: every report in full. Enterprise: the API's
 * institutional tier. Logged out: a redirect to /login/, nothing else.
 */
import { currentUser } from "../_lib/auth.js";
import { paidPlansEnabled } from "../_lib/http.js";
import { quiet } from "../_lib/cache.js";
import { research } from "../_lib/research.js";
import { reportFor, canRead, SLUG } from "../_lib/reports.js";
import { reportPage, lockedPage, messagePage } from "../_lib/report-html.js";
import { htmlResponse, toLogin } from "../_lib/pages.js";

export async function GET(request) {
  const slug = (new URL(request.url).searchParams.get("slug") || "").toLowerCase();
  const user = await currentUser(request);
  if (!user) return toLogin(request);
  // Free: Bitcoin and Ethereum only. Any other address gets the same page
  // whether the report exists or not, and the API isn't asked.
  if (!canRead(slug, user.tier)) return htmlResponse(403, lockedPage({ paidPlans: paidPlansEnabled() }));
  if (!SLUG.test(slug)) return htmlResponse(404, messagePage({ title: "Report not found", text: "We couldn't find that report." }));

  let view;
  try {
    view = await reportFor(slug, user.tier);
  } catch (e) {
    console.log("report: fetch failed:", slug, (e && e.message) || e);
    return htmlResponse(502, messagePage({ title: "This report is unavailable", text: "Our research is unavailable right now. Please try again in a few minutes." }));
  }
  if (!view) return htmlResponse(404, messagePage({ title: "Report not found", text: "We don't have a report on that token." }));

  // The download links the API signs for this plan (full reports only).
  const downloads = view.full ? await quiet(async () => {
    const r = await research("/api/documents/" + slug, user.tier);
    return r.status === 200 && r.body ? { documents: r.body.documents || [] } : null;
  }) : null;
  return htmlResponse(200, reportPage({ slug, view, tier: user.tier, paidPlans: paidPlansEnabled(), downloads }));
}
