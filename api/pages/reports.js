/*
 * GET /reports/ (rewritten here by vercel.json): the reports this member's
 * plan includes, newest first (item 407). Free: Bitcoin and Ethereum, and
 * every other report as a locked "Token hidden" row, no name. Logged out:
 * a redirect to /login/ with no report content.
 */
import { currentUser } from "../_lib/auth.js";
import { paidPlansEnabled } from "../_lib/http.js";
import { catalogue } from "../_lib/reports.js";
import { indexPage, messagePage } from "../_lib/report-html.js";
import { htmlResponse, toLogin } from "../_lib/pages.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return toLogin(request);
  let list;
  try {
    list = await catalogue(user.tier);
  } catch (e) {
    console.log("reports: catalogue failed:", (e && e.message) || e);
    return htmlResponse(502, messagePage({ title: "Reports are unavailable", text: "Our research is unavailable right now. Please try again in a few minutes." }));
  }
  return htmlResponse(200, indexPage({ items: list.items, hidden: list.hidden, tier: user.tier, paidPlans: paidPlansEnabled() }));
}
