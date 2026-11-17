/*
 * POST /api/admin/reviews/action/  (admins only, with two-step verification
 * when ADMIN_REQUIRE_2FA is "true"; the same checks as GET
 * /api/admin/reviews/, made again here)
 *   { userId, version, action, ... }
 *   version is the review's updatedAt as the admin was shown it: 409 if the
 *   member has changed it since, so nothing is done to text the admin
 *   hasn't read.
 *   action:
 *     "approve" | "decline" | "hide" | "restore"   change the status
 *     "reply"   { text }   add or edit the public reply (2-1000 characters,
 *                          links and HTML removed)
 *     "unreply"            remove the reply
 *     "delete"  { reason } remove the review for good; reason is one of
 *                          DELETE_REASONS. Logged on the admin: who, when,
 *                          why, whose review and its rating, never its text.
 *   -> { item } (the review as the admin page shows it), or { deleted: true }
 * Declining or hiding never deletes the member's account or review.
 */
import { currentUser, clerk } from "../../_lib/auth.js";
import { json, error, sameOrigin } from "../../_lib/http.js";
import { ACTIONS, canModerate, adminItem, validateReply, DELETE_REASONS, STATUSES, forgetList } from "../../_lib/reviews.js";
import { refuseAdmin } from "../../_lib/admin.js";

const OTHER = ["reply", "unreply", "delete"];
const LOG_MAX = 500;

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  const no = refuseAdmin(user);
  if (no) return no;
  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const { userId, action, version } = body || {};
  if (typeof userId !== "string" || !/^user_[A-Za-z0-9]+$/.test(userId) || !(ACTIONS[action] || OTHER.includes(action))) {
    return error(400, "bad_request", "That action couldn't be done.");
  }
  let target;
  try { target = await clerk().users.getUser(userId); } catch (e) { target = null; }
  const review = target && target.privateMetadata && target.privateMetadata.review;
  if (!review || !STATUSES.includes(review.status)) return error(404, "no_review", "That review no longer exists.");
  if (review.updatedAt !== version) return error(409, "changed", "The member has changed this review. Reload the page to see the new version.");
  const now = new Date().toISOString();

  if (action === "delete") {
    if (!DELETE_REASONS[body.reason]) return error(400, "no_reason", "Choose a reason for deleting this review.");
    await clerk().users.updateUserMetadata(userId, { privateMetadata: { review: null } });
    const me = await clerk().users.getUser(user.id);
    const log = Array.isArray(me.privateMetadata && me.privateMetadata.reviewDeletions) ? me.privateMetadata.reviewDeletions : [];
    const entry = { at: now, userId, rating: review.rating, status: review.status, createdAt: review.createdAt,
      reason: body.reason, reasonLabel: DELETE_REASONS[body.reason] };
    await clerk().users.updateUserMetadata(user.id, { privateMetadata: { reviewDeletions: log.concat(entry).slice(-LOG_MAX) } });
    forgetList();
    console.log("reviews: deleted", userId, "by", user.id, body.reason);
    return json({ deleted: true });
  }

  let next;
  if (action === "reply") {
    const v = validateReply(body.text);
    if (v.error) return error(400, v.error.code, v.error.message);
    const prev = review.reply && review.reply.text ? review.reply : null;
    next = { ...review, reply: { text: v.text, createdAt: prev ? prev.createdAt : now, updatedAt: now, forVersion: review.updatedAt } };
  } else if (action === "unreply") {
    if (!review.reply) return error(409, "no_reply", "This review has no reply.");
    // Clerk merges metadata, so the reply is removed by writing null.
    next = { ...review, reply: null };
  } else {
    if (!canModerate(action, review.status)) return error(409, "bad_state", "That can't be done to a review that is " + review.status + ".");
    next = { ...review, status: ACTIONS[action], moderatedAt: now };
  }
  await clerk().users.updateUserMetadata(userId, { privateMetadata: { review: next } });
  forgetList();
  if (next.reply === null) delete next.reply;
  return json({ item: adminItem(userId, next) });
}
