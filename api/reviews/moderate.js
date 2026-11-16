/*
 * POST /api/reviews/moderate/  { userId, action, version }  (owner only)
 *   action "approve" | "decline" | "hide"; version is the review's
 *   updatedAt as shown in the queue. 409 if the member has edited it
 *   since, so only text the owner has read is ever published.
 *   -> { item } as in the queue
 * Only the review's status changes. Declining or hiding never deletes the
 * member's account, review or any other data.
 */
import { currentUser, clerk } from "../_lib/auth.js";
import { json, error, sameOrigin } from "../_lib/http.js";
import { ACTIONS, canModerate, queueList, forgetList, STATUSES } from "../_lib/reviews.js";

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!user.owner) return error(404, "not_found", "Not found.");
  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const { userId, action, version } = body || {};
  if (typeof userId !== "string" || !/^user_[A-Za-z0-9]+$/.test(userId) || !ACTIONS[action]) {
    return error(400, "bad_request", "That action couldn't be done.");
  }
  let target;
  try { target = await clerk().users.getUser(userId); } catch (e) { target = null; }
  const review = target && target.privateMetadata && target.privateMetadata.review;
  if (!review || !STATUSES.includes(review.status)) return error(404, "no_review", "That review no longer exists.");
  if (review.updatedAt !== version) return error(409, "changed", "The member has changed this review. Reload the queue to see the new version.");
  if (!canModerate(action, review.status)) return error(409, "bad_state", "That can't be done to a review that is " + review.status + ".");
  const next = { ...review, status: ACTIONS[action], moderatedAt: new Date().toISOString() };
  await clerk().users.updateUserMetadata(userId, { privateMetadata: { review: next } });
  forgetList();
  return json({ item: queueList([{ userId, review: next }]).items[0] });
}
