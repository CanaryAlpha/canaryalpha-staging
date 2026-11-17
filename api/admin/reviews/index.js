/*
 * GET /api/admin/reviews/: every review, for /admin/reviews/.
 * Admins only, checked here on the server on every call:
 *   401 signed out; 404 for anyone who isn't an admin (the page isn't
 *   advertised); 403 { error: "needs_2fa" } for an admin whose account
 *   doesn't have two-step verification on.
 *   200 { pending, items: [adminItem], deletions: [{ at, by, byId, userId,
 *         rating, status, createdAt, reason, reasonLabel }],
 *         published: { count, average, breakdown } }
 * No email addresses, and the deletion log never holds the deleted text.
 * Email alerts aren't set up on this site, so the pending count is shown
 * at the top of the page instead.
 */
import { currentUser } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";
import { scanUsers, adminList } from "../../_lib/reviews.js";
import { refuseAdmin } from "../../_lib/admin.js";

export async function GET(request) {
  const user = await currentUser(request);
  const no = refuseAdmin(user);
  if (no) return no;
  const { entries, deletions } = await scanUsers();
  return json(adminList(entries, deletions), 200, { "cache-control": "no-store" });
}
