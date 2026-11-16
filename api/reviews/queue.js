/*
 * GET /api/reviews/queue/: every review, for the owner's review queue
 * (/reviews/queue/). Owner only, checked here on the server: 401 when
 * signed out, 404 for anyone else (the queue isn't advertised).
 *   200 { pending, items: [{ userId, rating, text, display, name, tier,
 *         tierLabel, consent, status, createdAt, updatedAt, moderatedAt }] }
 * No email addresses. Email alerts aren't set up on this site, so the
 * pending count shown in the queue is the alert.
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { allReviews, queueList } from "../_lib/reviews.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!user.owner) return error(404, "not_found", "Not found.");
  return json(queueList(await allReviews({ fresh: true })));
}
