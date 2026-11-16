/*
 * The signed-in member's own review (any tier).
 *   GET     -> { review: {rating, text, display, name, status, createdAt,
 *               updatedAt} | null, profile: {hasFirstName, hasName} }
 *   POST    { rating, text, display, consent: true } -> { review }
 *           Creates or replaces the member's one review; it is "pending"
 *           until the owner approves it, including after an edit.
 *   DELETE  -> { review: null }   removes it, published or not.
 * Text is cleaned (links and HTML removed) and must be 20-600 characters.
 * Writes are rate limited (api/_lib/reviews.js): 429 when too soon.
 */
import { currentUser, clerk } from "../_lib/auth.js";
import { json, error, sameOrigin } from "../_lib/http.js";
import { validateSubmission, allowWrite, ownView, forgetList } from "../_lib/reviews.js";

function profile(user) {
  return { hasFirstName: !!user.firstName, hasName: !!(user.firstName || user.lastName) };
}

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  return json({ review: ownView(user.review), profile: profile(user) });
}

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  const v = validateSubmission(body, user);
  if (v.error) return error(400, v.error.code, v.error.message);
  const log = allowWrite(user.reviewLog);
  if (!log) return error(429, "too_many", "You've changed your review a lot today. Try again later.");
  const now = new Date().toISOString();
  const prev = user.review;
  const review = { ...v.review, tier: user.tier, createdAt: (prev && prev.createdAt) || now, updatedAt: now,
    status: "pending", moderatedAt: null };
  await clerk().users.updateUserMetadata(user.id, { privateMetadata: { review, reviewLog: log } });
  forgetList();
  return json({ review: ownView(review), profile: profile(user) });
}

export async function DELETE(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  const log = allowWrite(user.reviewLog);
  if (!log) return error(429, "too_many", "Wait a few seconds and try again.");
  await clerk().users.updateUserMetadata(user.id, { privateMetadata: { review: null, reviewLog: log } });
  forgetList();
  return json({ review: null, profile: profile(user) });
}
